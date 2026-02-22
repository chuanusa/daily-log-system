// ============================================
// 綜合施工處 每日工程日誌系統 v2.3
// 修正日期：2025-01-18
// 12項需求全面修正版本 + 登入開關功能
// ============================================

/**
 * @OnlyCurrentDoc false
 *
 * OAuth Scopes:
 * @oAuthScopes https://www.googleapis.com/auth/spreadsheets
 * @oAuthScopes https://www.googleapis.com/auth/drive
 * @oAuthScopes https://www.googleapis.com/auth/drive.file
 * @oAuthScopes https://www.googleapis.com/auth/script.external_request
 */

// ============================================
// 🔧 系統開關設定（請在此處設定）
// ============================================
/**
 * REQUIRE_LOGIN 設定說明：
 *
 * true (預設) - 需要登入驗證
 *   - 使用者必須輸入帳號密碼才能使用系統
 *   - 適合需要管控使用者權限的情況
 *   - 帳號資料來自「填表人資料」工作表
 *
 * false - 不需要登入驗證
 *   - 所有人打開網頁即可直接使用
 *   - 適合內部測試或公開填報的情況
 *   - 所有操作都會以 DEFAULT_USER 的身分記錄
 *
 * 使用方式：
 *   將下方 REQUIRE_LOGIN 改為 true 或 false
 *   儲存後重新部署即可生效
 */
const SYSTEM_SETTINGS = {
  // 登入驗證開關
  REQUIRE_LOGIN: true,  // 改為 false 即可關閉登入功能

  // 當不需要登入時的預設使用者資訊
  DEFAULT_USER: {
    email: 'system@default.com',
    name: '系統使用者',
    role: '填表人',
    dept: '綜合施工處'
  }
};

// ============================================
// ⚙️ 配置設定
// ============================================
const CONFIG = {
  SHEET_NAMES: {
    PROJECT_INFO: '工程基本資料',
    DAILY_LOG_DB: '每日日誌資料庫',
    DROPDOWN_OPTIONS: '災害類型資料',
    INSPECTORS: '檢驗員及委外監造資料',
    FILLERS: '填表人資料',
    MODIFICATION_LOG: '修改記錄',
    HISTORY_DATA: '歷史資料',
    CALENDAR: '行事曆'
  },

  PROJECT_COLS: {
    SEQ_NO: 0,
    SHORT_NAME: 1,
    FULL_NAME: 2,
    CONTRACTOR: 3,
    DEPT_MAIN: 4,
    ADDRESS: 5,
    GPS: 6,
    RESPONSIBLE_PERSON: 7,     // H欄：工地負責人
    RESP_PHONE: 8,             // I欄：負責人電話
    SAFETY_OFFICER: 9,         // J欄：職安人員
    SAFETY_PHONE: 10,          // K欄：職安電話
    SITE_DIRECTOR: 11,         // L欄：工地主任（如有）
    DIRECTOR_PHONE: 12,        // M欄：主任電話（如有）
    INSPECTOR_ID: 13,          // N欄：預設檢驗員
    DEFAULT_INSPECTORS: 13,    // 預設檢驗員（與 INSPECTOR_ID 相同）
    PROJECT_STATUS: 14,        // O欄：工程狀態
    REMARK: 15,                // P欄：備註
    SAFETY_LICENSE: 16         // Q欄：職安證照
  },

  DAILY_LOG_COLS: {
    DATE: 0,
    PROJECT_SEQ_NO: 1,
    PROJECT_SHORT_NAME: 2,
    INSPECTORS: 3,
    WORKERS_COUNT: 4,
    WORK_ITEM: 5,
    DISASTER_TYPES: 6,
    COUNTERMEASURES: 7,
    WORK_LOCATION: 8,
    FILLER_NAME: 9,
    SUBMIT_TIME: 10,
    IS_HOLIDAY_WORK: 11
  },

  INSPECTOR_COLS: {
    DEPT: 0,
    NAME: 1,
    TITLE: 2,
    PROFESSION: 3,
    PHONE: 4,
    ID_CODE: 5,
    STATUS: 6
  },

  // 修正1：確認欄位索引正確對應
  FILLER_COLS: {
    DEPT: 0,         // A欄：部門
    NAME: 1,         // B欄：姓名
    ACCOUNT: 2,      // C欄：帳號
    EMAIL: 3,        // D欄：信箱
    ROLE: 4,         // E欄：身分
    PASSWORD: 5,     // F欄：密碼
    MANAGED_PROJECTS: 6,  // G欄：管理工程序號
    SUPERVISOR_EMAIL: 7,  // H欄：主管信箱
    PERMISSIONS: 8,  // I欄：權限設定
    TEMP_PASSWORD: 10    // K欄：臨時密碼
  },

  MODIFICATION_COLS: {
    TIMESTAMP: 0,
    USER_NAME: 1,
    PROJECT_SEQ_NO: 2,
    LOG_DATE: 3,
    ORIGINAL_DATA: 4,
    NEW_DATA: 5,
    REASON: 6,
    TYPE: 7
  },

  HISTORY_COLS: {
    TIMESTAMP: 0,
    PROJECT_SEQ_NO: 1,
    PROJECT_NAME: 2,
    FIELD_NAME: 3,
    OLD_VALUE: 4,
    NEW_VALUE: 5,
    MODIFIED_BY: 6,
    REASON: 7
  },

  CALENDAR_COLS: {
    DATE: 0,
    WEEKDAY: 1,
    IS_HOLIDAY: 2,
    REMARK: 3
  },

  DISASTER_COLS: {
    TYPE: 0,
    DESCRIPTION: 1,
    PRIORITY: 2
  },

  TBMKY_TEMPLATE_ID: '1f9BWARemrDlWj9T5YNMvkVFd88cxiDB4OQerFiqVCEY',
  TBMKY_FOLDER_ID: '18QTmsGd1R5_ub7nWDOYJ9KctRRnCIMnx',

  ROLES: {
    FILLER: '填表人',
    CONTACT: '聯絡員',
    ADMIN: '超級管理員'
  },

  DEFAULT_PASSWORD: '29340505',

  // 權限系統定義
  PERMISSIONS: {
    EDIT_PROJECT: 'edit_project',           // 編輯工程資料
    VIEW_LOG: 'view_log',                   // 查看工作日誌
    ADD_LOG: 'add_log',                     // 新增工作日誌
    EDIT_LOG: 'edit_log',                   // 編輯工作日誌
    DELETE_LOG: 'delete_log',               // 刪除工作日誌
    GENERATE_TBM: 'generate_tbm',           // 生成TBM-KY
    VIEW_SUMMARY: 'view_summary',           // 查看總表
    MANAGE_INSPECTOR: 'manage_inspector',   // 管理檢驗員
    MANAGE_USER: 'manage_user'              // 使用者管理
  },

  // 權限預設值
  DEFAULT_PERMISSIONS: 'view_log,add_log',

  // 權限中文名稱對應
  PERMISSION_NAMES: {
    'edit_project': '編輯工程資料',
    'view_log': '查看工作日誌',
    'add_log': '新增工作日誌',
    'edit_log': '編輯工作日誌',
    'delete_log': '刪除工作日誌',
    'generate_tbm': '生成TBM-KY',
    'view_summary': '查看總表',
    'manage_inspector': '管理檢驗員',
    'manage_user': '使用者管理'
  },

  INSPECTOR_STATUS: {
    ACTIVE: '啟用',
    INACTIVE: '停用'
  }
};

// ============================================
// 初始化與基礎函數
// ============================================
function doPost(e) {
  try {
    let postData = {};
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
      postData = JSON.parse(e.parameter.data);
    }

    const action = postData.action;
    const args = postData.args || [];

    const globalObj = this;

    if (typeof globalObj[action] === 'function') {
      const result = globalObj[action].apply(globalObj, args);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: result
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: '找不到對應的函數: ' + action
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("API is running.").setMimeType(ContentService.MimeType.TEXT);
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initializeSheet(sheet, name);
  }
  return sheet;
}

function initializeSheet(sheet, name) {
  switch (name) {
    case CONFIG.SHEET_NAMES.PROJECT_INFO:
      sheet.appendRow(['序號', '簡稱', '全名', '承攬商', '主要部門', '工作地址', 'GPS座標',
        '工地負責人', '職安人員', '工地主任', '負責人電話', '職安電話', '主任電話',
        '預設檢驗員ID', '工程狀態', '備註']);
      break;
    case CONFIG.SHEET_NAMES.DAILY_LOG_DB:
      sheet.appendRow(['日期', '工程序號', '工程簡稱', '檢驗員ID', '施工人數',
        '主要工作項目', '主要災害類型', '危害對策', '工作地點',
        '填寫人', '提交時間', '假日施工']);
      break;
    case CONFIG.SHEET_NAMES.INSPECTORS:
      sheet.appendRow(['部門', '姓名', '職稱', '專業', '電話', 'ID編號', '狀態']);
      break;
    case CONFIG.SHEET_NAMES.FILLERS:
      sheet.appendRow(['部門', '姓名', '信箱', '角色', '密碼', '管理工程', '主管信箱']);
      break;
    case CONFIG.SHEET_NAMES.MODIFICATION_LOG:
      sheet.appendRow(['時間戳記', '使用者', '工程序號', '日誌日期', '原始資料', '新資料', '原因', '類型']);
      break;
    case CONFIG.SHEET_NAMES.DROPDOWN_OPTIONS:
      sheet.appendRow(['災害類型', '說明', '優先序']);
      break;
    case CONFIG.SHEET_NAMES.CALENDAR:
      sheet.appendRow(['日期(YYYYMMDD)', '星期', '是否假日(2=是)', '備註']);
      break;
  }
}

function getUserEmail() {
  const session = Session.getEffectiveUser().getEmail();
  return session || 'unknown@example.com';
}

function getUserName() {
  const userSession = getCurrentSession();
  if (userSession && userSession.isLoggedIn) {
    return userSession.name;
  }
  return Session.getEffectiveUser().getEmail();
}

function getUserRole() {
  const userSession = getCurrentSession();
  if (userSession && userSession.isLoggedIn) {
    return userSession.role;
  }
  return CONFIG.ROLES.FILLER;
}

function validateUserPermission(email, projectSeqNo) {
  return true;
}

// ============================================
// Google 登入驗證
// ============================================
function authenticateGoogleUser(email) {
  try {
    const fillerSheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const data = fillerSheet.getDataRange().getValues();
    const cols = CONFIG.FILLER_COLS;

    Logger.log('=== Google 登入驗證開始 ===');
    Logger.log('Google 信箱: ' + email);

    // 從第2行開始（第1行是標題）
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // 讀取D欄（信箱）
      const rowEmail = row[cols.EMAIL] ? row[cols.EMAIL].toString().trim() : '';

      // 跳過空行
      if (!rowEmail) continue;

      // 不區分大小寫比對信箱
      if (rowEmail.toLowerCase() === email.trim().toLowerCase()) {
        Logger.log('✓ 找到匹配的信箱，自動登入');

        const rowAccount = row[cols.ACCOUNT] ? row[cols.ACCOUNT].toString().trim() : '';

        // 解析管理工程序號為陣列
        const managedProjectsStr = row[cols.MANAGED_PROJECTS] || '';
        const managedProjectsArray = managedProjectsStr ?
          managedProjectsStr.split(',').map(p => p.trim()).filter(p => p) : [];

        // 取得使用者權限
        const permissions = getUserPermissions(rowEmail);

        const userSession = {
          isLoggedIn: true,
          account: rowAccount || '',
          email: rowEmail,
          name: row[cols.NAME] || '未命名',
          role: row[cols.ROLE] || CONFIG.ROLES.FILLER,
          dept: row[cols.DEPT] || '未分類',
          managedProjects: managedProjectsArray,
          supervisorEmail: row[cols.SUPERVISOR_EMAIL] || '',
          permissions: permissions,
          loginTime: new Date().toISOString()
        };

        PropertiesService.getUserProperties().setProperty('userSession', JSON.stringify(userSession));

        return {
          success: true,
          message: 'Google 登入成功！歡迎 ' + userSession.name,
          user: userSession
        };
      }
    }

    Logger.log('✗ 找不到匹配的信箱');
    return {
      success: false,
      message: '找不到此信箱，請確認您是否使用公司信箱，或請管理員將您加入系統'
    };
  } catch (error) {
    Logger.log('authenticateGoogleUser error: ' + error.toString());
    return {
      success: false,
      message: 'Google 登入失敗：' + error.message
    };
  }
}

// ============================================
// 修正1：登入系統（使用明文密碼）
// ============================================
function authenticateUser(identifier, password) {
  try {
    const fillerSheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const data = fillerSheet.getDataRange().getValues();
    const cols = CONFIG.FILLER_COLS;

    Logger.log('=== 登入驗證開始 ===');
    Logger.log('輸入帳號/信箱: ' + identifier);
    Logger.log('欄位配置 - ACCOUNT索引: ' + cols.ACCOUNT + ', EMAIL索引: ' + cols.EMAIL + ', PASSWORD索引: ' + cols.PASSWORD);

    // 從第2行開始（第1行是標題）
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // 讀取C欄（帳號）和D欄（信箱）
      const rowAccount = row[cols.ACCOUNT] ? row[cols.ACCOUNT].toString().trim() : '';
      const rowEmail = row[cols.EMAIL] ? row[cols.EMAIL].toString().trim() : '';

      // 跳過空行
      if ((!rowAccount && !rowEmail) || (rowAccount === '' && rowEmail === '')) {
        continue;
      }

      Logger.log('第' + (i + 1) + '行 - 帳號: ' + rowAccount + ', 信箱: ' + rowEmail);

      // 不區分大小寫比對帳號或信箱
      const inputLower = identifier.trim().toLowerCase();
      const accountMatch = rowAccount.toLowerCase() === inputLower;
      const emailMatch = rowEmail.toLowerCase() === inputLower;

      if (accountMatch || emailMatch) {
        Logger.log('✓ 找到匹配的帳號或信箱');

        // 讀取F欄（索引5）的密碼
        const storedPassword = row[cols.PASSWORD] ? row[cols.PASSWORD].toString().trim() : '';

        Logger.log('儲存的密碼: ' + storedPassword);
        Logger.log('輸入的密碼: ' + password);

        // 直接比對明文密碼
        if (storedPassword === password) {
          Logger.log('✓ 密碼匹配');
          // 解析管理工程序號為陣列
          const managedProjectsStr = row[cols.MANAGED_PROJECTS] || '';
          const managedProjectsArray = managedProjectsStr ?
            managedProjectsStr.split(',').map(p => p.trim()).filter(p => p) : [];

          // 取得使用者權限
          const permissions = getUserPermissions(rowEmail);

          const userSession = {
            isLoggedIn: true,
            account: rowAccount || '',
            email: rowEmail || '',
            name: row[cols.NAME] || '未命名',
            role: row[cols.ROLE] || CONFIG.ROLES.FILLER,
            dept: row[cols.DEPT] || '未分類',
            managedProjects: managedProjectsArray,
            supervisorEmail: row[cols.SUPERVISOR_EMAIL] || '',
            permissions: permissions,
            loginTime: new Date().toISOString()
          };

          PropertiesService.getUserProperties().setProperty('userSession', JSON.stringify(userSession));

          Logger.log('=== 登入成功 ===');
          Logger.log('使用者角色: ' + userSession.role);
          Logger.log('管理工程數量: ' + managedProjectsArray.length);
          Logger.log('權限數量: ' + permissions.length);
          return {
            success: true,
            message: '登入成功！歡迎 ' + userSession.name,
            user: userSession
          };
        } else {
          return {
            success: false,
            message: '密碼錯誤，請重新輸入'
          };
        }
      }
    }

    Logger.log('✗ 找不到匹配的帳號或信箱');
    return {
      success: false,
      message: '找不到此帳號，請確認帳號或信箱是否正確'
    };
  } catch (error) {
    Logger.log('authenticateUser error: ' + error.toString());
    return {
      success: false,
      message: '登入失敗：' + error.message
    };
  }
}

function getCurrentSession() {
  // 如果系統設定為不需要登入，直接返回預設使用者
  if (!SYSTEM_SETTINGS.REQUIRE_LOGIN) {
    return {
      isLoggedIn: true,
      loginType: 'no-auth',
      email: SYSTEM_SETTINGS.DEFAULT_USER.email,
      name: SYSTEM_SETTINGS.DEFAULT_USER.name,
      role: SYSTEM_SETTINGS.DEFAULT_USER.role,
      dept: SYSTEM_SETTINGS.DEFAULT_USER.dept
    };
  }

  // 需要登入時，檢查登入狀態
  try {
    const sessionStr = PropertiesService.getUserProperties().getProperty('userSession');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      return {
        isLoggedIn: true,
        loginType: 'password',
        account: session.account || '',
        email: session.email,
        name: session.name,
        role: session.role,
        dept: session.dept,
        managedProjects: session.managedProjects || [],
        supervisorEmail: session.supervisorEmail || '',
        permissions: session.permissions || []
      };
    }
  } catch (error) {
    Logger.log('getCurrentSession error: ' + error.toString());
  }

  return {
    isLoggedIn: false,
    loginType: 'none',
    account: '',
    email: '',
    name: '',
    role: CONFIG.ROLES.FILLER,
    dept: ''
  };
}

function logoutUser() {
  try {
    PropertiesService.getUserProperties().deleteProperty('userSession');
    return {
      success: true,
      message: '已成功登出'
    };
  } catch (error) {
    Logger.log('logoutUser error: ' + error.toString());
    return {
      success: false,
      message: '登出失敗：' + error.message
    };
  }
}

/**
 * 變更使用者密碼
 * @param {string} account - 使用者帳號
 * @param {string} oldPassword - 舊密碼
 * @param {string} newPassword - 新密碼
 * @returns {Object} - 結果物件
 */
function changeUserPassword(account, oldPassword, newPassword) {
  try {
    Logger.log('========================================');
    Logger.log('[changeUserPassword] 開始變更密碼');
    Logger.log('[changeUserPassword] 帳號: ' + account);
    Logger.log('========================================');

    const fillerSheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const data = fillerSheet.getDataRange().getValues();
    const cols = CONFIG.FILLER_COLS;

    Logger.log('[changeUserPassword] 資料總行數: ' + data.length);
    Logger.log('[changeUserPassword] ACCOUNT 欄位索引: ' + cols.ACCOUNT);
    Logger.log('[changeUserPassword] PASSWORD 欄位索引: ' + cols.PASSWORD);

    // 確保帳號是字串格式
    const accountStr = String(account).trim();
    Logger.log('[changeUserPassword] 搜尋帳號: "' + accountStr + '"');

    // 檢查必要參數
    if (!accountStr) {
      Logger.log('[changeUserPassword] ✗ 帳號為空');
      return {
        success: false,
        message: '帳號不可為空'
      };
    }

    if (!oldPassword) {
      Logger.log('[changeUserPassword] ✗ 舊密碼為空');
      return {
        success: false,
        message: '請輸入舊密碼'
      };
    }

    if (!newPassword) {
      Logger.log('[changeUserPassword] ✗ 新密碼為空');
      return {
        success: false,
        message: '請輸入新密碼'
      };
    }

    // 找到使用者
    let userFound = false;
    let targetRowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      const rowAccount = data[i][cols.ACCOUNT];

      // 跳過空白列
      if (!rowAccount) {
        continue;
      }

      const rowAccountStr = String(rowAccount).trim();

      // Debug：顯示前 3 筆帳號
      if (i <= 3) {
        Logger.log('[changeUserPassword] 第 ' + i + ' 行帳號: "' + rowAccountStr + '"');
      }

      // 比對帳號（統一轉為字串並去除空白）
      if (rowAccountStr === accountStr) {
        userFound = true;
        targetRowIndex = i;
        Logger.log('[changeUserPassword] ✓ 找到使用者，行號: ' + (i + 1) + '（陣列索引: ' + i + '）');

        const currentPassword = String(data[i][cols.PASSWORD] || '');
        Logger.log('[changeUserPassword] 當前密碼長度: ' + currentPassword.length);
        Logger.log('[changeUserPassword] 輸入舊密碼長度: ' + oldPassword.length);

        // 驗證舊密碼
        if (currentPassword !== oldPassword) {
          Logger.log('[changeUserPassword] ✗ 舊密碼錯誤');
          return {
            success: false,
            message: '舊密碼錯誤'
          };
        }

        Logger.log('[changeUserPassword] ✓ 舊密碼驗證通過');

        // 更新密碼（行號 = 陣列索引 + 1）
        const sheetRow = i + 1;
        const sheetCol = cols.PASSWORD + 1;

        Logger.log('[changeUserPassword] 準備更新密碼');
        Logger.log('[changeUserPassword] 試算表行號: ' + sheetRow);
        Logger.log('[changeUserPassword] 試算表欄號: ' + sheetCol);

        try {
          fillerSheet.getRange(sheetRow, sheetCol).setValue(newPassword);
          Logger.log('[changeUserPassword] ✓ 密碼已寫入試算表');

          // 驗證寫入是否成功
          const verifyData = fillerSheet.getDataRange().getValues();
          const verifyPassword = String(verifyData[i][cols.PASSWORD] || '');

          if (verifyPassword === newPassword) {
            Logger.log('[changeUserPassword] ✓ 驗證成功：密碼已正確更新');
            Logger.log('========================================');
            return {
              success: true,
              message: '密碼已成功變更'
            };
          } else {
            Logger.log('[changeUserPassword] ✗ 驗證失敗：密碼未正確更新');
            Logger.log('[changeUserPassword] 預期密碼長度: ' + newPassword.length);
            Logger.log('[changeUserPassword] 實際密碼長度: ' + verifyPassword.length);
            return {
              success: false,
              message: '密碼更新失敗，請重試'
            };
          }

        } catch (writeError) {
          Logger.log('[changeUserPassword] ✗ 寫入密碼時發生錯誤: ' + writeError.toString());
          return {
            success: false,
            message: '寫入密碼失敗：' + writeError.message
          };
        }
      }
    }

    // 如果沒有找到使用者
    if (!userFound) {
      Logger.log('[changeUserPassword] ✗ 找不到使用者: "' + accountStr + '"');
      Logger.log('[changeUserPassword] 請檢查帳號是否正確');
      Logger.log('========================================');
      return {
        success: false,
        message: '找不到使用者：' + accountStr + '，請確認帳號是否正確'
      };
    }

  } catch (error) {
    Logger.log('[changeUserPassword] ✗ 執行錯誤: ' + error.toString());
    Logger.log('[changeUserPassword] 錯誤堆疊: ' + error.stack);
    Logger.log('========================================');
    return {
      success: false,
      message: '變更密碼失敗：' + error.message
    };
  }
}

// ============================================
// 權限管理系統
// ============================================

/**
 * 取得使用者的權限列表
 * @param {string} email - 使用者信箱
 * @returns {Array<string>} - 權限代碼陣列
 */
function getUserPermissions(email) {
  try {
    const fillerSheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const data = fillerSheet.getDataRange().getValues();
    const cols = CONFIG.FILLER_COLS;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEmail = row[cols.EMAIL] ? row[cols.EMAIL].toString().trim() : '';

      if (rowEmail.toLowerCase() === email.toLowerCase()) {
        const role = row[cols.ROLE] || CONFIG.ROLES.FILLER;

        // 超級管理員擁有所有權限
        if (role === CONFIG.ROLES.ADMIN) {
          return Object.values(CONFIG.PERMISSIONS);
        }

        // 取得權限設定
        const permissionsStr = row[cols.PERMISSIONS] ? row[cols.PERMISSIONS].toString().trim() : '';
        if (permissionsStr) {
          return permissionsStr.split(',').map(p => p.trim()).filter(p => p);
        } else {
          // 如果沒有設定，使用預設權限
          return CONFIG.DEFAULT_PERMISSIONS.split(',').map(p => p.trim());
        }
      }
    }

    // 找不到使用者，返回預設權限
    return CONFIG.DEFAULT_PERMISSIONS.split(',').map(p => p.trim());
  } catch (error) {
    Logger.log('getUserPermissions error: ' + error.toString());
    return [];
  }
}

/**
 * 檢查使用者是否有特定權限
 * @param {string} email - 使用者信箱
 * @param {string} permission - 權限代碼
 * @returns {boolean}
 */
function hasPermission(email, permission) {
  const permissions = getUserPermissions(email);
  return permissions.includes(permission);
}

/**
 * 取得完整的權限資訊（含中文名稱）
 * @param {string} email - 使用者信箱
 * @returns {Object}
 */
function getPermissionInfo(email) {
  const permissions = getUserPermissions(email);
  return {
    permissions: permissions,
    permissionNames: permissions.map(p => CONFIG.PERMISSION_NAMES[p] || p)
  };
}

/**
 * 更新使用者權限
 * @param {string} email - 使用者信箱
 * @param {Array<string>} permissions - 權限代碼陣列
 * @returns {Object}
 */
function updateUserPermissions(email, permissions) {
  try {
    const fillerSheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const data = fillerSheet.getDataRange().getValues();
    const cols = CONFIG.FILLER_COLS;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEmail = row[cols.EMAIL] ? row[cols.EMAIL].toString().trim() : '';

      if (rowEmail.toLowerCase() === email.toLowerCase()) {
        const permissionsStr = permissions.join(',');
        fillerSheet.getRange(i + 1, cols.PERMISSIONS + 1).setValue(permissionsStr);

        return {
          success: true,
          message: '權限更新成功'
        };
      }
    }

    return {
      success: false,
      message: '找不到使用者'
    };
  } catch (error) {
    Logger.log('updateUserPermissions error: ' + error.toString());
    return {
      success: false,
      message: '更新失敗：' + error.message
    };
  }
}

function initializeAllPasswords() {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.FILLER_COLS;

    const defaultPassword = CONFIG.DEFAULT_PASSWORD;

    for (let i = 1; i < data.length; i++) {
      const currentPassword = data[i][cols.PASSWORD];
      if (!currentPassword || currentPassword === '') {
        sheet.getRange(i + 1, cols.PASSWORD + 1).setValue(defaultPassword);
      }
    }

    Logger.log('所有空白密碼已初始化為預設明文密碼: ' + defaultPassword);
    return { success: true, message: '密碼初始化完成，預設密碼：' + defaultPassword };
  } catch (error) {
    Logger.log('initializeAllPasswords error: ' + error.toString());
    return { success: false, message: '初始化失敗：' + error.message };
  }
}

// ============================================
// 修正5：檢驗員管理（優化排序：隊優先，委外監造最後）
// ============================================
function getAllInspectors() {
  const allInspectors = getAllInspectorsWithStatus();
  const activeInspectors = allInspectors.filter(ins => ins.status === CONFIG.INSPECTOR_STATUS.ACTIVE);

  // 修正5：排序邏輯 - 隊優先，委外監造最後
  activeInspectors.sort((a, b) => {
    const aDept = a.dept || '';
    const bDept = b.dept || '';

    const aIsTeam = aDept.includes('隊');
    const bIsTeam = bDept.includes('隊');
    const aIsOutsource = aDept === '委外監造';
    const bIsOutsource = bDept === '委外監造';

    // 1. 隊優先
    if (aIsTeam && !bIsTeam) return -1;
    if (!aIsTeam && bIsTeam) return 1;

    // 2. 委外監造最後
    if (aIsOutsource && !bIsOutsource) return 1;
    if (!aIsOutsource && bIsOutsource) return -1;

    // 3. 其他按中文排序
    return aDept.localeCompare(bDept, 'zh-TW');
  });

  return activeInspectors;
}

function getAllInspectorsWithStatus() {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.INSPECTORS);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.INSPECTOR_COLS;
    const inspectors = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[cols.ID_CODE] && row[cols.ID_CODE].toString().trim() !== '') {
        inspectors.push({
          dept: row[cols.DEPT] || '未分類',
          name: row[cols.NAME] || '',
          title: row[cols.TITLE] || '',
          profession: row[cols.PROFESSION] || '',
          phone: row[cols.PHONE] || '',
          id: row[cols.ID_CODE].toString(),
          status: row[cols.STATUS] || CONFIG.INSPECTOR_STATUS.ACTIVE
        });
      }
    }

    return inspectors;
  } catch (error) {
    Logger.log('getAllInspectorsWithStatus error: ' + error.toString());
    return [];
  }
}

function getDepartmentsList() {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.INSPECTORS);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.INSPECTOR_COLS;
    const deptSet = new Set();

    for (let i = 1; i < data.length; i++) {
      const dept = data[i][cols.DEPT];
      if (dept && dept.toString().trim() !== '') {
        deptSet.add(dept.toString().trim());
      }
    }

    const departments = Array.from(deptSet).sort();
    return departments;
  } catch (error) {
    Logger.log('getDepartmentsList error: ' + error.toString());
    return [];
  }
}

function generateInspectorId() {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.INSPECTORS);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.INSPECTOR_COLS;

    let maxNumber = 0;

    for (let i = 1; i < data.length; i++) {
      const id = data[i][cols.ID_CODE] ? data[i][cols.ID_CODE].toString() : '';
      if (id.startsWith('C')) {
        const numPart = parseInt(id.substring(1));
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    }

    const newNumber = maxNumber + 1;
    return 'C' + String(newNumber).padStart(2, '0');

  } catch (error) {
    Logger.log('generateInspectorId error: ' + error.toString());
    return 'C01';
  }
}

function addInspector(data) {
  const userName = getUserName();

  try {
    if (!data.dept || !data.name || !data.title || !data.profession || !data.reason) {
      return { success: false, message: '缺少必填欄位' };
    }

    const sheet = getSheet(CONFIG.SHEET_NAMES.INSPECTORS);
    const newId = generateInspectorId();
    const cols = CONFIG.INSPECTOR_COLS;

    const row = [];
    row[cols.DEPT] = data.dept;
    row[cols.NAME] = data.name;
    row[cols.TITLE] = data.title;
    row[cols.PROFESSION] = data.profession;
    row[cols.PHONE] = data.phone || '';
    row[cols.ID_CODE] = newId;
    row[cols.STATUS] = CONFIG.INSPECTOR_STATUS.ACTIVE;

    sheet.appendRow(row);

    logModification('檢驗員管理', newId, {}, data, data.reason, '新增檢驗員');

    return {
      success: true,
      message: `檢驗員新增成功！編號：${newId}`
    };

  } catch (error) {
    Logger.log('addInspector error: ' + error.toString());
    return { success: false, message: '新增失敗：' + error.message };
  }
}

function updateInspector(data) {
  const userName = getUserName();

  try {
    if (!data.id || !data.dept || !data.name || !data.title || !data.profession || !data.reason) {
      return { success: false, message: '缺少必填欄位' };
    }

    const sheet = getSheet(CONFIG.SHEET_NAMES.INSPECTORS);
    const sheetData = sheet.getDataRange().getValues();
    const cols = CONFIG.INSPECTOR_COLS;

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][cols.ID_CODE] === data.id) {
        const oldData = {
          dept: sheetData[i][cols.DEPT],
          name: sheetData[i][cols.NAME],
          title: sheetData[i][cols.TITLE],
          profession: sheetData[i][cols.PROFESSION],
          phone: sheetData[i][cols.PHONE]
        };

        sheet.getRange(i + 1, cols.DEPT + 1).setValue(data.dept);
        sheet.getRange(i + 1, cols.NAME + 1).setValue(data.name);
        sheet.getRange(i + 1, cols.TITLE + 1).setValue(data.title);
        sheet.getRange(i + 1, cols.PROFESSION + 1).setValue(data.profession);
        sheet.getRange(i + 1, cols.PHONE + 1).setValue(data.phone || '');

        logModification('檢驗員管理', data.id, oldData, data, data.reason, '修改檢驗員');

        return {
          success: true,
          message: `檢驗員 ${data.id} 資料更新成功`
        };
      }
    }

    return { success: false, message: '找不到該檢驗員' };

  } catch (error) {
    Logger.log('updateInspector error: ' + error.toString());
    return { success: false, message: '更新失敗：' + error.message };
  }
}

function deactivateInspector(data) {
  const userName = getUserName();

  try {
    if (!data.id || !data.reason) {
      return { success: false, message: '缺少必填欄位' };
    }

    const sheet = getSheet(CONFIG.SHEET_NAMES.INSPECTORS);
    const sheetData = sheet.getDataRange().getValues();
    const cols = CONFIG.INSPECTOR_COLS;

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][cols.ID_CODE] === data.id) {
        const oldStatus = sheetData[i][cols.STATUS];

        sheet.getRange(i + 1, cols.STATUS + 1).setValue(CONFIG.INSPECTOR_STATUS.INACTIVE);

        logModification('檢驗員管理', data.id, { status: oldStatus }, { status: CONFIG.INSPECTOR_STATUS.INACTIVE }, data.reason, '停用檢驗員');

        return {
          success: true,
          message: `檢驗員 ${data.id} 已停用`
        };
      }
    }

    return { success: false, message: '找不到該檢驗員' };

  } catch (error) {
    Logger.log('deactivateInspector error: ' + error.toString());
    return { success: false, message: '停用失敗：' + error.message };
  }
}

function activateInspector(data) {
  const userName = getUserName();

  try {
    if (!data.id || !data.reason) {
      return { success: false, message: '缺少必填欄位' };
    }

    const sheet = getSheet(CONFIG.SHEET_NAMES.INSPECTORS);
    const sheetData = sheet.getDataRange().getValues();
    const cols = CONFIG.INSPECTOR_COLS;

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][cols.ID_CODE] === data.id) {
        const oldStatus = sheetData[i][cols.STATUS];

        sheet.getRange(i + 1, cols.STATUS + 1).setValue(CONFIG.INSPECTOR_STATUS.ACTIVE);

        logModification('檢驗員管理', data.id, { status: oldStatus }, { status: CONFIG.INSPECTOR_STATUS.ACTIVE }, data.reason, '啟用檢驗員');

        return {
          success: true,
          message: `檢驗員 ${data.id} 已啟用`
        };
      }
    }

    return { success: false, message: '找不到該檢驗員' };

  } catch (error) {
    Logger.log('activateInspector error: ' + error.toString());
    return { success: false, message: '啟用失敗：' + error.message };
  }
}

function checkInspectorUsage(inspectorId) {
  try {
    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    const relatedProjects = [];
    const recentLogs = [];

    for (let i = 1; i < projectData.length; i++) {
      const inspectorIds = projectData[i][projectCols.INSPECTOR_ID] ?
        projectData[i][projectCols.INSPECTOR_ID].toString().split(',').map(id => id.trim()) : [];

      if (inspectorIds.includes(inspectorId)) {
        relatedProjects.push({
          seqNo: projectData[i][projectCols.SEQ_NO],
          name: projectData[i][projectCols.FULL_NAME]
        });
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (let i = 1; i < logData.length; i++) {
      if (!logData[i][logCols.DATE]) continue;

      const logDate = new Date(logData[i][logCols.DATE]);
      if (logDate < thirtyDaysAgo) continue;

      const inspectorIds = logData[i][logCols.INSPECTORS] ?
        logData[i][logCols.INSPECTORS].toString().split(',').map(id => id.trim()) : [];

      if (inspectorIds.includes(inspectorId)) {
        recentLogs.push({
          date: Utilities.formatDate(logDate, 'GMT+8', 'yyyy-MM-dd'),
          projectSeqNo: logData[i][logCols.PROJECT_SEQ_NO]
        });
      }
    }

    return {
      isUsed: relatedProjects.length > 0 || recentLogs.length > 0,
      projects: relatedProjects,
      logs: recentLogs
    };

  } catch (error) {
    Logger.log('checkInspectorUsage error: ' + error.toString());
    return {
      isUsed: false,
      projects: [],
      logs: []
    };
  }
}

// ============================================
// 工程管理
// ============================================
function getAllProjects() {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.PROJECT_COLS;
    const projects = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[cols.SEQ_NO] && row[cols.SEQ_NO].toString().trim() !== '') {
        const defaultInspectors = row[cols.INSPECTOR_ID] ?
          row[cols.INSPECTOR_ID].toString().split(',').map(id => id.trim()).filter(id => id) : [];

        projects.push({
          seqNo: row[cols.SEQ_NO].toString(),
          shortName: row[cols.SHORT_NAME] || '',
          fullName: row[cols.FULL_NAME] || '',
          contractor: row[cols.CONTRACTOR] || '',
          dept: row[cols.DEPT_MAIN] || '未分類',  // E欄：主辦部門
          address: row[cols.ADDRESS] || '',
          gps: row[cols.GPS] || '',
          resp: row[cols.RESPONSIBLE_PERSON] || '',
          respPhone: row[cols.RESP_PHONE] || '',
          safetyOfficer: row[cols.SAFETY_OFFICER] || '',
          safetyPhone: row[cols.SAFETY_PHONE] || '',
          safetyLicense: row[cols.SAFETY_LICENSE] || '',
          siteDirector: row[cols.SITE_DIRECTOR] || '',
          directorPhone: row[cols.DIRECTOR_PHONE] || '',
          defaultInspectors: defaultInspectors,
          projectStatus: row[cols.PROJECT_STATUS] || '施工中',
          remark: row[cols.REMARK] || ''
        });
      }
    }

    return projects;
  } catch (error) {
    Logger.log('getAllProjects error: ' + error.toString());
    return [];
  }
}

function getActiveProjects() {
  const allProjects = getAllProjects();
  return allProjects.filter(p => p.projectStatus === '施工中');
}

function updateProjectInfo(data) {
  const userName = getUserName();

  try {
    if (!data.projectSeqNo || !data.resp || !data.safetyOfficer || !data.projectStatus || !data.reason) {
      return { success: false, message: '缺少必填欄位' };
    }

    if (data.projectStatus !== '施工中' && (!data.statusRemark || data.statusRemark.trim() === '')) {
      return { success: false, message: '工程狀態非「施工中」時，備註欄為必填' };
    }

    const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const sheetData = sheet.getDataRange().getValues();
    const cols = CONFIG.PROJECT_COLS;

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][cols.SEQ_NO] && sheetData[i][cols.SEQ_NO].toString() === data.projectSeqNo) {
        const oldData = {
          resp: sheetData[i][cols.RESPONSIBLE_PERSON],
          respPhone: sheetData[i][cols.RESP_PHONE],
          safetyOfficer: sheetData[i][cols.SAFETY_OFFICER],
          safetyPhone: sheetData[i][cols.SAFETY_PHONE],
          safetyLicense: sheetData[i][cols.SAFETY_LICENSE],
          projectStatus: sheetData[i][cols.PROJECT_STATUS],
          remark: sheetData[i][cols.REMARK],
          inspectorId: sheetData[i][cols.INSPECTOR_ID]
        };

        sheet.getRange(i + 1, cols.RESPONSIBLE_PERSON + 1).setValue(data.resp);
        sheet.getRange(i + 1, cols.SAFETY_OFFICER + 1).setValue(data.safetyOfficer);
        sheet.getRange(i + 1, cols.PROJECT_STATUS + 1).setValue(data.projectStatus);
        sheet.getRange(i + 1, cols.REMARK + 1).setValue(data.statusRemark || '');

        if (data.respPhone) {
          sheet.getRange(i + 1, cols.RESP_PHONE + 1).setValue(data.respPhone);
        }

        if (data.safetyPhone) {
          sheet.getRange(i + 1, cols.SAFETY_PHONE + 1).setValue(data.safetyPhone);
        }

        if (data.safetyLicense !== undefined) {
          sheet.getRange(i + 1, cols.SAFETY_LICENSE + 1).setValue(data.safetyLicense || '');
        }

        const defaultInspectorsStr = data.defaultInspectors ? data.defaultInspectors.join(',') : '';
        sheet.getRange(i + 1, cols.INSPECTOR_ID + 1).setValue(defaultInspectorsStr);

        logModification('工程設定', data.projectSeqNo, oldData, data, data.reason, '修改工程資料');

        return {
          success: true,
          message: '工程資料更新成功'
        };
      }
    }

    return { success: false, message: '找不到該工程' };

  } catch (error) {
    Logger.log('updateProjectInfo error: ' + error.toString());
    return { success: false, message: '更新失敗：' + error.message };
  }
}

function getLastInspectors(projectSeqNo, logDate) {
  try {
    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    for (let daysBack = 1; daysBack <= 7; daysBack++) {
      const checkDate = new Date(logDate);
      checkDate.setDate(checkDate.getDate() - daysBack);
      const checkDateStr = Utilities.formatDate(checkDate, 'GMT+8', 'yyyy-MM-dd');

      for (let i = logData.length - 1; i >= 1; i--) {
        if (!logData[i][logCols.DATE]) continue;

        const rowDate = Utilities.formatDate(new Date(logData[i][logCols.DATE]), 'GMT+8', 'yyyy-MM-dd');
        const rowSeqNo = logData[i][logCols.PROJECT_SEQ_NO] ? logData[i][logCols.PROJECT_SEQ_NO].toString() : '';

        if (rowDate === checkDateStr && rowSeqNo === projectSeqNo) {
          const inspectorIds = logData[i][logCols.INSPECTORS] ?
            logData[i][logCols.INSPECTORS].toString().split(',').map(id => id.trim()).filter(id => id) : [];

          if (inspectorIds.length > 0) {
            return inspectorIds;
          }
        }
      }
    }

    for (let i = 1; i < projectData.length; i++) {
      if (projectData[i][projectCols.SEQ_NO] && projectData[i][projectCols.SEQ_NO].toString() === projectSeqNo) {
        const defaultInspectors = projectData[i][projectCols.INSPECTOR_ID] ?
          projectData[i][projectCols.INSPECTOR_ID].toString().split(',').map(id => id.trim()).filter(id => id) : [];
        return defaultInspectors;
      }
    }

    return [];

  } catch (error) {
    Logger.log('getLastInspectors error: ' + error.toString());
    return [];
  }
}

// ============================================
// 日誌填報功能
// ============================================
function loadLogSetupData() {
  try {
    const projects = getActiveProjects();
    const disasters = getDisasterTypes();
    const inspectors = getAllInspectors();

    return {
      projects: projects,
      disasters: disasters,
      inspectors: inspectors
    };
  } catch (error) {
    Logger.log('loadLogSetupData error: ' + error.toString());
    return {
      projects: [],
      disasters: [],
      inspectors: []
    };
  }
}

function submitDailyLog(data) {
  const userName = getUserName();

  try {
    if (!data.logDate || !data.projectSeqNo) {
      return { success: false, message: '缺少必要資料' };
    }

    const sheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const cols = CONFIG.DAILY_LOG_COLS;

    if (data.isHolidayNoWork) {
      const row = [];
      row[cols.DATE] = new Date(data.logDate);
      row[cols.PROJECT_SEQ_NO] = data.projectSeqNo;
      row[cols.PROJECT_SHORT_NAME] = data.projectShortName || '';
      row[cols.INSPECTORS] = '';
      row[cols.WORKERS_COUNT] = 0;
      row[cols.WORK_ITEM] = '假日不施工';
      row[cols.DISASTER_TYPES] = '';
      row[cols.COUNTERMEASURES] = '';
      row[cols.WORK_LOCATION] = '';
      row[cols.FILLER_NAME] = userName;
      row[cols.SUBMIT_TIME] = new Date();
      row[cols.IS_HOLIDAY_WORK] = '否';

      sheet.appendRow(row);

      return {
        success: true,
        message: '假日不施工記錄已提交'
      };
    }

    if (!data.inspectorIds || data.inspectorIds.length === 0) {
      return { success: false, message: '請至少選擇一位檢驗員' };
    }

    if (!data.workersCount) {
      return { success: false, message: '請填寫施工人數' };
    }

    if (!data.workItems || data.workItems.length === 0) {
      return { success: false, message: '請至少填寫一組工項資料' };
    }

    const existingData = sheet.getDataRange().getValues();
    const rowsToDelete = [];

    for (let i = 1; i < existingData.length; i++) {
      if (!existingData[i][cols.DATE]) continue;

      const rowDate = Utilities.formatDate(new Date(existingData[i][cols.DATE]), 'GMT+8', 'yyyy-MM-dd');
      const rowSeqNo = existingData[i][cols.PROJECT_SEQ_NO] ? existingData[i][cols.PROJECT_SEQ_NO].toString() : '';

      if (rowDate === data.logDate && rowSeqNo === data.projectSeqNo) {
        rowsToDelete.push(i + 1);
      }
    }

    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }

    const allCustomTypes = [];
    data.workItems.forEach(item => {
      item.disasterTypes.forEach(type => {
        if (type.startsWith('其他:') && !allCustomTypes.includes(type.substring(3))) {
          allCustomTypes.push(type.substring(3));
        }
      });
    });

    allCustomTypes.forEach(customType => {
      saveCustomDisasterType(customType);
    });

    const inspectorIdsStr = data.inspectorIds.join(',');
    const isHolidayWorkStr = data.isHolidayWork ? '是' : '否';

    data.workItems.forEach(item => {
      const row = [];
      row[cols.DATE] = new Date(data.logDate);
      row[cols.PROJECT_SEQ_NO] = data.projectSeqNo;
      row[cols.PROJECT_SHORT_NAME] = data.projectShortName || '';
      row[cols.INSPECTORS] = inspectorIdsStr;
      row[cols.WORKERS_COUNT] = data.workersCount;
      row[cols.WORK_ITEM] = item.workItem;
      row[cols.DISASTER_TYPES] = item.disasterTypes.join(',');
      row[cols.COUNTERMEASURES] = item.countermeasures;
      row[cols.WORK_LOCATION] = item.workLocation;
      row[cols.FILLER_NAME] = userName;
      row[cols.SUBMIT_TIME] = new Date();
      row[cols.IS_HOLIDAY_WORK] = isHolidayWorkStr;

      sheet.appendRow(row);
    });

    return {
      success: true,
      message: '日誌提交成功！'
    };

  } catch (error) {
    Logger.log('submitDailyLog error: ' + error.toString());
    return { success: false, message: '提交失敗：' + error.message };
  }
}

/**
 * 取得工程最近一次填寫的日誌資料
 * @param {string} projectSeqNo - 工程序號
 * @returns {Object} - 結果物件
 */
function getLastLogForProject(projectSeqNo) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.DAILY_LOG_COLS;

    // 找到該工程的所有記錄，排除「假日不施工」
    const projectLogs = [];
    for (let i = 1; i < data.length; i++) {
      const rowSeqNo = data[i][cols.PROJECT_SEQ_NO] ? data[i][cols.PROJECT_SEQ_NO].toString() : '';
      const workItem = data[i][cols.WORK_ITEM] || '';

      if (rowSeqNo === projectSeqNo && workItem !== '假日不施工') {
        projectLogs.push({
          date: data[i][cols.DATE],
          workItem: workItem,
          disasters: data[i][cols.DISASTER_TYPES] ? data[i][cols.DISASTER_TYPES].split(',') : [],
          countermeasures: data[i][cols.COUNTERMEASURES] || '',
          location: data[i][cols.WORK_LOCATION] || ''
        });
      }
    }

    if (projectLogs.length === 0) {
      return {
        success: false,
        message: '此工程尚無歷史填報記錄'
      };
    }

    // 取最新日期
    projectLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestDate = projectLogs[0].date;
    const latestDateStr = Utilities.formatDate(new Date(latestDate), 'GMT+8', 'yyyy-MM-dd');

    // 取該日期的所有工作項目
    const workItems = projectLogs
      .filter(log => Utilities.formatDate(new Date(log.date), 'GMT+8', 'yyyy-MM-dd') === latestDateStr)
      .map(log => ({
        workItem: log.workItem,
        disasters: log.disasters,
        countermeasures: log.countermeasures,
        location: log.location
      }));

    return {
      success: true,
      data: {
        date: latestDateStr,
        workItems: workItems
      }
    };

  } catch (error) {
    Logger.log('getLastLogForProject error: ' + error.toString());
    return {
      success: false,
      message: '讀取失敗：' + error.message
    };
  }
}

/**
 * 取得填表人的未填寫提醒
 * @param {string} managedProjectsStr - 管理工程序號（逗號分隔）
 * @returns {Object} - 提醒資料
 */
function getFillerReminders(managedProjectsStr) {
  try {
    Logger.log('[getFillerReminders] ===== 開始執行 =====');
    Logger.log('[getFillerReminders] 接收到的參數: ' + managedProjectsStr);
    Logger.log('[getFillerReminders] 參數類型: ' + typeof managedProjectsStr);

    // 加強參數驗證
    if (!managedProjectsStr || managedProjectsStr.trim() === '') {
      Logger.log('[getFillerReminders] ERROR: managedProjectsStr is empty');
      return {
        tomorrowDate: '',
        unfilledProjects: [],
        incompleteProjects: []
      };
    }

    // 確保是字串格式並分割
    const managedProjects = String(managedProjectsStr).split(',').map(s => s.trim()).filter(s => s !== '');

    Logger.log('[getFillerReminders] 分割後的工程陣列: [' + managedProjects.join(', ') + ']');
    Logger.log('[getFillerReminders] 工程數量: ' + managedProjects.length);

    if (managedProjects.length === 0) {
      Logger.log('[getFillerReminders] ERROR: no valid projects after split');
      return {
        tomorrowDate: '',
        unfilledProjects: [],
        incompleteProjects: []
      };
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = Utilities.formatDate(tomorrow, 'GMT+8', 'yyyy-MM-dd');

    Logger.log('[getFillerReminders] 明日日期: ' + tomorrowStr);

    // 取得工程資料
    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    Logger.log('[getFillerReminders] 工程基本資料總行數: ' + projectData.length);
    Logger.log('[getFillerReminders] PROJECT_COLS.SEQ_NO 索引: ' + projectCols.SEQ_NO);

    // 取得明日日誌
    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    Logger.log('[getFillerReminders] 每日日誌資料庫總行數: ' + logData.length);
    Logger.log('[getFillerReminders] DAILY_LOG_COLS.DATE 索引: ' + logCols.DATE);
    Logger.log('[getFillerReminders] DAILY_LOG_COLS.PROJECT_SEQ_NO 索引: ' + logCols.PROJECT_SEQ_NO);

    const unfilledProjects = [];
    const incompleteProjects = [];

    Logger.log('[getFillerReminders] ===== 開始檢查 ' + managedProjects.length + ' 個工程 =====');

    managedProjects.forEach((seqNo, index) => {
      Logger.log('[getFillerReminders] ----- 檢查第 ' + (index + 1) + ' 個工程：' + seqNo + ' -----');

      // 找到工程資料
      let projectInfo = null;
      for (let i = 1; i < projectData.length; i++) {
        const rowSeqNo = projectData[i][projectCols.SEQ_NO];
        if (i <= 3) {
          Logger.log('[getFillerReminders] 第 ' + i + ' 行工程序號: "' + rowSeqNo + '" (類型: ' + typeof rowSeqNo + ')');
        }

        if (rowSeqNo && rowSeqNo.toString() === seqNo) {
          projectInfo = {
            seqNo: seqNo,
            fullName: projectData[i][projectCols.FULL_NAME] || '',
            contractor: projectData[i][projectCols.CONTRACTOR] || '',
            respPhone: projectData[i][projectCols.RESP_PHONE] || '',
            safetyPhone: projectData[i][projectCols.SAFETY_PHONE] || '',
            defaultInspectors: projectData[i][projectCols.DEFAULT_INSPECTORS] || '',
            projectStatus: projectData[i][projectCols.PROJECT_STATUS] || ''
          };
          Logger.log('[getFillerReminders] ✓ 找到工程: ' + projectInfo.fullName);
          Logger.log('[getFillerReminders]   承攬商: ' + projectInfo.contractor);
          Logger.log('[getFillerReminders]   工程狀態: ' + projectInfo.projectStatus);
          Logger.log('[getFillerReminders]   負責人電話: ' + projectInfo.respPhone);
          Logger.log('[getFillerReminders]   職安電話: ' + projectInfo.safetyPhone);
          Logger.log('[getFillerReminders]   預設檢驗員: ' + projectInfo.defaultInspectors);
          break;
        }
      }

      if (!projectInfo) {
        Logger.log('[getFillerReminders] ✗ 找不到工程序號 ' + seqNo);
        return;
      }

      // 需求1：只檢查「施工中」的工程
      if (projectInfo.projectStatus !== '施工中') {
        Logger.log('[getFillerReminders] ⊘ 工程 ' + seqNo + ' 狀態為「' + projectInfo.projectStatus + '」，跳過檢查');
        return;
      }

      Logger.log('[getFillerReminders] ✓ 工程 ' + seqNo + ' 狀態為「施工中」，繼續檢查');

      // 檢查工程設定是否完整
      const missingFields = [];
      if (!projectInfo.respPhone) missingFields.push('工地負責人電話');
      if (!projectInfo.safetyPhone) missingFields.push('職安人員電話');
      if (!projectInfo.defaultInspectors) missingFields.push('預設檢驗員');

      if (missingFields.length > 0) {
        incompleteProjects.push({
          seqNo: projectInfo.seqNo,
          fullName: projectInfo.fullName,
          contractor: projectInfo.contractor,
          missingFields: missingFields
        });
      }

      // 檢查是否已填寫明日日誌
      Logger.log('[getFillerReminders] 檢查工程 ' + seqNo + ' 是否有明日日誌...');
      let hasTomorrowLog = false;
      let matchCount = 0;

      for (let i = 1; i < logData.length; i++) {
        if (!logData[i][logCols.DATE]) continue;

        const logDate = Utilities.formatDate(new Date(logData[i][logCols.DATE]), 'GMT+8', 'yyyy-MM-dd');
        const logSeqNo = logData[i][logCols.PROJECT_SEQ_NO] ? logData[i][logCols.PROJECT_SEQ_NO].toString() : '';

        if (i <= 3) {
          Logger.log('[getFillerReminders]   日誌第 ' + i + ' 行: 日期="' + logDate + '", 工程序號="' + logSeqNo + '"');
        }

        if (logDate === tomorrowStr && logSeqNo === seqNo) {
          hasTomorrowLog = true;
          matchCount++;
          Logger.log('[getFillerReminders] ✓ 工程 ' + seqNo + ' 已有明日日誌（第 ' + i + ' 行）');
          break;
        }
      }

      if (!hasTomorrowLog) {
        Logger.log('[getFillerReminders] ✗ 工程 ' + seqNo + ' 未填寫明日日誌');
        unfilledProjects.push({
          seqNo: projectInfo.seqNo,
          fullName: projectInfo.fullName,
          contractor: projectInfo.contractor
        });
      }
    });

    Logger.log('[getFillerReminders] ===== 檢查完成 =====');
    Logger.log('[getFillerReminders] 未填寫工程數: ' + unfilledProjects.length);
    Logger.log('[getFillerReminders] 設定未完整工程數: ' + incompleteProjects.length);

    if (unfilledProjects.length > 0) {
      Logger.log('[getFillerReminders] 未填寫工程列表:');
      unfilledProjects.forEach(proj => {
        Logger.log('[getFillerReminders]   - ' + proj.seqNo + ': ' + proj.fullName);
      });
    }

    if (incompleteProjects.length > 0) {
      Logger.log('[getFillerReminders] 設定未完整工程列表:');
      incompleteProjects.forEach(proj => {
        Logger.log('[getFillerReminders]   - ' + proj.seqNo + ': ' + proj.fullName + ' (缺少: ' + proj.missingFields.join(', ') + ')');
      });
    }

    return {
      tomorrowDate: tomorrowStr,
      unfilledProjects: unfilledProjects,
      incompleteProjects: incompleteProjects
    };

  } catch (error) {
    Logger.log('getFillerReminders error: ' + error.toString());
    return {
      tomorrowDate: '',
      unfilledProjects: [],
      incompleteProjects: []
    };
  }
}

function updateDailySummaryLog(data) {
  const userName = getUserName();

  try {
    if (!data.dateString || !data.projectSeqNo || !data.reason) {
      return { success: false, message: '缺少必要資料' };
    }

    // ==========================================
    // [新增] 1. 先取得工程簡稱
    // ==========================================
    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;
    let projectShortName = '';

    for (let i = 1; i < projectData.length; i++) {
      // 比對工程序號 (轉成字串比對較安全)
      if (projectData[i][projectCols.SEQ_NO] && projectData[i][projectCols.SEQ_NO].toString() === data.projectSeqNo.toString()) {
        projectShortName = projectData[i][projectCols.SHORT_NAME] || '';
        break; // 找到後跳出迴圈
      }
    }
    // ==========================================

    const sheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const sheetData = sheet.getDataRange().getValues();
    const cols = CONFIG.DAILY_LOG_COLS;

    // 刪除舊資料邏輯 (保持不變)
    const rowsToDelete = [];
    for (let i = 1; i < sheetData.length; i++) {
      if (!sheetData[i][cols.DATE]) continue;
      const rowDate = Utilities.formatDate(new Date(sheetData[i][cols.DATE]), 'GMT+8', 'yyyy-MM-dd');
      const rowSeqNo = sheetData[i][cols.PROJECT_SEQ_NO] ? sheetData[i][cols.PROJECT_SEQ_NO].toString() : '';
      if (rowDate === data.dateString && rowSeqNo === data.projectSeqNo) {
        rowsToDelete.push(i + 1);
      }
    }

    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }

    // 寫入新資料 (假日不施工)
    if (data.isHolidayNoWork) {
      const row = [];
      row[cols.DATE] = new Date(data.dateString);
      row[cols.PROJECT_SEQ_NO] = data.projectSeqNo;
      row[cols.PROJECT_SHORT_NAME] = projectShortName; // ✅ [修正] 填入查到的簡稱
      row[cols.INSPECTORS] = '';
      row[cols.WORKERS_COUNT] = 0;
      row[cols.WORK_ITEM] = '假日不施工';
      row[cols.DISASTER_TYPES] = '';
      row[cols.COUNTERMEASURES] = '';
      row[cols.WORK_LOCATION] = '';
      row[cols.FILLER_NAME] = userName;
      row[cols.SUBMIT_TIME] = new Date();
      row[cols.IS_HOLIDAY_WORK] = '否';

      sheet.appendRow(row);
      logModification('日誌修改', data.projectSeqNo, {}, data, data.reason, '修改為假日不施工');

      return {
        success: true,
        message: '日誌已更新為假日不施工'
      };
    }

    // 寫入新資料 (一般施工)
    if (!data.inspectorIds || data.inspectorIds.length === 0 || !data.workersCount || !data.workItems || data.workItems.length === 0) {
      return { success: false, message: '資料不完整' };
    }

    const inspectorIdsStr = data.inspectorIds.join(',');
    const isHolidayWorkStr = data.isHolidayWork ? '是' : '否';

    data.workItems.forEach(item => {
      const row = [];
      row[cols.DATE] = new Date(data.dateString);
      row[cols.PROJECT_SEQ_NO] = data.projectSeqNo;
      row[cols.PROJECT_SHORT_NAME] = projectShortName; // ✅ [修正] 填入查到的簡稱
      row[cols.INSPECTORS] = inspectorIdsStr;
      row[cols.WORKERS_COUNT] = data.workersCount;
      row[cols.WORK_ITEM] = item.workItem;
      row[cols.DISASTER_TYPES] = item.disasterTypes.join(',');
      row[cols.COUNTERMEASURES] = item.countermeasures;
      row[cols.WORK_LOCATION] = item.workLocation;
      row[cols.FILLER_NAME] = userName;
      row[cols.SUBMIT_TIME] = new Date();
      row[cols.IS_HOLIDAY_WORK] = isHolidayWorkStr;

      sheet.appendRow(row);
    });

    logModification('日誌修改', data.projectSeqNo, {}, data, data.reason, '修改日誌');

    return {
      success: true,
      message: '日誌更新成功'
    };
  } catch (error) {
    Logger.log('updateDailySummaryLog error: ' + error.toString());
    return { success: false, message: '更新失敗：' + error.message };
  }
}



function getPreviousDayLog(projectSeqNo, currentDate) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.DAILY_LOG_COLS;

    const current = new Date(currentDate);
    const yesterday = new Date(current);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = Utilities.formatDate(yesterday, 'GMT+8', 'yyyy-MM-dd');

    const logs = [];
    for (let i = 1; i < data.length; i++) {
      if (!data[i][cols.DATE]) continue;

      const rowDate = Utilities.formatDate(new Date(data[i][cols.DATE]), 'GMT+8', 'yyyy-MM-dd');
      const rowSeqNo = data[i][cols.PROJECT_SEQ_NO] ? data[i][cols.PROJECT_SEQ_NO].toString() : '';

      if (rowDate === yesterdayStr && rowSeqNo === projectSeqNo) {
        logs.push(data[i]);
      }
    }

    if (logs.length === 0) return null;

    const firstLog = logs[0];
    const inspectorIds = firstLog[cols.INSPECTORS] ?
      firstLog[cols.INSPECTORS].toString().split(',').map(id => id.trim()).filter(id => id) : [];

    return {
      date: yesterdayStr,
      inspectorIds: inspectorIds,
      workersCount: firstLog[cols.WORKERS_COUNT] || 0
    };

  } catch (error) {
    Logger.log('getPreviousDayLog error: ' + error.toString());
    return null;
  }
}

function getUnfilledCount() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = Utilities.formatDate(tomorrow, 'GMT+8', 'yyyy-MM-dd');

    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    const filledSeqNos = new Set();
    const holidayNoWorkSeqNos = new Set(); // [新增] 記錄假日不施工

    for (let i = 1; i < logData.length; i++) {
      if (!logData[i][logCols.DATE]) continue;

      const logDateStr = Utilities.formatDate(new Date(logData[i][logCols.DATE]), 'GMT+8', 'yyyy-MM-dd');
      if (logDateStr === tomorrowStr) {
        const seqNo = logData[i][logCols.PROJECT_SEQ_NO] ? logData[i][logCols.PROJECT_SEQ_NO].toString() : '';
        const workItem = logData[i][logCols.WORK_ITEM];

        if (seqNo) {
          if (String(workItem).includes('假日不施工')) {
            holidayNoWorkSeqNos.add(seqNo);
          } else {
            filledSeqNos.add(seqNo);
          }
        }
      }
    }

    let totalActive = 0;
    for (let i = 1; i < projectData.length; i++) {
      const status = projectData[i][projectCols.PROJECT_STATUS] || '施工中';
      const seqNo = projectData[i][projectCols.SEQ_NO] ? projectData[i][projectCols.SEQ_NO].toString() : '';

      if (status === '施工中' && !holidayNoWorkSeqNos.has(seqNo)) {
        totalActive++;
      }
    }

    const unfilled = totalActive - filledSeqNos.size;

    return {
      total: totalActive,
      unfilled: Math.max(0, unfilled),
      date: tomorrowStr
    };

  } catch (error) {
    Logger.log('getUnfilledCount error: ' + error.toString());
    return {
      total: 0,
      unfilled: 0,
      date: ''
    };
  }
}

function getFilledDates() {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.DAILY_LOG_COLS;

    const filledDates = [];

    for (let i = 1; i < data.length; i++) {
      if (!data[i][cols.DATE]) continue;

      const dateString = Utilities.formatDate(new Date(data[i][cols.DATE]), 'GMT+8', 'yyyy-MM-dd');
      const projectSeqNo = data[i][cols.PROJECT_SEQ_NO] ? data[i][cols.PROJECT_SEQ_NO].toString() : '';

      if (dateString && projectSeqNo) {
        filledDates.push({
          dateString: dateString,
          projectSeqNo: projectSeqNo
        });
      }
    }

    return filledDates;

  } catch (error) {
    Logger.log('getFilledDates error: ' + error.toString());
    return [];
  }
}

// ============================================
// 修正3&11：總表功能（顯示所有工程+檢驗員格式）
// ============================================
function getDailySummaryReport(dateString, filterStatus, filterDept, filterInspector, isGuestMode, userInfo) {
  try {
    Logger.log('=== getDailySummaryReport 開始 ===');
    Logger.log('日期: ' + dateString);
    Logger.log('狀態篩選: ' + filterStatus);
    Logger.log('部門篩選: ' + filterDept);
    Logger.log('檢驗員篩選: ' + filterInspector);
    Logger.log('訪客模式: ' + isGuestMode);
    if (userInfo) {
      Logger.log('使用者角色: ' + userInfo.role);
    }

    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    const inspectorSheet = getSheet(CONFIG.SHEET_NAMES.INSPECTORS);
    const inspectorData = inspectorSheet.getDataRange().getValues();
    const inspectorCols = CONFIG.INSPECTOR_COLS;

    const summaryData = [];
    Logger.log('工程總數: ' + (projectData.length - 1));

    // ============================================
    // 🚀 效能優化：建立日誌索引 (Hash Map)
    // ============================================
    const logMap = {};

    // 1. 先遍歷一次所有日誌，找出符合「查詢日期」的資料，並按「工程序號」歸類
    for (let j = 1; j < logData.length; j++) {
      const log = logData[j];
      if (!log[logCols.DATE]) continue;

      const logDateStr = Utilities.formatDate(new Date(log[logCols.DATE]), 'GMT+8', 'yyyy-MM-dd');

      // 只處理當天日誌
      if (logDateStr === dateString) {
        const logSeqNo = log[logCols.PROJECT_SEQ_NO] ? log[logCols.PROJECT_SEQ_NO].toString() : '';

        if (logSeqNo) {
          if (!logMap[logSeqNo]) {
            logMap[logSeqNo] = [];
          }
          logMap[logSeqNo].push(log);
        }
      }
    }
    // ============================================

    // 修正3：遍歷所有工程（不只施工中）
    for (let i = 1; i < projectData.length; i++) {
      const proj = projectData[i];
      const seqNo = proj[projectCols.SEQ_NO] ? proj[projectCols.SEQ_NO].toString() : '';

      if (!seqNo) continue;

      const projectStatus = proj[projectCols.PROJECT_STATUS] || '施工中';
      const dept = proj[projectCols.DEPT_MAIN] || '未分類';

      // 修正3：根據篩選條件過濾
      if (filterStatus === 'active' && projectStatus !== '施工中') {
        // Logger.log('跳過非施工中工程: ' + seqNo); // 註解掉以減少 Log 量
        continue;
      }

      if (filterDept && filterDept !== 'all' && dept !== filterDept) {
        // Logger.log('跳過不符部門工程: ' + seqNo + ' (部門: ' + dept + ')'); // 註解掉以減少 Log 量
        continue;
      }

      // 🚀 優化應用：直接從 Map 取得日誌，取代內層迴圈
      const logsForProject = logMap[seqNo] || [];

      // [新增] 檢驗員篩選
      if (filterInspector && filterInspector !== 'all') {
        const logInspectors = logsForProject[0] ? (logsForProject[0][logCols.INSPECTORS] || '') : '';
        // 檢查是否包含該檢驗員ID (精確比對)
        const inspectorList = logInspectors.split(',').map(id => id.trim());
        if (!inspectorList.includes(filterInspector)) {
          continue;
        }
      }

      let inspectorText = '';
      let inspectorIds = [];
      let inspectorDetails = [];

      if (logsForProject.length > 0) {
        const inspectorIdsStr = logsForProject[0][logCols.INSPECTORS] || '';
        inspectorIds = inspectorIdsStr.split(',').map(id => id.trim()).filter(id => id);

        // 修正11：檢驗員顯示格式 + 返回詳細資訊
        const inspectorNames = inspectorIds.map(id => {
          for (let k = 1; k < inspectorData.length; k++) {
            if (inspectorData[k][inspectorCols.ID_CODE] === id) {
              const name = inspectorData[k][inspectorCols.NAME];
              const profession = inspectorData[k][inspectorCols.PROFESSION];
              const dept = inspectorData[k][inspectorCols.DEPT];

              // 儲存詳細資訊供前端使用
              inspectorDetails.push({
                id: id,
                name: name,
                profession: profession,
                dept: dept
              });

              // 修正11：委外監造顯示「姓名(專業)委」
              if (dept === '委外監造') {
                return `${name}(${profession})委`;
              } else {
                return `${name}(${profession})`;
              }
            }
          }
          return id;
        });

        inspectorText = inspectorNames.join('、');
      }

      const rowData = {
        seqNo: seqNo,
        shortName: proj[projectCols.SHORT_NAME] || '',
        fullName: proj[projectCols.FULL_NAME] || '',
        contractor: proj[projectCols.CONTRACTOR] || '',
        dept: dept,
        inspectors: inspectorText,
        inspectorIds: inspectorIds,
        inspectorDetails: inspectorDetails,
        resp: proj[projectCols.RESPONSIBLE_PERSON] || '',
        safetyOfficer: proj[projectCols.SAFETY_OFFICER] || '',
        address: proj[projectCols.ADDRESS] || '',
        projectStatus: projectStatus,
        hasFilled: logsForProject.length > 0,
        isHolidayWork: false,
        isHolidayNoWork: false,
        workersCount: 0,
        workItems: [],
        disasterTypes: []
      };

      if (logsForProject.length > 0) {
        const firstLog = logsForProject[0];

        rowData.isHolidayWork = firstLog[logCols.IS_HOLIDAY_WORK] === '是';
        rowData.isHolidayNoWork = firstLog[logCols.WORK_ITEM] === '假日不施工';
        rowData.workersCount = firstLog[logCols.WORKERS_COUNT] || 0;

        logsForProject.forEach(log => {
          if (log[logCols.WORK_ITEM] && log[logCols.WORK_ITEM] !== '假日不施工') {
            const disasters = log[logCols.DISASTER_TYPES] ?
              log[logCols.DISASTER_TYPES].toString().split(',').map(d => d.trim()).filter(d => d) : [];

            rowData.workItems.push({
              text: log[logCols.WORK_ITEM],
              countermeasures: log[logCols.COUNTERMEASURES] || '',
              workLocation: log[logCols.WORK_LOCATION] || '',
              disasters: disasters
            });

            disasters.forEach(d => {
              if (!rowData.disasterTypes.some(dt => dt.text === d)) {
                rowData.disasterTypes.push({ text: d });
              }
            });
          }
        });
      }

      summaryData.push(rowData);
      // Logger.log('加入工程: ' + seqNo + ' (已填寫: ' + rowData.hasFilled + ')'); // 註解掉以減少 Log 量
    }

    Logger.log('總表資料總數: ' + summaryData.length);

    // 訪客模式：只返回已填寫且「非假日不施工」的日誌
    if (isGuestMode) {
      const filteredData = summaryData.filter(row => row.hasFilled && !row.isHolidayNoWork);
      Logger.log('訪客模式篩選後資料數: ' + filteredData.length);
      Logger.log('=== getDailySummaryReport 結束 (訪客模式) ===');
      return filteredData;
    }

    // 填表人權限：只能看到自己管理的工程
    if (userInfo && userInfo.role === '填表人' && userInfo.managedProjects) {
      const managedSeqNos = userInfo.managedProjects.map(p => p.toString());
      const filteredData = summaryData.filter(row => managedSeqNos.includes(row.seqNo.toString()));
      Logger.log('填表人篩選後資料數: ' + filteredData.length);
      Logger.log('=== getDailySummaryReport 結束 (填表人模式) ===');
      return filteredData;
    }

    Logger.log('=== getDailySummaryReport 結束 ===');
    return summaryData;

  } catch (error) {
    Logger.log('getDailySummaryReport error: ' + error.toString());
    return [];
  }
}

// ============================================
// 修正8：日誌填報狀況總覽（正確統計）
// ============================================
function getUnfilledProjectsForTomorrow() {
  try {
    const userName = getUserName();
    const userSheet = getSheet(CONFIG.SHEET_NAMES.USERS);
    const userData = userSheet.getDataRange().getValues();
    const userCols = CONFIG.USER_COLS;

    let currentUser = null;
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][userCols.ACCOUNT] === userName) {
        const managedProjectsStr = userData[i][userCols.MANAGED_PROJECTS] || '';
        currentUser = {
          role: userData[i][userCols.ROLE],
          managedProjects: managedProjectsStr ? managedProjectsStr.split(',').map(p => p.trim()) : []
        };
        break;
      }
    }

    if (!currentUser || currentUser.role !== '填表人') {
      return [];
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = Utilities.formatDate(tomorrow, 'GMT+8', 'yyyy-MM-dd');

    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    const unfilledProjects = [];

    // 遍歷填表人管理的工程
    for (let i = 1; i < projectData.length; i++) {
      const proj = projectData[i];
      const seqNo = proj[projectCols.SEQ_NO] ? proj[projectCols.SEQ_NO].toString() : '';

      if (!seqNo || !currentUser.managedProjects.includes(seqNo)) continue;

      const projectStatus = proj[projectCols.PROJECT_STATUS] || '施工中';
      if (projectStatus !== '施工中') continue;

      // 檢查是否已填報明日日誌
      let hasFilled = false;
      for (let j = 1; j < logData.length; j++) {
        const logDate = logData[j][logCols.DATE];
        const logSeqNo = logData[j][logCols.PROJECT_SEQ_NO] ? logData[j][logCols.PROJECT_SEQ_NO].toString() : '';
        const logDateStr = Utilities.formatDate(new Date(logDate), 'GMT+8', 'yyyy-MM-dd');

        if (logSeqNo === seqNo && logDateStr === tomorrowStr) {
          hasFilled = true;
          break;
        }
      }

      if (!hasFilled) {
        unfilledProjects.push({
          seqNo: seqNo,
          shortName: proj[projectCols.SHORT_NAME] || '',
          fullName: proj[projectCols.FULL_NAME] || '',
          address: proj[projectCols.ADDRESS] || ''
        });
      }
    }

    return unfilledProjects;
  } catch (error) {
    Logger.log('getUnfilledProjectsForTomorrow error: ' + error.toString());
    return [];
  }
}

function getDailyLogStatus() {
  try {
    Logger.log('=== getDailyLogStatus 開始 ===');

    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = Utilities.formatDate(tomorrow, 'GMT+8', 'yyyy-MM-dd');

    Logger.log('統計日期: ' + tomorrowStr);

    const byDept = {};
    let totalActiveProjects = 0;
    let totalFilledTomorrow = 0;

    // 修正8：先統計已填寫的工程序號
    const filledSeqNos = new Set();
    const holidayNoWorkSeqNos = new Set(); // [新增] 假日不施工的工程

    for (let i = 1; i < logData.length; i++) {
      if (!logData[i][logCols.DATE]) continue;

      const logDateStr = Utilities.formatDate(new Date(logData[i][logCols.DATE]), 'GMT+8', 'yyyy-MM-dd');
      if (logDateStr === tomorrowStr) {
        const seqNo = logData[i][logCols.PROJECT_SEQ_NO] ? logData[i][logCols.PROJECT_SEQ_NO].toString() : '';
        const workItem = logData[i][logCols.WORK_ITEM]; // [新增] 取得工項內容

        if (seqNo) {
          if (String(workItem).includes('假日不施工')) {
            holidayNoWorkSeqNos.add(seqNo);
            Logger.log('假日不施工: ' + seqNo);
          } else {
            filledSeqNos.add(seqNo);
            Logger.log('已填寫: ' + seqNo);
          }
        }
      }
    }

    Logger.log('已填寫工程數量: ' + filledSeqNos.size);
    Logger.log('假日不施工數量: ' + holidayNoWorkSeqNos.size);

    // 修正8：遍歷所有施工中的工程
    for (let i = 1; i < projectData.length; i++) {
      const proj = projectData[i];
      const seqNo = proj[projectCols.SEQ_NO] ? proj[projectCols.SEQ_NO].toString() : '';
      const projectStatus = proj[projectCols.PROJECT_STATUS] || '施工中';

      if (!seqNo || projectStatus !== '施工中') continue;

      // [新增] 如果是假日不施工，完全排除在統計之外
      if (holidayNoWorkSeqNos.has(seqNo)) {
        continue;
      }

      totalActiveProjects++;

      const dept = proj[projectCols.DEPT_MAIN] || '未分類';

      if (!byDept[dept]) {
        byDept[dept] = {
          total: 0,
          filled: [],
          missing: []
        };
      }

      byDept[dept].total++;

      const projectInfo = {
        seqNo: seqNo,
        fullName: proj[projectCols.FULL_NAME] || '',
        contractor: proj[projectCols.CONTRACTOR] || ''
      };

      // 修正8：正確判斷填寫狀態
      if (filledSeqNos.has(seqNo)) {
        byDept[dept].filled.push(projectInfo);
        totalFilledTomorrow++;
        Logger.log('部門 ' + dept + ' - 已填寫: ' + seqNo);
      } else {
        byDept[dept].missing.push(projectInfo);
        Logger.log('部門 ' + dept + ' - 未填寫: ' + seqNo);
      }
    }

    Logger.log('施工中工程總數: ' + totalActiveProjects);
    Logger.log('已填寫總數: ' + totalFilledTomorrow);
    Logger.log('=== getDailyLogStatus 結束 ===');

    return {
      tomorrowDate: tomorrowStr,
      totalProjects: totalActiveProjects,
      filledTomorrow: totalFilledTomorrow,
      byDept: byDept
    };

  } catch (error) {
    Logger.log('getDailyLogStatus error: ' + error.toString());
    return {
      tomorrowDate: '',
      totalProjects: 0,
      filledTomorrow: 0,
      byDept: {}
    };
  }
}

// ============================================
// 部門管理
// ============================================
function getAllDepartments() {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.PROJECT_COLS;

    const deptSet = new Set();

    for (let i = 1; i < data.length; i++) {
      const dept = data[i][cols.DEPT_MAIN];
      if (dept && dept.toString().trim() !== '') {
        deptSet.add(dept.toString().trim());
      }
    }

    const deptArray = Array.from(deptSet);

    // 修正5：排序 - 隊優先，委外監造最後
    deptArray.sort((a, b) => {
      const aIsTeam = a.includes('隊');
      const bIsTeam = b.includes('隊');
      const aIsOutsource = a === '委外監造';
      const bIsOutsource = b === '委外監造';

      if (aIsTeam && !bIsTeam) return -1;
      if (!aIsTeam && bIsTeam) return 1;

      if (aIsOutsource && !bIsOutsource) return 1;
      if (!aIsOutsource && bIsOutsource) return -1;

      return a.localeCompare(b, 'zh-TW');
    });

    return deptArray;

  } catch (error) {
    Logger.log('getAllDepartments error: ' + error.toString());
    return [];
  }
}

// ============================================
// 行事曆功能
// ============================================
function checkHolidayFilledStatus(dateString, projects) {
  try {
    const userName = getUserName();
    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    const unfilledProjects = [];
    let alreadyFilledCount = 0;

    projects.forEach(project => {
      let hasFilled = false;

      for (let i = 1; i < logData.length; i++) {
        const logDate = logData[i][logCols.DATE];
        const logSeqNo = logData[i][logCols.PROJECT_SEQ_NO] ? logData[i][logCols.PROJECT_SEQ_NO].toString() : '';
        const logDateStr = Utilities.formatDate(new Date(logDate), 'GMT+8', 'yyyy-MM-dd');

        if (logSeqNo === project.seqNo && logDateStr === dateString) {
          hasFilled = true;
          alreadyFilledCount++;
          break;
        }
      }

      if (!hasFilled) {
        unfilledProjects.push(project);
      }
    });

    return {
      unfilledProjects: unfilledProjects,
      alreadyFilledCount: alreadyFilledCount
    };
  } catch (error) {
    Logger.log('checkHolidayFilledStatus error: ' + error.toString());
    return {
      unfilledProjects: [],
      alreadyFilledCount: 0
    };
  }
}

/**
 * [新增] 批次提交假日不施工日誌
 * @param {string} startDate - 開始日期 (YYYY-MM-DD)
 * @param {string} endDate - 結束日期 (YYYY-MM-DD)
 * @param {Array<number>} targetDays - 目標星期幾 (0=週日, 6=週六)
 * @param {Array<string>} projectSeqNos - 工程序號列表
 */
function batchSubmitHolidayLogs(startDate, endDate, targetDays, projectSeqNos) {
  const userName = getUserName();

  try {
    Logger.log('=== batchSubmitHolidayLogs 開始 ===');
    Logger.log(`日期範圍: ${startDate} ~ ${endDate}`);
    Logger.log(`目標星期: ${targetDays.join(',')}`);
    Logger.log(`工程數量: ${projectSeqNos.length}`);

    if (!startDate || !endDate || !targetDays || !projectSeqNos || projectSeqNos.length === 0) {
      return { success: false, message: '參數不完整' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateList = [];

    // 1. 產生符合條件的日期列表
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay(); // 0-6
      if (targetDays.includes(dayOfWeek)) {
        dateList.push(Utilities.formatDate(new Date(d), 'GMT+8', 'yyyy-MM-dd'));
      }
    }

    if (dateList.length === 0) {
      return { success: false, message: '選定範圍內沒有符合的日期' };
    }

    Logger.log(`符合日期: ${dateList.join(', ')}`);

    // 2. 準備寫入資料
    const sheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const cols = CONFIG.DAILY_LOG_COLS;
    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    // 建立工程序號對簡稱的 Map，減少查詢次數
    const projectMap = {};
    for (let i = 1; i < projectData.length; i++) {
      const seq = projectData[i][projectCols.SEQ_NO] ? projectData[i][projectCols.SEQ_NO].toString() : '';
      if (seq) {
        projectMap[seq] = projectData[i][projectCols.SHORT_NAME] || '';
      }
    }

    // 3. 檢查現有資料以避免重複 (選擇性：目前邏輯是直接 append，或先刪除舊的?)
    // 為了效能，這裡採用「先刪除該日期該工程的舊資料，再寫入新資料」的策略
    // 但考慮到批次量大，逐一刪除太慢。
    // 策略：讀取所有資料 -> 標記要刪除的行 -> 批次刪除 -> 批次寫入
    // 簡化策略：直接寫入，由後續的 getDailySummaryReport 處理重複 (通常取最新的)
    // 但為了資料庫整潔，還是建議清理。這裡先實作「覆蓋」邏輯。

    const sheetData = sheet.getDataRange().getValues();
    const rowsToDelete = [];

    // 找出需要刪除的舊資料 (符合日期且符合工程)
    for (let i = 1; i < sheetData.length; i++) {
      if (!sheetData[i][cols.DATE]) continue;
      const rowDate = Utilities.formatDate(new Date(sheetData[i][cols.DATE]), 'GMT+8', 'yyyy-MM-dd');
      const rowSeqNo = sheetData[i][cols.PROJECT_SEQ_NO] ? sheetData[i][cols.PROJECT_SEQ_NO].toString() : '';

      if (dateList.includes(rowDate) && projectSeqNos.includes(rowSeqNo)) {
        rowsToDelete.push(i + 1);
      }
    }

    // 由後往前刪除
    // 注意：如果資料量大，deleteRow 會很慢。
    // 如果刪除行數過多，建議優化。但考慮到通常是週末，量應該還好。
    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(row => sheet.deleteRow(row));

    // 4. 批次寫入新資料
    const newRows = [];
    const submitTime = new Date();

    dateList.forEach(dateStr => {
      projectSeqNos.forEach(seqNo => {
        const row = [];
        row[cols.DATE] = new Date(dateStr);
        row[cols.PROJECT_SEQ_NO] = seqNo;
        row[cols.PROJECT_SHORT_NAME] = projectMap[seqNo] || '';
        row[cols.INSPECTORS] = '';
        row[cols.WORKERS_COUNT] = 0;
        row[cols.WORK_ITEM] = '假日不施工';
        row[cols.DISASTER_TYPES] = '';
        row[cols.COUNTERMEASURES] = '';
        row[cols.WORK_LOCATION] = '';
        row[cols.FILLER_NAME] = userName;
        row[cols.SUBMIT_TIME] = submitTime;
        row[cols.IS_HOLIDAY_WORK] = '否';

        newRows.push(row);
      });
    });

    if (newRows.length > 0) {
      // 試算表批次寫入優化
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    }

    logModification('批次假日設定', '多筆', {}, { dates: dateList, projects: projectSeqNos }, '批次設定假日不施工', '批次新增');

    return {
      success: true,
      message: `已成功設定 ${dateList.length} 天，共 ${projectSeqNos.length} 個工程的假日不施工記錄`,
      count: newRows.length
    };

  } catch (error) {
    Logger.log('batchSubmitHolidayLogs error: ' + error.toString());
    return { success: false, message: '批次設定失敗：' + error.message };
  }
}

function checkHoliday(dateString) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.CALENDAR);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.CALENDAR_COLS;

    const dateObj = new Date(dateString);
    const weekdayNum = dateObj.getDay();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[weekdayNum];

    const dateKey = dateString.replace(/-/g, '');

    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][cols.DATE] ? data[i][cols.DATE].toString() : '';
      if (rowDate === dateKey) {
        const isHoliday = data[i][cols.IS_HOLIDAY] == 2;
        const remark = data[i][cols.REMARK] || '';

        return {
          isHoliday: isHoliday,
          weekday: weekday,
          remark: remark
        };
      }
    }

    const isWeekend = weekdayNum === 0 || weekdayNum === 6;

    return {
      isHoliday: isWeekend,
      weekday: weekday,
      remark: isWeekend ? '週末' : ''
    };

  } catch (error) {
    Logger.log('checkHoliday error: ' + error.toString());
    return {
      isHoliday: false,
      weekday: '',
      remark: ''
    };
  }
}

function getMonthHolidays(year, month) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.CALENDAR);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.CALENDAR_COLS;

    const holidays = {};

    const monthStr = String(month).padStart(2, '0');
    const yearMonthPrefix = `${year}${monthStr}`;

    for (let i = 1; i < data.length; i++) {
      const dateKey = data[i][cols.DATE] ? data[i][cols.DATE].toString() : '';

      if (dateKey.startsWith(yearMonthPrefix)) {
        const isHoliday = data[i][cols.IS_HOLIDAY] == 2;

        if (isHoliday) {
          const year = dateKey.substring(0, 4);
          const month = dateKey.substring(4, 6);
          const day = dateKey.substring(6, 8);
          const dateString = `${year}-${month}-${day}`;

          holidays[dateString] = {
            isHoliday: true,
            remark: data[i][cols.REMARK] || ''
          };
        }
      }
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const weekday = dateObj.getDay();

      if (weekday === 0 || weekday === 6) {
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (!holidays[dateString]) {
          holidays[dateString] = {
            isHoliday: true,
            remark: '週末'
          };
        }
      }
    }

    return holidays;

  } catch (error) {
    Logger.log('getMonthHolidays error: ' + error.toString());
    return {};
  }
}

// ============================================
// TBM-KY 生成功能
// ============================================

/**
 * 測試 Drive 權限和範本/資料夾存取
 * 用於診斷 TBM-KY 生成問題
 */
function testTBMKYPermissions() {
  const templateId = CONFIG.TBMKY_TEMPLATE_ID;
  const folderId = CONFIG.TBMKY_FOLDER_ID;

  const result = {
    driveAccess: false,
    templateAccess: false,
    folderAccess: false,
    templateName: '',
    folderName: '',
    errors: []
  };

  // 測試 Drive 基本存取
  try {
    const files = DriveApp.getFiles();
    result.driveAccess = true;
  } catch (e) {
    result.errors.push('Drive 基本存取失敗：' + e.message);
  }

  // 測試範本存取
  try {
    const template = DriveApp.getFileById(templateId);
    result.templateAccess = true;
    result.templateName = template.getName();
  } catch (e) {
    result.errors.push('範本存取失敗：' + e.message);
  }

  // 測試資料夾存取
  try {
    const folder = DriveApp.getFolderById(folderId);
    result.folderAccess = true;
    result.folderName = folder.getName();
  } catch (e) {
    result.errors.push('資料夾存取失敗：' + e.message);
  }

  Logger.log('TBM-KY 權限測試結果：' + JSON.stringify(result, null, 2));
  return result;
}

function generateTBMKY(params) {
  try {
    const { dateString, projectSeqNo, mode } = params;

    if (!dateString || !projectSeqNo || !mode) {
      return { success: false, message: '缺少必要參數' };
    }

    const projects = getAllProjects();
    const project = projects.find(p => p.seqNo === projectSeqNo);

    if (!project) {
      return { success: false, message: '找不到工程資料' };
    }

    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const allLogs = logSheet.getDataRange().getValues();
    const cols = CONFIG.DAILY_LOG_COLS;

    const workItems = [];

    for (let i = 1; i < allLogs.length; i++) {
      const row = allLogs[i];
      if (!row[cols.DATE]) continue;

      const logDateStr = Utilities.formatDate(new Date(row[cols.DATE]), 'GMT+8', 'yyyy-MM-dd');

      if (logDateStr === dateString && row[cols.PROJECT_SHORT_NAME].toString() === project.shortName) {
        workItems.push({
          workItem: row[cols.WORK_ITEM] || '',
          workLocation: row[cols.WORK_LOCATION] || '',
          disasterTypes: row[cols.DISASTER_TYPES] || '',
          countermeasures: row[cols.COUNTERMEASURES] || ''
        });
      }
    }

    if (workItems.length === 0) {
      return { success: false, message: '該日期無工項資料' };
    }

    const templateId = CONFIG.TBMKY_TEMPLATE_ID;
    const folderId = CONFIG.TBMKY_FOLDER_ID;

    let template;
    let folder;

    try {
      template = DriveApp.getFileById(templateId);
      Logger.log('成功存取範本文件：' + template.getName());
    } catch (e) {
      Logger.log('存取範本文件失敗：' + e.toString());
      return {
        success: false,
        message: '無法存取範本文件。錯誤：' + e.message + '\n\n請確認：\n1. 範本ID是否正確\n2. 執行帳號是否有權限存取範本\n3. 是否已完成 OAuth 授權（Drive 權限）'
      };
    }

    try {
      folder = DriveApp.getFolderById(folderId);
      Logger.log('成功存取資料夾：' + folder.getName());
    } catch (e) {
      Logger.log('存取資料夾失敗：' + e.toString());
      return {
        success: false,
        message: '無法存取存放資料夾。錯誤：' + e.message + '\n\n請確認：\n1. 資料夾ID是否正確\n2. 執行帳號是否有權限存取資料夾'
      };
    }

    const createdFiles = [];

    if (mode === 'merged') {
      const docCopy = template.makeCopy(`TBM-KY_${project.fullName}_${dateString}`, folder);
      const doc = DocumentApp.openById(docCopy.getId());
      const body = doc.getBody();

      body.replaceText('【工程名稱】', project.fullName);
      body.replaceText('【承攬商名稱】', project.contractor || '未設定');
      body.replaceText('【年月日】', dateString);

      // 工作項目：加上編號
      const allWorkItems = workItems
        .map((item, index) => `${index + 1}. ${item.workItem}`)
        .join('\n');
      body.replaceText('【工作項目】', allWorkItems);

      const allWorkLocations = workItems.map(item => item.workLocation).join('；');
      body.replaceText('【工作地點】', allWorkLocations);

      // 主要危害：換行顯示，並加上工項-災害編號（1-1, 1-2格式）
      const allDisasterTypes = workItems.map((item, workIndex) => {
        const disasters = item.disasterTypes.split('、');
        return disasters.map((disaster, disIndex) =>
          `${workIndex + 1}-${disIndex + 1}. ${disaster}`
        ).join('\n');
      }).join('\n');
      body.replaceText('【主要危害】', allDisasterTypes);

      // 危害對策：換行顯示，加上工項編號
      const allCountermeasures = workItems
        .map((item, index) => `${index + 1}. ${item.countermeasures}`)
        .join('\n');
      body.replaceText('【危害對策】', allCountermeasures);

      doc.saveAndClose();

      createdFiles.push({
        name: docCopy.getName(),
        url: docCopy.getUrl(),
        id: docCopy.getId()
      });

    } else if (mode === 'separate') {
      workItems.forEach((item, index) => {
        const docCopy = template.makeCopy(`TBM-KY_${project.fullName}_${dateString}_工項${index + 1}`, folder);
        const doc = DocumentApp.openById(docCopy.getId());
        const body = doc.getBody();

        body.replaceText('【工程名稱】', project.fullName);
        body.replaceText('【承攬商名稱】', project.contractor || '未設定');
        body.replaceText('【年月日】', dateString);
        body.replaceText('【工作項目】', item.workItem);
        body.replaceText('【工作地點】', item.workLocation);
        body.replaceText('【主要危害】', item.disasterTypes);
        body.replaceText('【危害對策】', item.countermeasures);

        doc.saveAndClose();

        createdFiles.push({
          name: docCopy.getName(),
          url: docCopy.getUrl(),
          id: docCopy.getId()
        });
      });
    }

    return {
      success: true,
      message: `成功生成 ${createdFiles.length} 個TBM-KY文件並存放至指定資料夾`,
      files: createdFiles
    };

  } catch (error) {
    Logger.log('generateTBMKY error: ' + error.toString());
    return { success: false, message: '生成失敗：' + error.message };
  }
}

// ============================================
// 災害類型管理
// ============================================
function getDisasterTypes() {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.DROPDOWN_OPTIONS);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.DISASTER_COLS;

    const disasters = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[cols.TYPE] && row[cols.TYPE].toString().trim() !== '') {
        const type = row[cols.TYPE].toString().trim();
        const description = row[cols.DESCRIPTION] || '';

        let icon = '⚠️';
        if (type.includes('墜落') || type.includes('滾落')) icon = '⬇️';
        else if (type.includes('感電')) icon = '⚡';
        else if (type.includes('物體飛落')) icon = '🪨';
        else if (type.includes('崩塌')) icon = '🏔️';
        else if (type.includes('火災') || type.includes('爆炸')) icon = '🔥';
        else if (type.includes('機械')) icon = '⚙️';
        else if (type.includes('交通')) icon = '🚗';
        else if (type.includes('其他')) icon = '📝';

        disasters.push({
          type: type,
          description: description,
          icon: icon
        });
      }
    }

    return disasters;

  } catch (error) {
    Logger.log('getDisasterTypes error: ' + error.toString());
    return [];
  }
}

function saveCustomDisasterType(customType) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.DROPDOWN_OPTIONS);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.DISASTER_COLS;

    for (let i = 1; i < data.length; i++) {
      if (data[i][cols.TYPE] === customType) {
        return;
      }
    }

    const row = [];
    row[cols.TYPE] = customType;
    row[cols.DESCRIPTION] = '使用者自訂';
    row[cols.PRIORITY] = 999;

    sheet.appendRow(row);

  } catch (error) {
    Logger.log('saveCustomDisasterType error: ' + error.toString());
  }
}

// ============================================
// 修改記錄
// ============================================
function logModification(type, projectSeqNo, oldData, newData, reason, actionType) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.MODIFICATION_LOG);
    const userName = getUserName();
    const cols = CONFIG.MODIFICATION_COLS;

    const row = [];
    row[cols.TIMESTAMP] = new Date();
    row[cols.USER_NAME] = userName;
    row[cols.PROJECT_SEQ_NO] = projectSeqNo;
    row[cols.LOG_DATE] = newData.logDate || newData.dateString || '';
    row[cols.ORIGINAL_DATA] = JSON.stringify(oldData);
    row[cols.NEW_DATA] = JSON.stringify(newData);
    row[cols.REASON] = reason;
    row[cols.TYPE] = actionType;

    sheet.appendRow(row);

  } catch (error) {
    Logger.log('logModification error: ' + error.toString());
  }
}

// ============================================
// 使用者管理功能
// ============================================

/**
 * 取得所有使用者資料
 * @returns {Array} 使用者列表
 */
function getAllUsers() {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.FILLER_COLS;

    const users = [];

    // 從第2列開始（跳過標題列）
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // 跳過空白列
      if (!row[cols.NAME] || !row[cols.ACCOUNT]) continue;

      // 解析管理工程序號
      const managedProjectsStr = row[cols.MANAGED_PROJECTS] || '';
      const managedProjects = managedProjectsStr ?
        managedProjectsStr.split(',').map(p => p.trim()).filter(p => p) : [];

      users.push({
        rowIndex: i + 1,  // Excel 行號（從1開始）
        dept: row[cols.DEPT] || '',
        name: row[cols.NAME] || '',
        account: row[cols.ACCOUNT] || '',
        email: row[cols.EMAIL] || '',
        role: row[cols.ROLE] || '填表人',
        password: row[cols.PASSWORD] || '',
        managedProjects: managedProjects,
        supervisorEmail: row[cols.SUPERVISOR_EMAIL] || ''
      });
    }

    Logger.log('載入使用者數量: ' + users.length);
    return users;

  } catch (error) {
    Logger.log('getAllUsers error: ' + error.toString());
    return [];
  }
}

/**
 * 根據帳號取得使用者資料
 * @param {string} account 帳號
 * @returns {Object} 使用者資料
 */
function getUserByAccount(account) {
  try {
    const allUsers = getAllUsers();

    for (let i = 0; i < allUsers.length; i++) {
      if (allUsers[i].account === account) {
        return {
          success: true,
          user: allUsers[i]
        };
      }
    }

    return {
      success: false,
      message: '查無此帳號'
    };

  } catch (error) {
    Logger.log('getUserByAccount error: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 新增使用者
 * @param {Object} userData 使用者資料
 * @returns {Object} 結果
 */
function addUser(userData) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const cols = CONFIG.FILLER_COLS;

    // 檢查帳號是否已存在
    const existingUser = getUserByAccount(userData.account);
    if (existingUser.success) {
      return {
        success: false,
        message: '帳號已存在'
      };
    }

    // 準備新列資料
    const managedProjectsStr = userData.managedProjects ?
      userData.managedProjects.join(',') : '';
    const newRow = [];
    newRow[cols.DEPT] = userData.dept || '';
    newRow[cols.NAME] = userData.name || '';
    newRow[cols.ACCOUNT] = userData.account || '';
    newRow[cols.EMAIL] = userData.email || '';
    newRow[cols.ROLE] = userData.role || '填表人';
    newRow[cols.PASSWORD] = userData.password || '';

    // 修改：加上單引號強制轉為純文字格式
    newRow[cols.MANAGED_PROJECTS] = "'" + managedProjectsStr;

    newRow[cols.SUPERVISOR_EMAIL] = userData.supervisorEmail || '';

    // 新增到工作表
    sheet.appendRow(newRow);

    Logger.log('新增使用者成功: ' + userData.account);
    return {
      success: true,
      message: '新增使用者成功'
    };

  } catch (error) {
    Logger.log('addUser error: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 更新使用者資料
 * @param {Object} userData 使用者資料（含 rowIndex）
 * @returns {Object} 結果
 */
function updateUser(userData) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const cols = CONFIG.FILLER_COLS;

    if (!userData.rowIndex) {
      return {
        success: false,
        message: '缺少 rowIndex 參數'
      };
    }

    // 準備更新資料
    const managedProjectsStr = userData.managedProjects ?
      userData.managedProjects.join(',') : '';
    const row = userData.rowIndex;

    sheet.getRange(row, cols.DEPT + 1).setValue(userData.dept || '');
    sheet.getRange(row, cols.NAME + 1).setValue(userData.name || '');
    sheet.getRange(row, cols.ACCOUNT + 1).setValue(userData.account || '');
    sheet.getRange(row, cols.EMAIL + 1).setValue(userData.email || '');
    sheet.getRange(row, cols.ROLE + 1).setValue(userData.role || '填表人');
    // 只有提供新密碼時才更新
    if (userData.password) {
      sheet.getRange(row, cols.PASSWORD + 1).setValue(userData.password);
    }

    // 修改：加上單引號強制轉為純文字格式
    sheet.getRange(row, cols.MANAGED_PROJECTS + 1).setValue("'" + managedProjectsStr);

    sheet.getRange(row, cols.SUPERVISOR_EMAIL + 1).setValue(userData.supervisorEmail || '');

    Logger.log('更新使用者成功: ' + userData.account);
    return {
      success: true,
      message: '更新使用者成功'
    };
  } catch (error) {
    Logger.log('updateUser error: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 刪除使用者
 * @param {number} rowIndex Excel 行號
 * @returns {Object} 結果
 */
function deleteUser(rowIndex) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);

    if (!rowIndex || rowIndex < 2) {
      return {
        success: false,
        message: '無效的行號'
      };
    }

    sheet.deleteRow(rowIndex);

    Logger.log('刪除使用者成功，行號: ' + rowIndex);
    return {
      success: true,
      message: '刪除使用者成功'
    };

  } catch (error) {
    Logger.log('deleteUser error: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 忘記密碼：發送臨時密碼
 * @param {string} input 帳號或信箱
 * @returns {Object} 結果
 */
function sendTemporaryPassword(input) {
  try {
    Logger.log('sendTemporaryPassword called with input: ' + input);

    if (!input || input.trim() === '') {
      return {
        success: false,
        message: '請輸入帳號或信箱'
      };
    }

    const sheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const data = sheet.getDataRange().getValues();
    const cols = CONFIG.FILLER_COLS;

    // 搜尋使用者
    let userRow = null;
    let userName = '';
    let userEmail = '';
    let userAccount = '';

    for (let i = 1; i < data.length; i++) {
      const account = data[i][cols.ACCOUNT] ? data[i][cols.ACCOUNT].toString().trim() : '';
      const email = data[i][cols.EMAIL] ? data[i][cols.EMAIL].toString().trim() : '';

      if (account === input.trim() || email === input.trim()) {
        userRow = i + 1;
        userName = data[i][cols.NAME] || '使用者';
        userEmail = email;
        userAccount = account;
        break;
      }
    }

    if (!userRow) {
      Logger.log('找不到使用者: ' + input);
      return {
        success: false,
        message: '找不到該帳號或信箱的使用者'
      };
    }

    if (!userEmail) {
      return {
        success: false,
        message: '該帳號未設定信箱，無法發送臨時密碼'
      };
    }

    // 生成 8-12 位隨機臨時密碼
    const tempPassword = generateTemporaryPassword();

    Logger.log('生成臨時密碼: ' + tempPassword);

    // 更新密碼（讓使用者可以登入）
    sheet.getRange(userRow, cols.PASSWORD + 1).setValue(tempPassword);

    // 同時記錄到臨時密碼欄位 K 欄（管理員查詢用）
    sheet.getRange(userRow, cols.TEMP_PASSWORD + 1).setValue(tempPassword);

    Logger.log('已更新密碼欄位和臨時密碼欄位');

    // 發送 Email
    const subject = '工程日誌系統 - 臨時密碼通知';
    const body = `親愛的 ${userName}：\n\n` +
      `您的臨時密碼為：${tempPassword}\n\n` +
      `請使用此臨時密碼登入系統，並立即變更密碼。\n\n` +
      `帳號：${userAccount}\n` +
      `臨時密碼：${tempPassword}\n\n` +
      `為確保您的帳號安全，建議您登入後立即至「使用者管理」頁面變更密碼。\n\n` +
      `------\n` +
      `綜合施工處 每日工程日誌系統\n` +
      `此為系統自動發送的郵件，請勿回覆。`;

    try {
      MailApp.sendEmail({
        to: userEmail,
        subject: subject,
        body: body
      });

      Logger.log('臨時密碼已發送至: ' + userEmail);
      return {
        success: true,
        message: `臨時密碼已發送至 ${userEmail}\n\n請查收信箱並使用臨時密碼登入系統。`
      };
    } catch (emailError) {
      const errorMsg = emailError.toString();
      Logger.log('Email 發送失敗: ' + errorMsg);

      // 即使 email 發送失敗，密碼也已經更新了
      // 但不在前端顯示臨時密碼，引導使用者聯繫管理員
      return {
        success: false,
        message: `Email 發送失敗\n\n` +
          `錯誤原因：${errorMsg}\n\n` +
          `您的臨時密碼已經生成，但無法透過 Email 發送。\n` +
          `請聯繫系統管理員查看試算表中的臨時密碼（K 欄），或重新設定權限。\n\n` +
          `如需協助，請聯繫系統管理員。`
      };
    }

  } catch (error) {
    Logger.log('sendTemporaryPassword error: ' + error.toString());
    return {
      success: false,
      message: '發送臨時密碼時發生錯誤：' + error.toString()
    };
  }
}

/**
 * 生成 8-12 位隨機臨時密碼
 * @returns {string} 臨時密碼
 */
function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const length = Math.floor(Math.random() * 5) + 8; // 8-12 位
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

// ============================================
// 需求3：每日下午4時自動發送提醒 Email
// ============================================

/**
 * 每日自動發送提醒 Email 給填表人
 * 提醒填寫明日尚未填寫的「施工中」工程日誌
 *
 * 觸發器設定：
 * - 每日下午 4:00-5:00 執行
 * - 時間驅動觸發器
 *
 * 執行邏輯：
 * 1. 取得所有填表人清單
 * 2. 對每個填表人檢查其管理的「施工中」工程
 * 3. 檢查明日是否已填寫日誌
 * 4. 如果有未填寫的工程，發送提醒 Email
 * 5. 如果填表人無 Email，記錄到日誌
 */
function sendDailyReminderEmails() {
  try {
    Logger.log('========================================');
    Logger.log('[sendDailyReminderEmails] 開始執行每日提醒 Email 發送');
    Logger.log('[sendDailyReminderEmails] 執行時間: ' + new Date());
    Logger.log('========================================');

    // 計算明日日期
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = Utilities.formatDate(tomorrow, 'GMT+8', 'yyyy-MM-dd');
    Logger.log('[sendDailyReminderEmails] 明日日期: ' + tomorrowStr);

    // 取得填表人資料
    const fillerSheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const fillerData = fillerSheet.getDataRange().getValues();
    const fillerCols = CONFIG.FILLER_COLS;

    Logger.log('[sendDailyReminderEmails] 填表人資料總行數: ' + fillerData.length);

    // 取得工程基本資料（用於檢查工程狀態）
    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    // 取得明日日誌資料
    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    // 統計資料
    let totalFillers = 0;        // 總填表人數
    let emailSentCount = 0;      // Email 發送成功數
    let emailFailedCount = 0;    // Email 發送失敗數
    let noEmailCount = 0;        // 無 Email 的填表人數
    let noUnfilledCount = 0;     // 所有工程都已填寫的填表人數

    // 遍歷所有填表人
    for (let i = 1; i < fillerData.length; i++) {
      const fillerRole = fillerData[i][fillerCols.ROLE];

      // 只處理「填表人」角色
      if (fillerRole !== '填表人') {
        continue;
      }

      totalFillers++;

      const fillerName = fillerData[i][fillerCols.NAME] || '填表人';
      const fillerEmail = fillerData[i][fillerCols.EMAIL] || '';
      const managedProjectsStr = fillerData[i][fillerCols.MANAGED_PROJECTS] || '';

      Logger.log('');
      Logger.log('[sendDailyReminderEmails] ===== 處理填表人 ' + totalFillers + ': ' + fillerName + ' =====');
      Logger.log('[sendDailyReminderEmails] Email: ' + fillerEmail);
      Logger.log('[sendDailyReminderEmails] 管理工程: ' + managedProjectsStr);

      // 檢查是否有 Email
      if (!fillerEmail || fillerEmail.trim() === '') {
        Logger.log('[sendDailyReminderEmails] ✗ 填表人無 Email，跳過發送');
        noEmailCount++;
        continue;
      }

      // 檢查是否有管理工程
      if (!managedProjectsStr || managedProjectsStr.trim() === '') {
        Logger.log('[sendDailyReminderEmails] ⊘ 填表人未管理任何工程，跳過');
        continue;
      }

      // 分割工程序號
      const managedProjects = String(managedProjectsStr).split(',').map(s => s.trim()).filter(s => s !== '');
      Logger.log('[sendDailyReminderEmails] 管理工程數量: ' + managedProjects.length);

      // 檢查未填寫的「施工中」工程
      const unfilledProjects = [];

      managedProjects.forEach(seqNo => {
        // 找到工程資料
        let projectInfo = null;
        for (let j = 1; j < projectData.length; j++) {
          if (projectData[j][projectCols.SEQ_NO] && projectData[j][projectCols.SEQ_NO].toString() === seqNo) {
            projectInfo = {
              seqNo: seqNo,
              fullName: projectData[j][projectCols.FULL_NAME] || '',
              contractor: projectData[j][projectCols.CONTRACTOR] || '',
              projectStatus: projectData[j][projectCols.PROJECT_STATUS] || ''
            };
            break;
          }
        }

        if (!projectInfo) {
          Logger.log('[sendDailyReminderEmails]   ⊘ 工程 ' + seqNo + ' 找不到資料，跳過');
          return;
        }

        // 只檢查「施工中」的工程
        if (projectInfo.projectStatus !== '施工中') {
          Logger.log('[sendDailyReminderEmails]   ⊘ 工程 ' + seqNo + ' (' + projectInfo.fullName + ') 狀態為「' + projectInfo.projectStatus + '」，跳過');
          return;
        }

        // 檢查是否已填寫明日日誌
        let hasTomorrowLog = false;
        for (let k = 1; k < logData.length; k++) {
          if (!logData[k][logCols.DATE]) continue;

          const logDate = Utilities.formatDate(new Date(logData[k][logCols.DATE]), 'GMT+8', 'yyyy-MM-dd');
          const logSeqNo = logData[k][logCols.PROJECT_SEQ_NO] ? logData[k][logCols.PROJECT_SEQ_NO].toString() : '';

          if (logDate === tomorrowStr && logSeqNo === seqNo) {
            hasTomorrowLog = true;
            break;
          }
        }

        if (!hasTomorrowLog) {
          Logger.log('[sendDailyReminderEmails]   ✗ 工程 ' + seqNo + ' (' + projectInfo.fullName + ') 未填寫明日日誌');
          unfilledProjects.push(projectInfo);
        } else {
          Logger.log('[sendDailyReminderEmails]   ✓ 工程 ' + seqNo + ' (' + projectInfo.fullName + ') 已填寫明日日誌');
        }
      });

      // 如果所有工程都已填寫，跳過
      if (unfilledProjects.length === 0) {
        Logger.log('[sendDailyReminderEmails] ✓ 填表人 ' + fillerName + ' 的所有工程都已填寫，無需發送提醒');
        noUnfilledCount++;
        continue;
      }

      Logger.log('[sendDailyReminderEmails] 📧 填表人 ' + fillerName + ' 有 ' + unfilledProjects.length + ' 個工程未填寫，準備發送 Email...');


      // 構建 Email 內容 (HTML 美化版)
      const subject = '【提醒】明日工程日誌待填寫 (' + tomorrowStr + ')';

      // 生成工程列表 HTML
      let projectListRows = '';
      unfilledProjects.forEach((proj, index) => {
        projectListRows += `
          <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 4px;">
            <div style="color: #1e40af; font-weight: 700; font-size: 15px;">${index + 1}. ${proj.fullName}</div>
            <div style="color: #4b5563; font-size: 14px;">序號：${proj.seqNo}｜承攬商：${proj.contractor}</div>
          </div>
        `;
      });

      // 填報網址
      const systemUrl = 'https://sites.google.com/view/tpcgeco';

      // HTML Email 本文
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
            
            <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">每日工程日誌填報提醒</h1>
              <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 14px;">綜合施工處管理系統</p>
            </div>

            <div style="padding: 32px 24px;">
              <p style="font-size: 16px; color: #374151; margin-top: 0;">親愛的 <strong>${fillerName}</strong> 您好：</p>
              
              <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #9f1239; font-weight: 600;">⚠️ 提醒您，明日（${tomorrowStr}）尚有 ${unfilledProjects.length} 項工程未填寫日誌。</p>
              </div>

              <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px;">
                <div style="background-color: #f9fafb; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #6b7280; font-size: 13px; letter-spacing: 0.5px;">
                  未填寫工程清單
                </div>
                ${projectListRows}
              </div>

              <p style="color: #4b5563; font-size: 15px; text-align: center; margin-bottom: 24px;">
                請儘速至下述網頁填寫日誌：
              </p>

              <div style="text-align: center; margin-bottom: 16px;">
                <a href="${systemUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(30, 64, 175, 0.25); transition: background-color 0.2s;">
                  📝 立即前往填寫日誌
                </a>
              </div>
              
              <div style="text-align: center;">
                <a href="${systemUrl}" style="color: #6b7280; font-size: 13px; text-decoration: underline;">${systemUrl}</a>
              </div>

            </div>

            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                此為系統自動發送的郵件，請勿直接回覆。<br>
                發送時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // 發送 Email (使用 htmlBody)
      try {
        MailApp.sendEmail({
          to: fillerEmail,
          subject: subject,
          htmlBody: htmlBody // 改用 htmlBody
        });
        Logger.log('[sendDailyReminderEmails] ✓ Email 發送成功至: ' + fillerEmail);
        emailSentCount++;

      } catch (emailError) {
        Logger.log('[sendDailyReminderEmails] ✗ Email 發送失敗至: ' + fillerEmail);
        Logger.log('[sendDailyReminderEmails] 錯誤: ' + emailError.toString());
        emailFailedCount++;
      }






    }





    // 輸出統計摘要
    Logger.log('');
    Logger.log('========================================');
    Logger.log('[sendDailyReminderEmails] 執行完成摘要');
    Logger.log('========================================');
    Logger.log('[sendDailyReminderEmails] 明日日期: ' + tomorrowStr);
    Logger.log('[sendDailyReminderEmails] 總填表人數: ' + totalFillers);
    Logger.log('[sendDailyReminderEmails] Email 發送成功: ' + emailSentCount);
    Logger.log('[sendDailyReminderEmails] Email 發送失敗: ' + emailFailedCount);
    Logger.log('[sendDailyReminderEmails] 無 Email 填表人: ' + noEmailCount);
    Logger.log('[sendDailyReminderEmails] 所有工程已填寫: ' + noUnfilledCount);
    Logger.log('========================================');

    return {
      success: true,
      tomorrowDate: tomorrowStr,
      totalFillers: totalFillers,
      emailSentCount: emailSentCount,
      emailFailedCount: emailFailedCount,
      noEmailCount: noEmailCount,
      noUnfilledCount: noUnfilledCount
    };

  } catch (error) {
    Logger.log('[sendDailyReminderEmails] 執行錯誤: ' + error.toString());
    Logger.log('[sendDailyReminderEmails] 錯誤堆疊: ' + error.stack);

    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 測試每日提醒 Email 功能（手動測試用）
 * 可以在 Apps Script 編輯器中直接執行此函數測試
 */
function testSendDailyReminderEmails() {
  Logger.log('===== 開始測試每日提醒 Email 功能 =====');
  const result = sendDailyReminderEmails();
  Logger.log('===== 測試結果 =====');
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ============================================
// 測試與除錯函數
// ============================================
function testAuthentication() {
  const result = authenticateUser('test@example.com', CONFIG.DEFAULT_PASSWORD);
  Logger.log(result);
}

function testGetSummary() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, 'GMT+8', 'yyyy-MM-dd');

  const result = getDailySummaryReport(tomorrowStr, 'active', 'all');
  Logger.log(result);
}

function testGetLogStatus() {
  const result = getDailyLogStatus();
  Logger.log(result);
}

function testGetCurrentSession() {
  const result = getCurrentSession();
  Logger.log('getCurrentSession 測試成功');
  Logger.log(JSON.stringify(result));
  return result;
}

/**
 * [新增] 每日下午 4:30 寄信給聯絡員
 * 通知明日尚未填寫日誌之所有工程
 * 使用美化版 HTML 格式
 */
function sendDailyContactReminder() {
  try {
    Logger.log('[sendDailyContactReminder] 開始執行聯絡員提醒');

    // 1. 計算明日日期
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;

    Logger.log('[sendDailyContactReminder] 檢查日期: ' + tomorrowStr);

    // 2. 取得所有施工中的工程
    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projectData = projectSheet.getDataRange().getValues();
    const projectCols = CONFIG.PROJECT_COLS;

    const activeProjects = [];
    for (let i = 1; i < projectData.length; i++) {
      const status = projectData[i][projectCols.PROJECT_STATUS];
      const seqNo = projectData[i][projectCols.SEQ_NO];

      if (status === '施工中' && seqNo) {
        activeProjects.push({
          seqNo: seqNo.toString(),
          fullName: projectData[i][projectCols.FULL_NAME],
          contractor: projectData[i][projectCols.CONTRACTOR],
          dept: projectData[i][projectCols.DEPT_MAIN]
        });
      }
    }

    // 3. 檢查日誌填寫狀況
    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const logData = logSheet.getDataRange().getValues();
    const logCols = CONFIG.DAILY_LOG_COLS;

    const filledSeqNos = new Set();
    for (let i = 1; i < logData.length; i++) {
      if (!logData[i][logCols.DATE]) continue;

      const logDate = new Date(logData[i][logCols.DATE]);
      const logDateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;

      if (logDateStr === tomorrowStr) {
        const seqNo = logData[i][logCols.PROJECT_SEQ_NO];
        if (seqNo) filledSeqNos.add(seqNo.toString());
      }
    }

    // 4. 篩選未填寫工程
    const unfilledProjects = activeProjects.filter(p => !filledSeqNos.has(p.seqNo));

    if (unfilledProjects.length === 0) {
      Logger.log('[sendDailyContactReminder] 所有工程皆已填寫，不發送通知');
      return;
    }

    // 5. 取得所有聯絡員 Email
    const fillerSheet = getSheet(CONFIG.SHEET_NAMES.FILLERS);
    const fillerData = fillerSheet.getDataRange().getValues();
    const fillerCols = CONFIG.FILLER_COLS;

    const contactEmails = [];
    for (let i = 1; i < fillerData.length; i++) {
      const role = fillerData[i][fillerCols.ROLE];
      const email = fillerData[i][fillerCols.EMAIL];
      if (role === '聯絡員' && email) {
        contactEmails.push(email);
      }
    }

    if (contactEmails.length === 0) {
      Logger.log('[sendDailyContactReminder] 無聯絡員 Email，結束執行');
      return;
    }

    // 6. 準備美化版 HTML Email 內容
    const subject = `【日誌未填寫通知】明日（${tomorrowStr}）尚有 ${unfilledProjects.length} 項工程未填寫`;

    // 生成工程列表 HTML
    let projectListRows = '';
    unfilledProjects.forEach((proj, index) => {
      projectListRows += `
        <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 4px;">
          <div style="color: #1e40af; font-weight: 700; font-size: 15px;">${index + 1}. ${proj.fullName}</div>
          <div style="color: #4b5563; font-size: 14px;">
            <span style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; margin-right: 8px;">${proj.dept}</span>
            序號：${proj.seqNo}｜承攬商：${proj.contractor}
          </div>
        </div>
      `;
    });

    const systemUrl = 'https://sites.google.com/view/tpcgeco';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
          
          <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">工程日誌未填寫通知</h1>
            <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 14px;">綜合施工處管理系統</p>
          </div>

          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #374151; margin-top: 0;">各位 <strong>聯絡員</strong> 您好：</p>
            
            <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #9f1239; font-weight: 600;">⚠️ 系統檢查發現，明日（${tomorrowStr}）尚有 ${unfilledProjects.length} 項工程未填寫日誌。</p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px;">
              <div style="background-color: #f9fafb; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #6b7280; font-size: 13px; letter-spacing: 0.5px;">
                未填寫工程清單（共 ${unfilledProjects.length} 項）
              </div>
              ${projectListRows}
            </div>

            <p style="color: #4b5563; font-size: 15px; text-align: center; margin-bottom: 24px;">
              請儘速至下述網頁填寫日誌或通知廠商：
            </p>

            <div style="text-align: center; margin-bottom: 16px;">
              <a href="${systemUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(30, 64, 175, 0.25); transition: background-color 0.2s;">
                📝 前往日誌系統
              </a>
            </div>
            
            <div style="text-align: center;">
              <a href="${systemUrl}" style="color: #6b7280; font-size: 13px; text-decoration: underline;">${systemUrl}</a>
            </div>

          </div>

          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              此為系統自動發送的通知，請勿直接回覆。<br>
              發送時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 7. 發送郵件
    contactEmails.forEach(email => {
      try {
        MailApp.sendEmail({
          to: email,
          subject: subject,
          htmlBody: htmlBody
        });
        Logger.log('[sendDailyContactReminder] 已發送給: ' + email);
      } catch (e) {
        Logger.log('[sendDailyContactReminder] 發送失敗 (' + email + '): ' + e.toString());
      }
    });

    return { success: true, message: '發送完成' };

  } catch (error) {
    Logger.log('[sendDailyContactReminder] 錯誤: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ============================================
// 每月儀表板數據統計
// ============================================
function getMonthlyDashboardData(year, month) {
  try {
    const logSheet = getSheet(CONFIG.SHEET_NAMES.DAILY_LOG_DB);
    const data = logSheet.getDataRange().getValues();
    const cols = CONFIG.DAILY_LOG_COLS;

    // 專案名稱對照 Map
    const projectSheet = getSheet(CONFIG.SHEET_NAMES.PROJECT_INFO);
    const projData = projectSheet.getDataRange().getValues();
    const projCols = CONFIG.PROJECT_COLS;
    const projectNames = {};
    for (let i = 1; i < projData.length; i++) {
      const seq = projData[i][projCols.SEQ_NO];
      if (seq) projectNames[seq] = projData[i][projCols.SHORT_NAME] || projData[i][projCols.FULL_NAME];
    }

    const workDaysMap = {}; // { seqNo: Set(dates) }
    const hazardStats = {}; // { type: count }

    // 遍歷所有日誌
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[cols.DATE]) continue;

      const d = new Date(row[cols.DATE]);
      if (d.getFullYear() === year && (d.getMonth() + 1) === month) {

        const seqNo = row[cols.PROJECT_SEQ_NO];
        const workItem = row[cols.WORK_ITEM];
        const dateStr = Utilities.formatDate(d, 'GMT+8', 'yyyy-MM-dd');

        // 統計出工日數 (排除假日不施工)
        if (workItem !== '假日不施工' && seqNo) {
          if (!workDaysMap[seqNo]) {
            workDaysMap[seqNo] = new Set();
          }
          workDaysMap[seqNo].add(dateStr);

          // 統計危害類型
          const disasterStr = row[cols.DISASTER_TYPES];
          if (disasterStr) {
            const types = disasterStr.toString().split(/[,、]/); // 支援 comma or dunhao
            types.forEach(t => {
              const type = t.trim();
              if (type && type !== '無' && type !== '未填寫') {
                hazardStats[type] = (hazardStats[type] || 0) + 1;
              }
            });
          }
        }
      }
    }

    // 轉換出工日數為陣列
    const workDaysResult = [];
    for (const seq in workDaysMap) {
      workDaysResult.push({
        seqNo: seq,
        name: projectNames[seq] || seq,
        days: workDaysMap[seq].size
      });
    }

    // 排序：出工日數由多到少
    workDaysResult.sort((a, b) => b.days - a.days);

    // 轉換危害統計為陣列
    const hazardResult = Object.keys(hazardStats).map(key => ({
      type: key,
      count: hazardStats[key]
    })).sort((a, b) => b.count - a.count);

    return {
      workDays: workDaysResult,
      hazards: hazardResult,
      year: year,
      month: month
    };

  } catch (e) {
    Logger.log('getMonthlyDashboardData error: ' + e.toString());
    return { error: e.toString() };
  }
}
