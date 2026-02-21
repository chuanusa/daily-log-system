// ==========================================
// ?¿èº« mock google.script.run
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbwDuDK2BYwykf0Z-u2FNFwxqyu0NZbE4emYceSMAIa3oD5JRUB9zIzRHfbVxtHdEzfnlg/exec"; // è«‹æ›¿?›ç‚º?¨ç½²å¾Œç?ç¶²å?

const google = {
  script: {
    run: new Proxy({}, {
      get: function (target, prop) {
        // å¦‚æ?è«‹æ??„æ˜¯?‘å€‘è‡ªå®šç¾©?„æ–¹æ³•ï??´æ¥?å‚³
        if (prop === 'withSuccessHandler' || prop === 'withFailureHandler' || prop === 'successHandler' || prop === 'failureHandler') {
          return undefined; // ä¸æ?è©²ç›´?¥å??–é€™ä?
        }

        return function (...args) {
          const handlerObj = {
            successHandler: null,
            failureHandler: null,
            withSuccessHandler: function (callback) {
              this.successHandler = callback;
              // ?å‚³ä¸€??Proxy ä¾†æ??ªå?çºŒç??¹æ??¼å«ï¼ˆå³?Ÿæ­£??GAS ?½æ•¸ï¼?              return new Proxy(this, {
                get: (target, nextProp) => {
                  if (nextProp === 'withFailureHandler') return target.withFailureHandler.bind(target);
                  return (...nextArgs) => target.execute(nextProp, nextArgs);
                }
              });
            },
            withFailureHandler: function (callback) {
              this.failureHandler = callback;
              // ?å‚³ä¸€??Proxy ä¾†æ??ªå?çºŒç??¹æ??¼å«
              return new Proxy(this, {
                get: (target, nextProp) => {
                  if (nextProp === 'withSuccessHandler') return target.withSuccessHandler.bind(target);
                  return (...nextArgs) => target.execute(nextProp, nextArgs);
                }
              });
            },
            execute: async function (actionName, actionArgs) {
              try {
                console.log(`?¼é€?API è«‹æ?ï¼?{actionName}`, actionArgs);

                const response = await fetch(API_URL, {
                  method: 'POST',
                  body: JSON.stringify({
                    action: actionName,
                    args: actionArgs
                  })
                });

                const result = await response.json();
                console.log(`?¶åˆ° API ?æ?ï¼?{actionName}`, result);

                if (result.status === 'success') {
                  if (this.successHandler) {
                    this.successHandler(result.data);
                  }
                } else {
                  if (this.failureHandler) this.failureHandler(new Error(result.message));
                  else console.error("API Error:", result.message);
                }
              } catch (error) {
                if (this.failureHandler) this.failureHandler(error);
                else console.error("Fetch Error:", error);
              }
            }
          };

          // ?•ç?æ²’æ?ä½¿ç”¨ withSuccessHandler / withFailureHandler ?´æ¥?¼å«?„æ?æ³?          // ä¾‹å?: google.script.run.doSomething()
          handlerObj.execute(prop, args);
          return handlerObj;
        };
      }
    }),
    host: {
      close: function () {
        console.log("google.script.host.close() called");
      }
    }
  }
};


// --- From JS_Dashboard.html ---

// ============================================
// æ¯æ??€è¡¨æ¿?è¼¯ (JS_Dashboard)
// ============================================

let dashboardCharts = {};
let dashboardDataDate = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

// ?å???document.addEventListener('DOMContentLoaded', function () {
  renderDashboardSelectors();
  document.getElementById('dashYearSelect').addEventListener('change', updateDashboardData);
  document.getElementById('dashMonthSelect').addEventListener('change', updateDashboardData);
});

// æ¸²æ?å¹´ä»½?‡æ?ä»½é¸?‡å™¨
function renderDashboardSelectors() {
  const yearSelect = document.getElementById('dashYearSelect');
  const monthSelect = document.getElementById('dashMonthSelect');

  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  for (let y = currentYear; y >= currentYear - 2; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + 'å¹?;
    if (y === dashboardDataDate.year) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  monthSelect.innerHTML = '';
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m + '??;
    if (m === dashboardDataDate.month) opt.selected = true;
    monthSelect.appendChild(opt);
  }
}

function updateDashboardData() {
  dashboardDataDate.year = parseInt(document.getElementById('dashYearSelect').value);
  dashboardDataDate.month = parseInt(document.getElementById('dashMonthSelect').value);
  loadMonthlyDashboard();
}

function loadMonthlyDashboard() {
  showLoading();
  // ?¼å«å¾Œç«¯ getMonthlyDashboardData
  google.script.run
    .withSuccessHandler(function (data) {
      hideLoading();
      if (data.error) {
        showToast('è¼‰å…¥å¤±æ?: ' + data.error, true);
      } else {
        renderDashboardCharts(data);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¼‰å…¥?€è¡¨æ¿å¤±æ?ï¼? + error.message, true);
    })
    .getMonthlyDashboardData(dashboardDataDate.year, dashboardDataDate.month);
}

function renderDashboardCharts(data) {
  if (!document.getElementById('chart-work-days')) return;

  // 1. ?„å·¥ç¨‹å‡ºå·¥æ—¥??(Bar Chart)
  const ctxWork = document.getElementById('chart-work-days');

  if (dashboardCharts.workDays) dashboardCharts.workDays.destroy();

  // ?–å? 20 ?ä»¥?å¤ª??  const workData = data.workDays.slice(0, 20);
  const workLabels = workData.map(d => d.name);
  const workValues = workData.map(d => d.days);

  dashboardCharts.workDays = new Chart(ctxWork, {
    type: 'bar',
    data: {
      labels: workLabels,
      datasets: [{
        label: '?¬æ??ºå·¥?¥æ•¸ (å¤?',
        data: workValues,
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y', // æ°´å¹³?·æ???      responsive: true,
      plugins: {
        title: { display: true, text: `${data.year}å¹?{data.month}???„å·¥ç¨‹å‡ºå·¥æ—¥??(Top 20)` },
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true, stepSize: 1 }
      }
    }
  });

  // 2. ?±å®³çµ±è? (Bar/Pie Chart)
  const ctxHazard = document.getElementById('chart-hazards');

  if (dashboardCharts.hazards) dashboardCharts.hazards.destroy();

  const hazardLabels = data.hazards.map(h => h.type);
  const hazardValues = data.hazards.map(h => h.count);

  dashboardCharts.hazards = new Chart(ctxHazard, {
    type: 'bar', // ??'pie'
    data: {
      labels: hazardLabels,
      datasets: [{
        label: '?ºç¾æ¬¡æ•¸',
        data: hazardValues,
        backgroundColor: '#ef4444',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: `${data.year}å¹?{data.month}???´é??±å®³çµ±è?` },
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, stepSize: 1 }
      }
    }
  });
}


// --- From LogJavaScript.html ---

// ============================================
// ç¶œå??½å·¥??æ¯æ—¥å·¥ç??¥è?ç³»çµ± JavaScript v2.1
// ä¿®æ­£?¥æ?ï¼?025-01-18
// ============================================

// ============================================
// ?¨å?è®Šæ•¸
// ============================================
let allProjectsData = [];
let allInspectors = [];
let disasterOptions = [];
let currentUserInfo = null;
let currentHolidayInfo = null;
let currentSummaryData = [];
let filledDates = [];
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();
let currentMonthHolidays = {};
let allInspectorsWithStatus = [];
let isGuestMode = true;
let guestViewMode = 'tomorrow'; // ?°å?ï¼šé?è¨­è¨ªå®¢æª¢è¦–æ¨¡å¼?
// æª¢é??¡éƒ¨?€ç·¨è??ç¶´? å?
const DEPT_CODE_MAP = {
  '?Ÿæœ¨??: 'CV',
  'å»ºç???: 'AR',
  '?»æ°£??: 'EL',
  'æ©Ÿæ¢°??: 'ME',
  'ä¸­éƒ¨??: 'CT',
  '?—éƒ¨??: 'ST',
  'å§”å???€?: 'OS'
};

// ============================================
// ?å???- è¨ªå®¢æ¨¡å?
// ============================================
document.addEventListener('DOMContentLoaded', function () {
  initGuestMode();
});

function initGuestMode() {
  isGuestMode = true;
  currentUserInfo = null;
  showMainInterface();

  // ä½¿ç”¨ setTimeout ç¢ºä? DOM å®Œå…¨æ¸²æ?å¾Œå?è¼‰å…¥è³‡æ?
  setTimeout(() => {
    loadGuestData();
  }, 100);

  updateUIForGuestMode();
}

// ?°å?ï¼šå??›è¨ªå®¢æ—¥?Ÿæ¨¡å¼?(ä»Šæ—¥/?æ—¥)
function toggleGuestDate(mode) {
  guestViewMode = mode;

  // ?´æ–°?‰é?æ¨??
  const btnToday = document.getElementById('guestBtnToday');
  const btnTomorrow = document.getElementById('guestBtnTomorrow');

  if (btnToday && btnTomorrow) {
    if (mode === 'today') {
      btnToday.classList.add('active');
      btnTomorrow.classList.remove('active');

      const label = document.getElementById('guestProjectLabel');
      if (label) label.textContent = 'ä»Šæ—¥?½å·¥å·¥ç?';
    } else {
      btnToday.classList.remove('active');
      btnTomorrow.classList.add('active');

      const label = document.getElementById('guestProjectLabel');
      if (label) label.textContent = '?æ—¥?½å·¥å·¥ç?';
    }
  }

  // ?æ–°è¼‰å…¥è³‡æ?
  loadGuestData();
}

// ä¿®æ­£ï¼šå??´ç? loadGuestData ?½å?
function loadGuestData() {
  // ?ˆå??›åˆ°ç¸½è¡¨?ç±¤
  showSummaryTab();

  // ä½¿ç”¨ requestAnimationFrame ç¢ºä? DOM å®Œå…¨?´æ–°å¾Œå?è¨­å???  requestAnimationFrame(() => {
    // ?¹æ?æ¨¡å?è¨­å??®æ??¥æ?
    const targetDate = new Date();
    if (guestViewMode === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // ä¿®æ­£ï¼šä½¿?¨æœ¬?°æ??“æ ¼å¼å?ï¼Œé¿?æ??€?é?
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;

    const datePickerElement = document.getElementById('summaryDatePicker');

    if (datePickerElement) {
      datePickerElement.value = dateString;
      console.log('è¨ªå®¢æ¨¡å?ï¼šè¨­å®šç¸½è¡¨æ—¥?Ÿç‚º', dateString, 'æ¨¡å?:', guestViewMode);
    }

    // è¨­å?å·¥ç??€?‹ç‚º?Œæ–½å·¥ä¸­??    const statusRadios = document.querySelectorAll('input[name="summaryStatusFilter"]');
    statusRadios.forEach(radio => {
      if (radio.value === 'active') {
        radio.checked = true;
      } else {
        radio.checked = false;
      }
    });

    // è¨­å??¨é??ºã€Œå…¨?¨éƒ¨?€??    const deptFilter = document.getElementById('summaryDeptFilter');
    if (deptFilter) {
      deptFilter.value = 'all';
    }

    // ?æ¬¡ä½¿ç”¨ requestAnimationFrame ç¢ºä??€?‰è¨­å®šå??å??è??¥è???    requestAnimationFrame(() => {
      loadSummaryReport();
    });
  });
}

function checkLoginStatus() {
  showLoading();
  google.script.run
    .withSuccessHandler(function (session) {
      hideLoading();
      if (session.isLoggedIn) {
        currentUserInfo = session;
        isGuestMode = false;
        updateUIForLoggedIn();
        loadInitialData();
      } else {
        showToast('?»å…¥é©—è?å¤±æ?', true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('ç³»çµ±?¯èª¤ï¼? + error.message, true);
    })
    .getCurrentSession();
}

function showLoginInterface() {
  document.getElementById('loginModal').style.display = 'flex';
}

function hideLoginInterface() {
  document.getElementById('loginModal').style.display = 'none';
}

// ============================================
// å¿˜è?å¯†ç¢¼?Ÿèƒ½
// ============================================
function showForgotPasswordModal() {
  document.getElementById('forgotPasswordModal').style.display = 'flex';
  document.getElementById('forgotPasswordInput').value = '';
  document.getElementById('forgotPasswordInput').focus();
}

function closeForgotPasswordModal() {
  document.getElementById('forgotPasswordModal').style.display = 'none';
}

function submitForgotPassword() {
  const input = document.getElementById('forgotPasswordInput').value.trim();

  if (!input) {
    showToast('è«‹è¼¸?¥å¸³?Ÿæ?ä¿¡ç®±', true);
    return;
  }

  showLoading();
  closeForgotPasswordModal();

  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();
      if (result.success) {
        showToast('??' + result.message);
      } else {
        showToast(result.message, true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('?¼é€å¤±?—ï?' + error.message, true);
    })
    .sendTemporaryPassword(input);
}

function showMainInterface() {
  document.getElementById('loginContainer').style.display = 'none';
  document.getElementById('mainContainer').style.display = 'block';
  setupEventListeners();
}

function updateUIForGuestMode() {
  document.getElementById('userInfoPanel').style.display = 'none';
  document.getElementById('guestLoginBtn').style.display = 'flex';

  // ?±è?å°èˆª??  const tabs = document.querySelector('.tabs');
  if (tabs) tabs.style.display = 'none';

  // ?±è??€?‰é?ç±¤ï??ªé¡¯ç¤ºç¸½è¡?  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.style.display = 'none';
  });
  const summaryReport = document.getElementById('summaryReport');
  if (summaryReport) summaryReport.style.display = 'block';

  // é¡¯ç¤ºè¨ªå®¢æ¨¡å??¡ç?
  const guestCards = document.getElementById('guestSummaryCards');
  if (guestCards) guestCards.style.display = 'block';

  // ?±è??§åˆ¶?€ï¼ˆç¯©?¸å™¨ï¼?  const summaryControls = document.querySelector('.summary-controls');
  if (summaryControls) summaryControls.style.display = 'none';

  // ?±è? TBM-KY ?‡ä»¶?Ÿæ?
  const tbmkyCard = document.getElementById('tbmkyCard');
  if (tbmkyCard) tbmkyCard.style.display = 'none';

  // ç§»é™¤?¥æ?æ¨¡å??‰é?ï¼ˆè¨ªå®¢æ¨¡å¼å??¨ï?
  const calendarModeBtn = document.getElementById('calendarModeBtn');
  if (calendarModeBtn && calendarModeBtn.parentNode) {
    calendarModeBtn.parentNode.removeChild(calendarModeBtn);
  }
}

function updateUIForLoggedIn() {
  if (currentUserInfo) {
    document.getElementById('currentUserName').textContent = currentUserInfo.name;
    document.getElementById('currentUserRole').textContent = currentUserInfo.role;

    // é¡¯ç¤ºå°èˆª??    const tabs = document.querySelector('.tabs');
    if (tabs) tabs.style.display = 'flex';

    // é¡¯ç¤º?§åˆ¶?€ï¼ˆç¯©?¸å™¨ï¼?    const summaryControls = document.querySelector('.summary-controls');
    if (summaryControls) summaryControls.style.display = 'block';

    // ?±è?è¨ªå®¢æ¨¡å??¡ç?
    const guestCards = document.getElementById('guestSummaryCards');
    if (guestCards) guestCards.style.display = 'none';

    // é¡¯ç¤º TBM-KY ?‡ä»¶?Ÿæ?
    const tbmkyCard = document.getElementById('tbmkyCard');
    if (tbmkyCard) tbmkyCard.style.display = 'block';

    // ?æ–°æ·»å??¥æ?æ¨¡å??‰é?ï¼ˆå??œä?å­˜åœ¨?‡é??°å»ºç«‹ï?
    const modeToggle = document.getElementById('modeToggle');
    let calendarModeBtn = document.getElementById('calendarModeBtn');

    if (!calendarModeBtn && modeToggle) {
      // å¦‚æ??‰é?è¢«ç§»?¤ä?ï¼Œé??°å»ºç«?      calendarModeBtn = document.createElement('button');
      calendarModeBtn.id = 'calendarModeBtn';
      calendarModeBtn.className = 'mode-btn';
      calendarModeBtn.setAttribute('data-mode', 'calendar');
      calendarModeBtn.innerHTML = '<span>?? ?¥æ?æ¨¡å?</span>';
      modeToggle.appendChild(calendarModeBtn);
    } else if (calendarModeBtn) {
      calendarModeBtn.style.display = 'block';
    }

    // ç§»é™¤?€?‰é?ç±¤ç? inline styleï¼Œè? CSS é¡åˆ¥?§åˆ¶é¡¯ç¤º
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.style.display = '';
    });

    // å¡«è¡¨äººï??±è??¹å?å°èˆª??    if (currentUserInfo.role === 'å¡«è¡¨äº?) {
      document.querySelector('.tab-logStatus').style.display = 'none';
      document.querySelector('.tab-inspectorManagement').style.display = 'none';
      document.querySelector('.tab-userManagement').style.display = 'none';
    }
    document.getElementById('userInfoPanel').style.display = 'flex';
    document.getElementById('helpBtn').style.display = 'flex';
    document.getElementById('changePasswordBtn').style.display = 'flex';
    document.getElementById('logoutBtn').style.display = 'flex';
    document.getElementById('guestLoginBtn').style.display = 'none';

    // ?¹æ?è§’è‰²é¡¯ç¤º/?±è?ä½¿ç”¨?…ç®¡?†Tab
    const userManagementTab = document.querySelector('.tab[data-tab="userManagement"]');
    if (userManagementTab) {
      if (currentUserInfo.role === 'å¡«è¡¨äº?) {
        // å¡«è¡¨äººï??±è?ä½¿ç”¨?…ç®¡??        userManagementTab.style.display = 'none';
      } else {
        // è¶…ç?ç®¡ç??¡ã€è¯çµ¡å“¡ï¼šé¡¯ç¤ºä½¿?¨è€…ç®¡??        userManagementTab.style.display = 'flex';

        // ?´æ–°?‰é??‡å?
        const userManagementTitle = document.getElementById('userManagementTitle');
        if (userManagementTitle) {
          if (currentUserInfo.role === '?¯çµ¡??) {
            userManagementTitle.textContent = 'å¡«è¡¨äººç®¡??;
          } else {
            userManagementTitle.textContent = 'ä½¿ç”¨?…ç®¡??;
          }
        }
      }
    }
  }
}

// ============================================
// ä¿®æ­£2ï¼šå?ç¢¼é¡¯ç¤??±è??‡æ?
// ============================================
function togglePasswordVisibility() {
  const passwordInput = document.getElementById('loginPassword');
  const toggleIcon = document.getElementById('passwordToggleIcon');

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.textContent = '??';
  } else {
    passwordInput.type = 'password';
    toggleIcon.textContent = '??ï¸?;
  }
}

// ============================================
// ?»å…¥/?»å‡º?Ÿèƒ½
// ============================================
function handleLogin(event) {
  event.preventDefault();

  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!identifier || !password) {
    showToast('è«‹è¼¸?¥å¸³??ä¿¡ç®±?Œå?ç¢?, true);
    return;
  }

  showLoading();
  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();
      if (result.success) {
        currentUserInfo = result.user;
        isGuestMode = false;
        hideLoginInterface();
        updateUIForLoggedIn();
        showToast(result.message);
        setTimeout(() => {
          loadInitialData();
          // å¡«è¡¨äººç™»?¥å?æª¢æŸ¥?ªå¡«å¯«å·¥ç¨?          if (currentUserInfo.role === 'å¡«è¡¨äº?) {
            checkFillerReminders();
          }
        }, 500);
      } else {
        showToast(result.message, true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('?»å…¥å¤±æ?ï¼? + error.message, true);
    })
    .authenticateUser(identifier, password);
}

function handleLogout() {
  const confirmMessage = `
    <p><strong>?šª ç¢ºè??»å‡º</strong></p>
    <p>?¨ç¢ºå®šè??»å‡ºç³»çµ±?ï?</p>
    <p>?»å‡ºå¾Œå??²å…¥è¨ªå®¢æ¨¡å?</p>
  `;

  showConfirmModal(confirmMessage, function () {
    showLoading();
    google.script.run
      .withSuccessHandler(function (result) {
        hideLoading();
        if (result.success) {
          showToast(result.message);
          setTimeout(() => {
            location.reload();
          }, 1000);
        }
      })
      .withFailureHandler(function (error) {
        hideLoading();
        showToast('?»å‡ºå¤±æ?ï¼? + error.message, true);
      })
      .logoutUser();
    closeConfirmModal();
  });
}

// ============================================
// è®Šæ›´å¯†ç¢¼?Ÿèƒ½
// ============================================
function showRoleGuideModal() {
  const modal = document.getElementById('roleGuideModal');
  const fillerGuide = document.getElementById('fillerGuide');
  const contactGuide = document.getElementById('contactGuide');

  // ?¹æ?ä½¿ç”¨?…è??²é¡¯ç¤ºå??‰ç?èªªæ?
  if (currentUserInfo && currentUserInfo.role === '?¯çµ¡??) {
    fillerGuide.style.display = 'none';
    contactGuide.style.display = 'block';
  } else {
    // ?è¨­é¡¯ç¤ºå¡«è¡¨äººèªª??    fillerGuide.style.display = 'block';
    contactGuide.style.display = 'none';
  }

  modal.style.display = 'flex';
}

function closeRoleGuideModal() {
  document.getElementById('roleGuideModal').style.display = 'none';
}

function showChangePasswordModal() {
  document.getElementById('oldPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  document.getElementById('changePasswordModal').style.display = 'flex';
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').style.display = 'none';
}

function submitChangePassword() {
  const oldPassword = document.getElementById('oldPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  if (!oldPassword || !newPassword || !confirmPassword) {
    showToast('è«‹å¡«å¯«æ??‰æ?ä½?, true);
    return;
  }

  if (newPassword.length < 6) {
    showToast('?°å?ç¢¼é•·åº¦è‡³å°?6 ä½?, true);
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('?°å?ç¢¼è?ç¢ºè?å¯†ç¢¼ä¸ä???, true);
    return;
  }

  if (!currentUserInfo) {
    showToast('è«‹å??»å…¥', true);
    return;
  }

  showLoading();
  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();
      if (result.success) {
        showToast(result.message);
        closeChangePasswordModal();
      } else {
        showToast(result.message, true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è®Šæ›´å¯†ç¢¼å¤±æ?ï¼? + error.message, true);
    })
    .changeUserPassword(currentUserInfo.account, oldPassword, newPassword);
}

// ============================================
// å¡«è¡¨äººæœªå¡«å¯«?é??Ÿèƒ½
// ============================================
function checkFillerReminders() {
  if (!currentUserInfo || currentUserInfo.role !== 'å¡«è¡¨äº?) return;

  // Debugï¼šè¼¸??managedProjects è³‡è?
  console.log('[checkFillerReminders] currentUserInfo:', currentUserInfo);
  console.log('[checkFillerReminders] managedProjects type:', typeof currentUserInfo.managedProjects);
  console.log('[checkFillerReminders] managedProjects value:', currentUserInfo.managedProjects);

  // ç¢ºä? managedProjects ?¯å?ä¸²æ ¼å¼?  const managedProjectsStr = Array.isArray(currentUserInfo.managedProjects)
    ? currentUserInfo.managedProjects.join(',')
    : String(currentUserInfo.managedProjects || '');

  console.log('[checkFillerReminders] ?³é?çµ¦å?ç«¯ç?å­—ä¸²:', managedProjectsStr);

  google.script.run
    .withSuccessHandler(function (result) {
      console.log('[checkFillerReminders] å¾Œç«¯è¿”å?çµæ?:', result);
      if (result.unfilledProjects.length > 0 || result.incompleteProjects.length > 0) {
        showFillerReminderModal(result);
      }
    })
    .withFailureHandler(function (error) {
      console.error('æª¢æŸ¥?ªå¡«å¯«æ??’å¤±?—ï?' + error.message);
    })
    .getFillerReminders(managedProjectsStr);
}

function showFillerReminderModal(data) {
  const content = document.getElementById('fillerReminderContent');
  let html = '';

  if (data.unfilledProjects.length > 0) {
    html += `
      <div style="margin-bottom: 1.5rem;">
        <h4 style="color: var(--danger); margin-bottom: 1rem;">? ï? ?æ—¥ï¼?{data.tomorrowDate}ï¼‰å??ªå¡«å¯«ç?å·¥ç?ï¼?{data.unfilledProjects.length}ï¼?/h4>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${data.unfilledProjects.map(proj => `
            <div style="padding: 1rem; background: #fef2f2; border-left: 4px solid var(--danger); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #374151; margin-bottom: 0.25rem;">${proj.fullName}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">åºè?ï¼?{proj.seqNo} | ?¿æ”¬?†ï?${proj.contractor}</div>
              </div>
              <button class="btn btn-primary" onclick="goToLogEntry('${proj.seqNo}')" style="white-space: nowrap;">
                <span class="btn-icon">??</span>
                <span>?å?å¡«å¯«</span>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (data.incompleteProjects.length > 0) {
    html += `
      <div>
        <h4 style="color: var(--warning); margin-bottom: 1rem;">?? å·¥ç?è¨­å??ªå??´ï?${data.incompleteProjects.length}ï¼?/h4>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${data.incompleteProjects.map(proj => `
            <div style="padding: 1rem; background: #fffbeb; border-left: 4px solid var(--warning); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #374151; margin-bottom: 0.5rem;">${proj.fullName}</div>
                <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">åºè?ï¼?{proj.seqNo}</div>
                <div style="font-size: 0.875rem; color: var(--danger);">
                  ${proj.missingFields.join('??)} ?ªå¡«å¯?                </div>
              </div>
              <button class="btn btn-secondary" onclick="goToProjectSetup('${proj.seqNo}')" style="white-space: nowrap;">
                <span class="btn-icon">?™ï?</span>
                <span>?å?è¨­å?</span>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  content.innerHTML = html;
  document.getElementById('fillerReminderModal').style.display = 'flex';
}

function closeFillerReminderModal() {
  document.getElementById('fillerReminderModal').style.display = 'none';
}

function goToLogEntry(projectSeqNo) {
  // ?œé??é?è¦–ç?
  closeFillerReminderModal();

  // ?‡æ??°æ—¥èªŒå¡«?±é?ç±?  switchTab('logEntry');

  // ?ªå??¸æ?è©²å·¥ç¨?  setTimeout(() => {
    const projectSelect = document.getElementById('logProjectSelect');
    if (projectSelect) {
      projectSelect.value = projectSeqNo;

      // è§¸ç™¼ change äº‹ä»¶ä»¥è??¥å·¥ç¨‹è???      const event = new Event('change');
      projectSelect.dispatchEvent(event);

      // æ»¾å??°è¡¨?®é???      document.getElementById('logEntry').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 300);
}

function goToProjectSetup(projectSeqNo) {
  // ?œé??é?è¦–ç?
  closeFillerReminderModal();

  // ?‡æ??°å·¥ç¨‹è¨­å®šé?ç±?  switchTab('projectSetup');

  // ?¾åˆ°è©²å·¥ç¨‹å¡?‡ä¸¦æ»¾å??°è?çª—ä¸­
  setTimeout(() => {
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
      const seqNoElement = card.querySelector('[data-seq-no]');
      if (seqNoElement && seqNoElement.getAttribute('data-seq-no') === projectSeqNo) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // é«˜äº®è©²å¡?‡ï?æ·»å??­æš«?„å??«æ??œï?
        card.style.boxShadow = '0 0 0 3px var(--primary)';
        setTimeout(() => {
          card.style.boxShadow = '';
        }, 2000);
      }
    });
  }, 300);
}

function updateUnfilledCardsDisplay() {
  if (!currentUserInfo || currentUserInfo.role !== 'å¡«è¡¨äº?) {
    document.getElementById('unfilledCardsContainer').style.display = 'none';
    return;
  }

  google.script.run
    .withSuccessHandler(function (result) {
      const container = document.getElementById('unfilledCardsContainer');

      if (result.unfilledProjects.length === 0 && result.incompleteProjects.length === 0) {
        container.style.display = 'none';
        return;
      }

      let html = '';

      if (result.unfilledProjects.length > 0) {
        html += `
          <div class="alert-warning" style="margin-bottom: 1rem;">
            <strong>? ï? ?æ—¥ï¼?{result.tomorrowDate}ï¼‰å??ªå¡«å¯«ç?å·¥ç?ï¼?{result.unfilledProjects.length}ï¼?/strong>
            <div style="margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
              ${result.unfilledProjects.map(proj => `
                <div style="padding: 0.75rem; background: white; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                  <div style="flex: 1;">
                    <strong>${proj.fullName}</strong> - åºè?ï¼?{proj.seqNo}
                  </div>
                  <button class="btn btn-primary btn-sm" onclick="goToLogEntry('${proj.seqNo}')" style="white-space: nowrap; padding: 0.5rem 1rem; font-size: 0.875rem;">
                    ?? ?å?å¡«å¯«
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (result.incompleteProjects.length > 0) {
        html += `
          <div class="alert-info">
            <strong>?? å·¥ç?è¨­å??ªå??´ï?${result.incompleteProjects.length}ï¼?/strong>
            <div style="margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
              ${result.incompleteProjects.map(proj => `
                <div style="padding: 0.75rem; background: white; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                  <div style="flex: 1;">
                    <div><strong>${proj.fullName}</strong> - åºè?ï¼?{proj.seqNo}</div>
                    <div style="color: var(--danger); font-size: 0.875rem; margin-top: 0.25rem;">
                      ${proj.missingFields.join('??)} ?ªå¡«å¯?                    </div>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="goToProjectSetup('${proj.seqNo}')" style="white-space: nowrap; padding: 0.5rem 1rem; font-size: 0.875rem;">
                    ?™ï? ?å?è¨­å?
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
      container.style.display = 'block';
    })
    .withFailureHandler(function (error) {
      console.error('?´æ–°?é??€å¡Šå¤±?—ï?' + error.message);
    })
    .getFillerReminders(Array.isArray(currentUserInfo.managedProjects)
      ? currentUserInfo.managedProjects.join(',')
      : String(currentUserInfo.managedProjects || ''));
}

// ============================================
// äº‹ä»¶??½?¨è¨­ç½?// ============================================
function setupEventListeners() {
  // ?»å…¥è¡¨å–®
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // ?»å‡º?‰é?
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // ?ç±¤?‡æ?
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      const targetTab = this.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // ?¥è?å¡«å ±è¡¨å–®
  document.getElementById('dailyLogForm').addEventListener('submit', handleDailyLogSubmit);

  // ?¥æ??¸æ???- è¨­ç½®?ºæ?å¤?  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // ä¿®æ­£ï¼šä½¿?¨æœ¬?°æ??“æ ¼å¼å?
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  document.getElementById('logDatePicker').value = `${yyyy}-${mm}-${dd}`;


  // å·¥ç??¸æ?è®Šæ›´
  document.getElementById('logProjectSelect').addEventListener('change', handleProjectChange);

  // ?‡æ—¥?¸é?äº’æ–¥
  document.getElementById('isHolidayWork').addEventListener('change', function () {
    if (this.checked) {
      document.getElementById('isHolidayNoWork').checked = false;
      toggleWorkFields(false); // ?‡æ—¥?½å·¥ï¼šé¡¯ç¤ºæ??‰æ?ä½?    }
  });

  document.getElementById('isHolidayNoWork').addEventListener('change', function () {
    if (this.checked) {
      document.getElementById('isHolidayWork').checked = false;
      toggleWorkFields(true); // ?‡æ—¥ä¸æ–½å·¥ï??±è?æ¬„ä?
    } else {
      // ?–æ??‡æ—¥ä¸æ–½å·¥ï?é¡¯ç¤ºæ¬„ä?
      toggleWorkFields(false);
    }
  });

  // ä¿®æ­£7ï¼šæ–°å¢å·¥?…æ???  document.getElementById('addWorkItemBtn').addEventListener('click', addWorkItemPair);

  // ä¿®æ”¹æª¢é??¡æ???  document.getElementById('changeInspectorBtn').addEventListener('click', toggleInspectorEditMode);

  // ç¸½è¡¨?Ÿèƒ½
  document.getElementById('refreshSummary').addEventListener('click', loadSummaryReport);
  document.getElementById('summaryDatePicker').addEventListener('change', loadSummaryReport);
  document.querySelectorAll('input[name="summaryStatusFilter"]').forEach(radio => {
    radio.addEventListener('change', loadSummaryReport);
  });
  document.getElementById('summaryDeptFilter').addEventListener('change', loadSummaryReport);
  document.getElementById('summaryInspectorFilter').addEventListener('change', loadSummaryReport); // [?°å?]

  // ç¸½è¡¨æ¨¡å??‡æ?
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const mode = this.getAttribute('data-mode');
      switchSummaryMode(mode);
    });
  });

  // TBM-KY ?Ÿæ?
  document.getElementById('generateTBMKYBtn').addEventListener('click', openTBMKYModal);

  // ?¥è??€æ³?  document.getElementById('refreshLogStatus').addEventListener('click', loadLogStatus);

  // å·¥ç?è¨­å?
  document.getElementById('refreshProjectList').addEventListener('click', loadAndRenderProjectCards);
  document.querySelectorAll('input[name="projectStatusFilter"]').forEach(radio => {
    radio.addEventListener('change', loadAndRenderProjectCards);
  });
  document.getElementById('projectDeptFilter').addEventListener('change', loadAndRenderProjectCards);

  // å·¥ç??€?‹è??´ç›£??  const editProjectStatus = document.getElementById('editProjectStatus');
  if (editProjectStatus) {
    editProjectStatus.addEventListener('change', function () {
      const remarkGroup = document.getElementById('editStatusRemarkGroup');
      const remarkTextarea = document.getElementById('editStatusRemark');

      if (this.value !== '?½å·¥ä¸?) {
        remarkGroup.style.display = 'block';
        remarkTextarea.setAttribute('required', 'required');
      } else {
        remarkGroup.style.display = 'none';
        remarkTextarea.removeAttribute('required');
        remarkTextarea.value = '';
      }
    });
  }

  // æª¢é??¡ç®¡??  document.getElementById('addInspectorBtn').addEventListener('click', openAddInspectorModal);
  document.getElementById('refreshInspectorList').addEventListener('click', loadInspectorManagement);
  document.querySelectorAll('input[name="inspectorStatusFilter"]').forEach(radio => {
    radio.addEventListener('change', loadInspectorManagement);
  });
  document.getElementById('inspectorDeptFilter').addEventListener('change', loadInspectorManagement);

  // ?¥æ?è®Šæ›´?‚æª¢?¥å???  document.getElementById('logDatePicker').addEventListener('change', checkAndShowHolidayAlert);
}

// ============================================
// è¼‰å…¥?å?è³‡æ?
// ============================================
function loadInitialData() {
  showLoading();

  google.script.run
    .withSuccessHandler(function (data) {
      allProjectsData = data.projects || [];
      disasterOptions = data.disasters || [];
      allInspectors = data.inspectors || [];

      renderProjectSelect('logProjectSelect', allProjectsData, true);

      const depts = extractDepartments(allProjectsData);
      renderDepartmentFilters(depts);

      // [?°å?] è¼‰å…¥æª¢é??¡ç¯©?¸å™¨
      loadInspectorsForFilter();

      checkAndShowHolidayAlert();
      loadUnfilledCount();
      setupSummaryDate();
      loadFilledDates();

      hideLoading();

      // å¡«è¡¨äººï??´æ¥å½ˆå‡º?æ—¥?ªå¡«?±å·¥ç¨?      if (currentUserInfo && currentUserInfo.role === 'å¡«è¡¨äº?) {
        openFillerStartupModal();
      } else {
        // ?¶ä?è§’è‰²ï¼šé?è¨­é€²å…¥ç¸½è¡¨?ç±¤
        showSummaryTab();

        // è¨­å?å·¥ç??€?‹ç‚º?Œæ–½å·¥ä¸­??        const statusRadios = document.querySelectorAll('input[name="summaryStatusFilter"]');
        statusRadios.forEach(radio => {
          if (radio.value === 'active') {
            radio.checked = true;
          } else {
            radio.checked = false;
          }
        });

        // è¨­å??¨é??ºã€Œå…¨?¨éƒ¨?€??        document.getElementById('summaryDeptFilter').value = 'all';

        // è¼‰å…¥ç¸½è¡¨è³‡æ?
        loadSummaryReport();
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¼‰å…¥?å?è³‡æ?å¤±æ?ï¼? + error.message, true);
    })
    .loadLogSetupData();
}

function extractDepartments(projects) {
  // å¾?DEPT_CODE_MAP ?–å??€?‰å¯?¨ç??¨é?ï¼ˆç¢ºä¿æ??‰éƒ¨?€?½å¯?¸ï?
  const deptSet = new Set(Object.keys(DEPT_CODE_MAP));

  // ?Œæ?? å…¥å·¥ç?è³‡æ?ä¸­ç??¨é?ï¼ˆå?ä¸‹ç›¸å®¹ï?
  projects.forEach(p => {
    if (p.dept) {
      deptSet.add(p.dept);
    }
  });

  const deptArray = Array.from(deptSet);

  // ä¿®æ­£5ï¼šæ?åº?- ?Œé??å„ª?ˆï??Œå?å¤–ç›£? ã€æ?å¾?  deptArray.sort((a, b) => {
    const aIsTeam = a.includes('??);
    const bIsTeam = b.includes('??);

    if (aIsTeam && !bIsTeam) return -1;
    if (!aIsTeam && bIsTeam) return 1;

    if (a === 'å§”å???€? && b !== 'å§”å???€?) return 1;
    if (a !== 'å§”å???€? && b === 'å§”å???€?) return -1;

    return a.localeCompare(b, 'zh-TW');
  });

  return deptArray;
}

function renderDepartmentFilters(depts) {
  const summaryDeptFilter = document.getElementById('summaryDeptFilter');
  const projectDeptFilter = document.getElementById('projectDeptFilter');
  const inspectorDeptFilter = document.getElementById('inspectorDeptFilter');
  const addInspectorDept = document.getElementById('addInspectorDept');
  const editInspectorDept = document.getElementById('editInspectorDept');

  const filters = [summaryDeptFilter, projectDeptFilter, inspectorDeptFilter];
  const selects = [addInspectorDept, editInspectorDept];

  filters.forEach(filter => {
    if (filter) {
      const currentValue = filter.value;
      filter.innerHTML = '<option value="all">?¨éƒ¨?¨é?</option>';
      depts.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        filter.appendChild(option);
      });
      filter.value = currentValue;
    }
  });

  selects.forEach(select => {
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">è«‹é¸?‡éƒ¨?€</option>';
      depts.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
      });
      select.value = currentValue;
    }
  });
}

// ============================================
// ?ç±¤?‡æ?
// ============================================
function switchTab(tabName) {
  // è¨ªå®¢æ¨¡å?æ¬Šé?æª¢æŸ¥
  if (isGuestMode && tabName !== 'summaryReport') {
    showToast('è«‹å??»å…¥?èƒ½ä½¿ç”¨æ­¤å???, true);
    showLoginInterface();
    return;
  }

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');

  // é¡¯ç¤ºè®€?–ä¸­ï¼ˆé™¤äº†æ—¥èªŒå¡«?±é?ç±¤ï?
  if (tabName !== 'logEntry') {
    showLoading();
  }

  // è¼‰å…¥å°æ??ç±¤?„è???  switch (tabName) {
    case 'summaryReport':
      loadSummaryReport();
      break;
    case 'logEntry':
      // ?‡æ??°æ—¥èªŒå¡«?±æ?ï¼Œæ›´?°æ??’å?å¡?      if (currentUserInfo && currentUserInfo.role === 'å¡«è¡¨äº?) {
        updateUnfilledCardsDisplay();
      }
      break;
    case 'logStatus':
      loadLogStatus();
      break;
    case 'projectSetup':
      loadAndRenderProjectCards();
      break;
    case 'inspectorManagement':
      loadInspectorManagement();
      break;
    case 'userManagement':
      loadUserManagement();
      break;
    case 'dashboard':
      loadMonthlyDashboard();
      break;
  }
}

function showSummaryTab() {
  switchTab('summaryReport');
}

// ============================================
// ?‡æ—¥æª¢æŸ¥?‡æ?ç¤?// ============================================
function checkAndShowHolidayAlert() {
  const dateString = document.getElementById('logDatePicker').value;
  if (!dateString) return;

  // ?ç½®?¾é¸æ¡?  document.getElementById('checkSat').checked = false;
  document.getElementById('checkSun').checked = false;
  document.getElementById('checkHoliday').checked = false;

  // [ä¿®æ­£] ?Ÿç”¨?‡æ—¥?¾é¸æ¡?  document.getElementById('checkSat').disabled = false;
  document.getElementById('checkSun').disabled = false;
  document.getElementById('checkHoliday').disabled = false;

  google.script.run
    .withSuccessHandler(function (holidayInfo) {
      currentHolidayInfo = holidayInfo;

      const holidayAlert = document.getElementById('holidayAlert');
      const holidayDateInfo = document.getElementById('holidayDateInfo');
      const holidayRemark = document.getElementById('holidayRemark');
      const holidayWorkGroup = document.getElementById('holidayWorkGroup');
      const isHolidayNoWorkCheckbox = document.getElementById('isHolidayNoWork');
      const isHolidayWorkCheckbox = document.getElementById('isHolidayWork');

      // ?¤æ–·?Ÿæ?ä¸¦è‡ª?•å‹¾??UI
      const dateObj = new Date(dateString);
      const day = dateObj.getDay(); // 0 is Sunday, 6 is Saturday

      if (day === 6) document.getElementById('checkSat').checked = true;
      if (day === 0) document.getElementById('checkSun').checked = true;

      // ?¤æ–·?¯å¦?ºä???      if (holidayInfo.isHoliday && day !== 0 && day !== 6) {
        document.getElementById('checkHoliday').checked = true;
      }

      if (holidayInfo.isHoliday) {
        holidayAlert.style.display = 'block';
        holidayDateInfo.textContent = `${dateString} (?Ÿæ?${holidayInfo.weekday})`;
        holidayRemark.textContent = holidayInfo.remark || '?‡æ—¥';
        holidayWorkGroup.style.display = 'block';

        // [ä¿®æ­£] ?è¨­?¾é¸?‡æ—¥ä¸æ–½å·¥ï?ä½†å?è¨±ä¿®??        isHolidayNoWorkCheckbox.checked = true;
        isHolidayWorkCheckbox.checked = false;

        // ?±è??¶ä?æ¬„ä?
        toggleWorkFields(true);

        // ?ªå??äº¤?‡æ—¥ä¸æ–½å·¥è???        autoSubmitHolidayNoWork(dateString);
      } else {
        holidayAlert.style.display = 'none';
        holidayWorkGroup.style.display = 'none';

        // ?å??¥ï??–æ??¾é¸ä¸¦é¡¯ç¤ºæ?ä½?        isHolidayNoWorkCheckbox.checked = false;
        isHolidayWorkCheckbox.checked = false;
        toggleWorkFields(false);
      }
    })
    .withFailureHandler(function (error) {
      console.error('æª¢æŸ¥?‡æ—¥å¤±æ?ï¼?, error);
    })
    .checkHoliday(dateString);
}

// ============================================
// ?‡æ—¥?ªå??äº¤ä¸æ–½å·¥è???// ============================================
function autoSubmitHolidayNoWork(dateString) {
  // ?–å?å·¥ç?ä¸‹æ??¸å–®
  const projectSelect = document.getElementById('logProjectSelect');
  const projectOptions = projectSelect.options;

  if (projectOptions.length <= 1) {
    // æ²’æ??¯é¸å·¥ç?
    return;
  }

  // ?–å??€?‰å¯?¸å·¥ç¨‹ï??’é™¤ç¬¬ä???placeholderï¼?  const projects = [];
  for (let i = 1; i < projectOptions.length; i++) {
    const option = projectOptions[i];
    projects.push({
      seqNo: option.value,
      shortName: option.getAttribute('data-short-name') || option.text
    });
  }

  // æª¢æŸ¥?ªä?å·¥ç?å°šæœªå¡«å ±
  showLoading();
  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();

      const unfilledProjects = result.unfilledProjects || [];
      const alreadyFilledCount = result.alreadyFilledCount || 0;

      if (unfilledProjects.length === 0) {
        // ?€?‰å·¥ç¨‹éƒ½å·²å¡«??        showToast(`??${dateString} ?‡æ—¥ä¸æ–½å·¥è??„å·²?¨éƒ¨å®Œæ?ï¼?{alreadyFilledCount} ?…å·¥ç¨‹ï?`);
        return;
      }

      // ?¹æ¬¡?äº¤?ªå¡«?±å·¥ç¨‹ç??‡æ—¥ä¸æ–½å·¥è???      batchSubmitHolidayNoWork(dateString, unfilledProjects);
    })
    .withFailureHandler(function (error) {
      hideLoading();
      console.error('æª¢æŸ¥?‡æ—¥å¡«å ±?€?‹å¤±?—ï?', error);
    })
    .checkHolidayFilledStatus(dateString, projects);
}

function batchSubmitHolidayNoWork(dateString, projects) {
  if (projects.length === 0) {
    return;
  }

  let successCount = 0;
  let totalCount = projects.length;
  let errors = [];

  showLoading();

  // ?ä??äº¤
  projects.forEach((project, index) => {
    google.script.run
      .withSuccessHandler(function (result) {
        if (result.success) {
          successCount++;
        } else {
          errors.push(`${project.shortName}: ${result.message}`);
        }

        // ?€å¾Œä??‹å??æ?é¡¯ç¤ºçµæ?
        if (index === totalCount - 1) {
          hideLoading();
          if (successCount === totalCount) {
            showToast(`??å·²è‡ª?•å???${successCount} ?…å·¥ç¨‹ç??‡æ—¥ä¸æ–½å·¥è??„`);
          } else {
            showToast(`å®Œæ? ${successCount}/${totalCount} ?…å·¥ç¨‹ï?${errors.length} ?…å¤±?—`, errors.length > 0);
          }
          // ?æ–°è¼‰å…¥?ªå¡«?±æ•¸??          loadUnfilledCount();
        }
      })
      .withFailureHandler(function (error) {
        errors.push(`${project.shortName}: ${error.message}`);

        if (index === totalCount - 1) {
          hideLoading();
          showToast(`å®Œæ? ${successCount}/${totalCount} ?…å·¥ç¨‹ï?${errors.length} ?…å¤±?—`, true);
          loadUnfilledCount();
        }
      })
      .submitDailyLog({
        logDate: dateString,
        projectSeqNo: project.seqNo,
        projectShortName: project.shortName,
        isHolidayNoWork: true,
        isHolidayWork: false,
        inspectorIds: [],
        workersCount: 0,
        workItems: []
      });
  });
}

// ============================================
// å¡«è¡¨äººå??•ï?é¡¯ç¤º?æ—¥?ªå¡«?±å·¥ç¨?// ============================================
function openFillerStartupModal() {
  // ?‡æ??°æ—¥èªŒå¡«?±é?ç±?  switchTab('logEntry');

  // ç¢ºè?ä½¿ç”¨?…è?è¨?  if (!currentUserInfo || !currentUserInfo.managedProjects) {
    console.error('openFillerStartupModal: ?¡ä½¿?¨è€…è?è¨Šæ?ç®¡ç?å·¥ç?');
    showToast('?¡æ??–å?ä½¿ç”¨?…ç®¡?†å·¥ç¨‹è?è¨?, true);
    return;
  }

  console.log('[openFillerStartupModal] currentUserInfo =', currentUserInfo);
  console.log('[openFillerStartupModal] managedProjects type =', typeof currentUserInfo.managedProjects);
  console.log('[openFillerStartupModal] managedProjects value =', currentUserInfo.managedProjects);

  // ç¢ºä? managedProjects ?¯å?ä¸²æ ¼å¼?  const managedProjectsStr = Array.isArray(currentUserInfo.managedProjects)
    ? currentUserInfo.managedProjects.join(',')
    : String(currentUserInfo.managedProjects || '');

  console.log('[openFillerStartupModal] ?³é?çµ¦å?ç«¯ç?å­—ä¸²:', managedProjectsStr);

  // é¡¯ç¤º loading
  showLoading();

  // ä½¿ç”¨?°ç? getFillerReminders API
  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();

      console.log('[openFillerStartupModal] getFillerReminders è¿”å?çµæ?:', result);

      // æª¢æŸ¥?¯å¦?‰ä»»ä½•æœªå®Œæ??…ç›®
      const hasUnfilled = result.unfilledProjects && result.unfilledProjects.length > 0;
      const hasIncomplete = result.incompleteProjects && result.incompleteProjects.length > 0;

      console.log('[openFillerStartupModal] hasUnfilled:', hasUnfilled, '?ªå¡«å¯«æ•¸??', result.unfilledProjects ? result.unfilledProjects.length : 0);
      console.log('[openFillerStartupModal] hasIncomplete:', hasIncomplete, '?ªå??´æ•¸??', result.incompleteProjects ? result.incompleteProjects.length : 0);

      if (!hasUnfilled && !hasIncomplete) {
        showToast('???æ—¥?€?‰å·¥ç¨‹éƒ½å·²å¡«?±å??ï?');
        return;
      }

      // é¡¯ç¤º?é?å½ˆç?
      showFillerReminderModal(result);
    })
    .withFailureHandler(function (error) {
      hideLoading();
      console.error('[openFillerStartupModal] getFillerReminders å¤±æ?:', error);
      showToast('è¼‰å…¥?é?è³‡è?å¤±æ?ï¼? + error.message, true);
    })
    .getFillerReminders(managedProjectsStr);
}

function selectProjectAndStartLog(seqNo, shortName) {
  closeConfirmModal();

  // è¨­å?å·¥ç??¸æ???  const projectSelect = document.getElementById('logProjectSelect');
  projectSelect.value = seqNo;

  // è§¸ç™¼å·¥ç?è®Šæ›´äº‹ä»¶ä»¥è??¥æª¢é©—å“¡
  handleProjectChange();

  // æ»¾å??°è¡¨?®é???  setTimeout(() => {
    document.querySelector('.glass-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);

  showToast(`??å·²é¸?‡ï?${shortName}ï¼Œè?å¡«å¯«?¥è?`);
}

// ============================================
// å·¥ç??¸æ?è®Šæ›´
// ============================================
function handleProjectChange() {
  const projectSeqNo = document.getElementById('logProjectSelect').value;
  if (!projectSeqNo) return;

  // [ä¿®æ­£] ç¢ºä?æª¢é??¡è??™å·²è¼‰å…¥
  if (!allInspectors || allInspectors.length === 0) {
    showLoading();
    google.script.run
      .withSuccessHandler(function (inspectors) {
        allInspectors = inspectors || [];
        handleProjectChange();
      })
      .withFailureHandler(function (error) {
        hideLoading();
        showToast('è¼‰å…¥æª¢é??¡è??™å¤±?—ï?' + error.message, true);
      })
      .getAllInspectors();
    return;
  }

  const dateString = document.getElementById('logDatePicker').value;

  showLoading();
  google.script.run
    .withSuccessHandler(function (inspectorIds) {
      hideLoading();

      // é¡¯ç¤º?è¨­æª¢é???      if (inspectorIds && inspectorIds.length > 0) {
        displayDefaultInspectors(inspectorIds);
      } else {
        // æ²’æ??è¨­æª¢é??¡ï??´æ¥é¡¯ç¤º?¸æ?ä»‹é¢
        showInspectorCheckboxes(inspectorIds);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¼‰å…¥æª¢é??¡å¤±?—ï?' + error.message, true);
    })
    .getLastInspectors(projectSeqNo, dateString);
}

// é¡¯ç¤º?è¨­æª¢é???function displayDefaultInspectors(inspectorIds) {
  const displayDiv = document.getElementById('inspectorDisplay');
  const displayText = document.getElementById('inspectorDisplayText');
  const checkboxDiv = document.getElementById('inspectorCheckboxes');
  const changeBtn = document.getElementById('changeInspectorBtn');

  // ?–å?æª¢é??¡å?ç¨?  const inspectorNames = inspectorIds.map(id => {
    const inspector = allInspectors.find(ins => ins.id === id);
    return inspector ? inspector.name : id;
  }).join('??);

  displayText.innerHTML = `???è¨­æª¢é??¡ï?<strong>${inspectorNames}</strong>`;

  // é¡¯ç¤º?è¨­æª¢é??¡å???  displayDiv.style.display = 'block';
  changeBtn.style.display = 'inline-flex';

  // ?±è?è¤‡é¸æ¡†ï?ä½†ä??¶æ¸²?“ä»¥ä¿å??¸æ?
  renderInspectorCheckboxes('inspectorCheckboxes', inspectorIds);
  checkboxDiv.style.display = 'none';
}

// é¡¯ç¤ºæª¢é??¡è??¸æ?
function showInspectorCheckboxes(selectedIds) {
  const displayDiv = document.getElementById('inspectorDisplay');
  const checkboxDiv = document.getElementById('inspectorCheckboxes');
  const changeBtn = document.getElementById('changeInspectorBtn');

  displayDiv.style.display = 'none';
  checkboxDiv.style.display = 'grid';
  changeBtn.style.display = 'none';

  renderInspectorCheckboxes('inspectorCheckboxes', selectedIds || []);
}

// ?‡æ??°ä¿®?¹æ¨¡å¼?function toggleInspectorEditMode() {
  const checkboxDiv = document.getElementById('inspectorCheckboxes');
  const displayDiv = document.getElementById('inspectorDisplay');
  const changeBtn = document.getElementById('changeInspectorBtn');

  if (checkboxDiv.style.display === 'none') {
    // ?‡æ??°ç·¨è¼¯æ¨¡å¼?    checkboxDiv.style.display = 'grid';
    displayDiv.style.display = 'none';
    changeBtn.innerHTML = '<span>??ç¢ºè??¸æ?</span>';
  } else {
    // ?‡æ??é¡¯ç¤ºæ¨¡å¼?    const selectedIds = getSelectedInspectors('inspectorCheckboxes');
    if (selectedIds.length === 0) {
      showToast('è«‹è‡³å°‘é¸?‡ä?ä½æª¢é©—å“¡', true);
      return;
    }
    displayDefaultInspectors(selectedIds);
  }
}

// ============================================
// æª¢é??¡è??¸æ?æ¸²æ?ï¼ˆæ??¨é??†ç?ï¼?// ============================================
function renderInspectorCheckboxes(containerId, selectedIds) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  // ?‰éƒ¨?€?†ç?
  const inspectorsByDept = {};
  allInspectors.forEach(inspector => {
    const dept = inspector.dept || '?ªå?é¡?;
    if (!inspectorsByDept[dept]) {
      inspectorsByDept[dept] = [];
    }
    inspectorsByDept[dept].push(inspector);
  });

  // ä¿®æ­£5ï¼šéƒ¨?€?’å? - ?Œé??å„ª?ˆï??Œå?å¤–ç›£? ã€æ?å¾?  const deptNames = Object.keys(inspectorsByDept);
  deptNames.sort((a, b) => {
    const aIsTeam = a.includes('??);
    const bIsTeam = b.includes('??);

    if (aIsTeam && !bIsTeam) return -1;
    if (!aIsTeam && bIsTeam) return 1;

    if (a === 'å§”å???€? && b !== 'å§”å???€?) return 1;
    if (a !== 'å§”å???€? && b === 'å§”å???€?) return -1;

    return a.localeCompare(b, 'zh-TW');
  });

  deptNames.forEach(dept => {
    const deptHeader = document.createElement('div');
    deptHeader.className = 'dept-group-header';
    deptHeader.innerHTML = `<span>?¢ ${dept}</span>`;
    container.appendChild(deptHeader);

    inspectorsByDept[dept].forEach(inspector => {
      const checkboxDiv = document.createElement('div');
      checkboxDiv.className = 'checkbox-item';

      const isChecked = selectedIds.includes(inspector.id);
      const checkboxId = `inspector_${inspector.id}`;

      // é¡¯ç¤º?¼å?ï¼šå?å­??¨é?)
      const displayName = `${inspector.name}(${inspector.dept})`;

      checkboxDiv.innerHTML = `
        <input type="checkbox" id="${checkboxId}" value="${inspector.id}" ${isChecked ? 'checked' : ''}>
        <label for="${checkboxId}">${displayName}</label>
      `;

      container.appendChild(checkboxDiv);
    });
  });
}

function getSelectedInspectors(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  // ?³ä½¿å®¹å™¨è¢«éš±?ï?ä»ç„¶?¯ä»¥?²å??¸ä¸­?„è??¸æ?
  const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
  const selectedIds = Array.from(checkboxes).map(cb => cb.value);

  // å¦‚æ?æ²’æ??¸ä¸­?„ï??¯èƒ½?¯å??ºä½¿?¨ä??è¨­é¡¯ç¤ºæ¨¡å?
  // ?—è©¦å¾æ??‰è??¸æ?ä¸­æ‰¾?°å·²?¾é¸??  if (selectedIds.length === 0) {
    const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
    return Array.from(allCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
  }

  return selectedIds;
}

// [?°å?] è¼‰å…¥æª¢é??¡æ??®åˆ°ç¯©é¸??function loadInspectorsForFilter() {
  google.script.run
    .withSuccessHandler(function (inspectors) {
      const select = document.getElementById('summaryInspectorFilter');
      if (!select) return;

      // ä¿ç? "?¨éƒ¨æª¢é??? ?¸é?
      select.innerHTML = '<option value="all">?¨éƒ¨æª¢é???/option>';

      inspectors.forEach(inspector => {
        // ä½¿ç”¨ ID ä½œç‚º??        const option = document.createElement('option');
        option.value = inspector.id; // [ä¿®æ­£] idCode -> id
        option.textContent = inspector.name;
        select.appendChild(option);
      });
    })
    .withFailureHandler(function (err) {
      console.error('è¼‰å…¥æª¢é??¡å¤±??, err);
    })
    .getAllInspectors();
}

// ============================================
// ä¿®æ­£6&7ï¼šå·¥?…é?å°ï??«ç½å®³é??‹ã€Œå…¶ä»–ã€é¸?…ï?
// ============================================
function addWorkItemPair() {
  const container = document.getElementById('workItemsContainer');
  const pairCount = container.querySelectorAll('.work-item-pair').length + 1;

  const pairDiv = document.createElement('div');
  pairDiv.className = 'work-item-pair';

  pairDiv.innerHTML = `
    <div class="pair-header">
      <div class="pair-number">å·¥é? ${pairCount}</div>
      <button type="button" class="btn-remove" onclick="removeWorkItemPair(this)">??ç§»é™¤</button>
    </div>
    
    <div class="form-group">
      <label class="form-label">
        <span class="label-icon">??ï¸?/span>
        <span>å·¥ä?å·¥é? <span class="required">*</span></span>
      </label>
      <textarea class="form-textarea work-item-text" rows="2" required placeholder="è«‹æ?è¿°ä¸»è¦å·¥ä½œå…§å®?></textarea>
    </div>
    
    <div class="form-group">
      <label class="form-label">
        <span class="label-icon">? ï?</span>
        <span>?½å®³é¡å?ï¼ˆå¯å¤šé¸ï¼?<span class="required">*</span></span>
      </label>
      <div class="disaster-checkboxes-grid">
        ${renderDisasterCheckboxes(pairCount)}
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">
        <span class="label-icon">?›¡ï¸?/span>
        <span>?±å®³å°ç? <span class="required">*</span></span>
      </label>
      <textarea class="form-textarea countermeasures-text" rows="2" required placeholder="è«‹æ?è¿°å…·é«”ç??±å®³å°ç?"></textarea>
    </div>
    
    <div class="form-group">
      <label class="form-label">
        <span class="label-icon">??</span>
        <span>å·¥ä??°é? <span class="required">*</span></span>
      </label>
      <input type="text" class="form-input work-location-text" required placeholder="è«‹è¼¸?¥å…·é«”å·¥ä½œåœ°é»?>
    </div>
  `;

  container.appendChild(pairDiv);
  updatePairNumbers();
}

function renderDisasterCheckboxes(pairIndex) {
  let html = '';

  disasterOptions.forEach(disaster => {
    if (disaster.type === '?¶ä?') {
      // ä¿®æ­£6ï¼šã€Œå…¶ä»–ã€é¸?…ç‰¹æ®Šè???      const checkboxId = `disaster_${pairIndex}_other`;
      html += `
        <div class="disaster-checkbox-item">
          <input type="checkbox" id="${checkboxId}" value="?¶ä?" onchange="toggleCustomDisasterInput(this, ${pairIndex})">
          <label for="${checkboxId}">
            <div class="disaster-checkbox-title">${disaster.icon} ${disaster.type}</div>
            <div class="disaster-checkbox-desc">${disaster.description}</div>
          </label>
        </div>
      `;
    } else {
      const checkboxId = `disaster_${pairIndex}_${disaster.type.replace(/[?\/]/g, '_')}`;
      html += `
        <div class="disaster-checkbox-item">
          <input type="checkbox" id="${checkboxId}" value="${disaster.type}">
          <label for="${checkboxId}">
            <div class="disaster-checkbox-title">${disaster.icon} ${disaster.type}</div>
            <div class="disaster-checkbox-desc">${disaster.description}</div>
          </label>
        </div>
      `;
    }
  });

  // ä¿®æ­£6ï¼šè‡ªè¨‚ç½å®³é??‹è¼¸?¥æ?
  html += `
    <div id="customDisasterContainer_${pairIndex}" style="display: none; grid-column: 1 / -1;">
      <input type="text" id="customDisasterInput_${pairIndex}" class="custom-disaster-input" placeholder="è«‹è¼¸?¥è‡ªè¨‚ç½å®³é???>
    </div>
  `;

  return html;
}

// ä¿®æ­£6ï¼šå??›è‡ªè¨‚ç½å®³é??‹è¼¸?¥æ?
function toggleCustomDisasterInput(checkbox, pairIndex) {
  const container = document.getElementById(`customDisasterContainer_${pairIndex}`);
  const input = document.getElementById(`customDisasterInput_${pairIndex}`);

  if (checkbox.checked) {
    container.style.display = 'block';
    input.focus();
  } else {
    container.style.display = 'none';
    input.value = '';
  }
}

function removeWorkItemPair(button) {
  button.closest('.work-item-pair').remove();
  updatePairNumbers();
}

function updatePairNumbers() {
  const pairs = document.querySelectorAll('.work-item-pair');
  pairs.forEach((pair, index) => {
    pair.querySelector('.pair-number').textContent = `å·¥é? ${index + 1}`;
  });
}

function copyLastWorkItems() {
  const projectSeqNo = document.getElementById('logProjectSelect').value;

  if (!projectSeqNo) {
    showToast('è«‹å??¸æ?å·¥ç?', true);
    return;
  }

  showLoading();
  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();
      if (result.success && result.data) {
        const lastLog = result.data;

        // æ¸…ç©º?¾æ?å·¥ä??…ç›®
        const container = document.getElementById('workItemsContainer');
        container.innerHTML = '';

        // è¤‡è£½æ¯å€‹å·¥ä½œé???        lastLog.workItems.forEach((item, index) => {
          addWorkItemPair();

          const pair = container.querySelectorAll('.work-item-pair')[index];

          // å¡«å…¥å·¥ä?å·¥é?
          pair.querySelector('.work-item-text').value = item.workItem || '';

          // å¡«å…¥?±å®³å°ç?
          pair.querySelector('.countermeasures-text').value = item.countermeasures || '';

          // å¡«å…¥å·¥ä??°é?
          pair.querySelector('.work-location-text').value = item.location || '';

          // ?¾é¸?½å®³é¡å?
          if (item.disasters && item.disasters.length > 0) {
            item.disasters.forEach(disaster => {
              const pairIndex = index + 1;

              // ?•ç??Œå…¶ä»–ã€é¸??              if (disaster.includes('?¶ä?')) {
                const otherCheckbox = pair.querySelector(`#disaster_${pairIndex}_other`);
                if (otherCheckbox) {
                  otherCheckbox.checked = true;
                  toggleCustomDisasterInput(otherCheckbox, pairIndex);

                  // ?å??ªè??½å®³?§å®¹
                  const customText = disaster.replace('?¶ä?ï¼?, '').trim();
                  const customInput = pair.querySelector(`#customDisasterInput_${pairIndex}`);
                  if (customInput) customInput.value = customText;
                }
              } else {
                // ä¸€?¬ç½å®³é???                const checkbox = pair.querySelector(`input[type="checkbox"][value="${disaster}"]`);
                if (checkbox) checkbox.checked = true;
              }
            });
          }
        });

        showToast(`??å·²è?è£½ä?æ¬¡å¡«å¯«å…§å®¹ï?${lastLog.date}ï¼‰`);
      } else {
        showToast(result.message || 'æ­¤å·¥ç¨‹å??¡æ­·?²å¡«?±è???, true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¤‡è£½å¤±æ?ï¼? + error.message, true);
    })
    .getLastLogForProject(projectSeqNo);
}

function toggleWorkFields(hide) {
  const inspectorGroup = document.getElementById('inspectorGroup');
  const workersCountGroup = document.getElementById('workersCountGroup');
  const workItemsGroup = document.getElementById('workItemsGroup');

  if (hide) {
    inspectorGroup.style.display = 'none';
    workersCountGroup.style.display = 'none';
    workItemsGroup.style.display = 'none';
  } else {
    inspectorGroup.style.display = 'block';
    workersCountGroup.style.display = 'block';
    workItemsGroup.style.display = 'block';
  }
}

// ============================================
// ?¥è??äº¤
// ============================================
function handleDailyLogSubmit(event) {
  event.preventDefault();

  const logDate = document.getElementById('logDatePicker').value;
  const projectSeqNo = document.getElementById('logProjectSelect').value;

  // é©—è?å¿…å¡«æ¬„ä?
  if (!projectSeqNo) {
    showToast('è«‹é¸?‡å·¥ç¨?, true);
    return;
  }

  const projectSelect = document.getElementById('logProjectSelect');
  const projectShortName = projectSelect.selectedOptions[0] ?
    projectSelect.selectedOptions[0].getAttribute('data-short-name') : '';

  const isHolidayNoWork = document.getElementById('isHolidayNoWork').checked;

  // ?‡æ—¥ä¸æ–½å·?  if (isHolidayNoWork) {
    const confirmMessage = `
      <p><strong>??ï¸??‡æ—¥ä¸æ–½å·?/strong></p>
      <p><strong>?? ?¥æ?ï¼?/strong>${logDate}</p>
      <p><strong>??ï¸?å·¥ç?ï¼?/strong>${document.getElementById('logProjectSelect').selectedOptions[0].text}</p>
      <p style="margin-top: 1rem; color: var(--info);">ç¢ºè??äº¤?‡æ—¥ä¸æ–½å·¥è??„å?ï¼?/p>
    `;

    showConfirmModal(confirmMessage, function () {
      showLoading();
      executeSubmitDailyLog({
        logDate: logDate,
        projectSeqNo: projectSeqNo,
        projectShortName: projectShortName,
        isHolidayNoWork: true,
        isHolidayWork: false,
        inspectorIds: [],
        workersCount: 0,
        workItems: []
      });
      closeConfirmModal();
    });
    return;
  }

  // ä¸€?¬æ—¥èª?  const inspectorIds = getSelectedInspectors('inspectorCheckboxes');
  const workersCount = document.getElementById('logWorkersCount').value;
  const isHolidayWork = document.getElementById('isHolidayWork').checked;

  if (inspectorIds.length === 0) {
    showToast('è«‹è‡³å°‘é¸?‡ä?ä½æª¢é©—å“¡', true);
    return;
  }

  if (!workersCount || workersCount <= 0) {
    showToast('è«‹å¡«å¯«æ–½å·¥äºº??, true);
    return;
  }

  const workItems = collectWorkItems();
  if (workItems.length === 0) {
    showToast('è«‹è‡³å°‘å¡«å¯«ä?çµ„å·¥?…è???, true);
    return;
  }

  // ?–å?æª¢é??¡å?ç¨±ç”¨?¼ç¢ºèªè???  const inspectorNames = inspectorIds.map(id => {
    const inspector = allInspectors.find(ins => ins.id === id);
    return inspector ? inspector.name : id;
  }).join('??);

  // ?Ÿæ?å·¥é?è©³ç´°è³‡è?
  let workItemsDetail = '';
  workItems.forEach((item, index) => {
    const disasterText = (item.disasterTypes || []).join('??);
    const workItemName = item.workItem || '?ªå‘½?å·¥??;
    workItemsDetail += `
      <div style="margin-left: 1rem; margin-bottom: 0.5rem; padding: 0.5rem; background: var(--gray-50); border-left: 3px solid var(--primary); border-radius: var(--radius-sm);">
        <strong>å·¥é? ${index + 1}ï¼?/strong>${workItemName}<br>
        <span style="font-size: 0.9rem; color: var(--text-secondary);">?½å®³é¡å?ï¼?{disasterText}</span>
      </div>
    `;
  });

  const confirmMessage = `
    <div style="max-height: 60vh; overflow-y: auto;">
      <p><strong>?? ?¥æ?ï¼?/strong>${logDate}</p>
      <p><strong>??ï¸?å·¥ç?ï¼?/strong>${document.getElementById('logProjectSelect').selectedOptions[0].text}</p>
      ${isHolidayWork ? '<p style="color: var(--warning); font-weight: 700;">??ï¸??‡æ—¥?½å·¥</p>' : ''}
      <p><strong>?‘¥ æª¢é??¡ï?</strong>${inspectorNames}</p>
      <p><strong>???ğ???½å·¥äººæ•¸ï¼?/strong>${workersCount} äº?/p>
      <p style="margin-top: 1rem;"><strong>?? å·¥ä??…ç›®?ç´°ï¼?/strong></p>
      ${workItemsDetail}
      <p style="margin-top: 1.5rem; padding: 1rem; background: rgba(234, 88, 12, 0.1); border-radius: var(--radius); color: var(--warning-dark); font-weight: 600; text-align: center;">
        ? ï? ç¢ºè??äº¤?¥è??ï?
      </p>
    </div>
  `;

  showConfirmModal(confirmMessage, function () {
    showLoading();
    executeSubmitDailyLog({
      logDate: logDate,
      projectSeqNo: projectSeqNo,
      projectShortName: projectShortName,
      isHolidayNoWork: false,
      isHolidayWork: isHolidayWork,
      inspectorIds: inspectorIds,
      workersCount: parseInt(workersCount),
      workItems: workItems
    });
    closeConfirmModal();
  });
}

function collectWorkItems() {
  const workItems = [];
  const pairs = document.querySelectorAll('.work-item-pair');

  pairs.forEach((pair, index) => {
    const workItemText = pair.querySelector('.work-item-text').value.trim();
    const countermeasuresText = pair.querySelector('.countermeasures-text').value.trim();
    const workLocationText = pair.querySelector('.work-location-text').value.trim();

    const disasterCheckboxes = pair.querySelectorAll('.disaster-checkboxes-grid input[type="checkbox"]:checked');
    let disasterTypes = Array.from(disasterCheckboxes).map(cb => cb.value);

    // ä¿®æ­£6ï¼šè??†è‡ªè¨‚ç½å®³é???    if (disasterTypes.includes('?¶ä?')) {
      const pairIndex = index + 1;
      const customInput = document.getElementById(`customDisasterInput_${pairIndex}`);
      if (customInput && customInput.value.trim()) {
        // ç§»é™¤?Œå…¶ä»–ã€ï?? å…¥?ªè?é¡å?
        disasterTypes = disasterTypes.filter(d => d !== '?¶ä?');
        disasterTypes.push(`?¶ä?:${customInput.value.trim()}`);
      }
    }

    if (workItemText && disasterTypes.length > 0 && countermeasuresText && workLocationText) {
      workItems.push({
        workItem: workItemText,
        disasterTypes: disasterTypes,
        countermeasures: countermeasuresText,
        workLocation: workLocationText
      });
    }
  });

  return workItems;
}

function executeSubmitDailyLog(data) {
  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();
      if (result.success) {
        showToast(`??${result.message}`);




        document.getElementById('dailyLogForm').reset();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // ä¿®æ­£ï¼šä½¿?¨æœ¬?°æ??“æ ¼å¼å?
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        document.getElementById('logDatePicker').value = `${yyyy}-${mm}-${dd}`;

        document.getElementById('workItemsContainer').innerHTML = '';




        checkAndShowHolidayAlert();
        loadUnfilledCount();
      } else {
        showToast('?äº¤å¤±æ?ï¼? + result.message, true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
    })
    .submitDailyLog(data);
}

// ============================================
// ?ªå¡«å¯«æ•¸?çµ±è¨?// ============================================
function loadUnfilledCount() {
  google.script.run
    .withSuccessHandler(function (data) {
      const container = document.getElementById('unfilledCardsContainer');

      if (data.unfilled > 0 && data.unfilledProjects) {
        // æ¸²æ?å¤šå€‹å¡??        renderUnfilledCards(data.unfilledProjects, data.date);
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    })
    .withFailureHandler(function (error) {
      console.error('è¼‰å…¥?ªå¡«å¯«æ•¸?å¤±?—ï?', error);
    })
    .getUnfilledCount();
}

// æ¸²æ??ªå¡«å¯«æ??’å¡??function renderUnfilledCards(projects, date) {
  const container = document.getElementById('unfilledCardsContainer');
  container.innerHTML = '';

  const gridDiv = document.createElement('div');
  gridDiv.className = 'unfilled-cards-grid';

  projects.forEach((project, index) => {
    const card = document.createElement('div');
    card.className = 'unfilled-card';
    card.onclick = function () {
      // é»æ??¡ç?å¾Œå¡«?¥è©²å·¥ç?ä¸¦é?å§‹å¡«??      fillProjectAndStartLog(project.seqNo, project.shortName);
    };

    card.innerHTML = `
      <div class="unfilled-card-header">
        <div class="unfilled-card-icon">? ï?</div>
        <div class="unfilled-card-title">å¾…å¡«??#${index + 1}</div>
      </div>
      <div class="unfilled-card-body">
        <div class="unfilled-card-info">
          <strong>?¥æ?ï¼?/strong><span>${date}</span>
        </div>
        <div class="unfilled-card-info">
          <strong>å·¥ç?ï¼?/strong><span>${project.shortName}</span>
        </div>
        <div class="unfilled-card-info">
          <strong>?¿æ”¬?†ï?</strong><span>${project.contractor}</span>
        </div>
        <div class="unfilled-card-info">
          <strong>?¨é?ï¼?/strong><span>${project.dept}</span>
        </div>
      </div>
      <div class="unfilled-card-footer">
        é»æ??‹å?å¡«å ±
      </div>
    `;

    gridDiv.appendChild(card);
  });

  container.appendChild(gridDiv);
}

// å¡«å…¥å·¥ç?ä¸¦é?å§‹å¡«??function fillProjectAndStartLog(seqNo, shortName) {
  const projectSelect = document.getElementById('logProjectSelect');
  projectSelect.value = seqNo;

  // è§¸ç™¼å·¥ç?è®Šæ›´äº‹ä»¶ä»¥è??¥æª¢é©—å“¡
  handleProjectChange();

  // æ»¾å??°è¡¨?®é???  document.querySelector('.glass-card').scrollIntoView({ behavior: 'smooth', block: 'start' });

  showToast(`å·²é¸?‡ï?${shortName}ï¼Œè?ç¹¼ç?å¡«å¯«?¥è?`);
}

// ============================================
// ç¸½è¡¨?Ÿèƒ½
// ============================================




function setupSummaryDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // ä¿®æ­£ï¼šä½¿?¨æœ¬?°æ??“æ ¼å¼å?
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  document.getElementById('summaryDatePicker').value = `${yyyy}-${mm}-${dd}`;
}




function formatInspectorDisplay(inspectorText, inspectorDetails) {
  if (!inspectorText || inspectorText === '-') {
    return '-';
  }

  // å¦‚æ??‰è©³ç´°è?è¨Šï?inspectorDetails ?¯é™£?—ï??…å« {name, profession, dept}ï¼?  if (inspectorDetails && Array.isArray(inspectorDetails) && inspectorDetails.length > 0) {
    return inspectorDetails.map(ins => {
      const isOutsource = ins.dept === 'å§”å???€?;
      return `${ins.name}(${ins.profession})${isOutsource ? 'å§? : ''}`;
    }).join('??);
  }

  // å¦‚æ?æ²’æ?è©³ç´°è³‡è?ï¼Œç›´?¥è??å??‡å?
  return inspectorText;
}

function loadSummaryReport() {
  const dateString = document.getElementById('summaryDatePicker').value;
  if (!dateString) {
    showToast('è«‹é¸?‡æ—¥??, true);
    return;
  }

  const filterStatus = document.querySelector('input[name="summaryStatusFilter"]:checked').value;
  const filterDept = document.getElementById('summaryDeptFilter').value;
  const filterInspector = document.getElementById('summaryInspectorFilter').value; // [?°å?] ?–å?æª¢é??¡ç¯©?¸å€?
  showLoading();
  google.script.run

    .withSuccessHandler(function (summaryData) {
      hideLoading();
      currentSummaryData = summaryData;
      renderSummaryTable(summaryData);

      // [?°å?] ?Œæ­¥æ¸²æ??‹æ??ˆå¡?‡è???      renderMobileSummary(summaryData);

      // ?´æ–°è¨ªå®¢æ¨¡å??¡ç?
      if (isGuestMode) {
        updateGuestSummaryCards(dateString, summaryData);
      }
    })







    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¼‰å…¥ç¸½è¡¨å¤±æ?ï¼? + error.message, true);
    })
    .getDailySummaryReport(dateString, filterStatus, filterDept, filterInspector, isGuestMode, currentUserInfo);
}

// [?°å?] æ¸²æ?æª¢é??¡ç¯©?¸é¸??function renderInspectorFilter() {
  const select = document.getElementById('summaryInspectorFilter');
  if (!select) return;

  // æ¸…ç©º?¸é? (ä¿ç??è¨­)
  select.innerHTML = '<option value="all">?¨éƒ¨æª¢é???/option>';

  // ?–å??€?‰æª¢é©—å“¡ (å·²åœ¨?¨å?è®Šæ•¸ allInspectors)
  // ?’å?ï¼šé? -> å§”å?
  const sortedInspectors = [...allInspectors].sort((a, b) => {
    const aIsTeam = a.dept && a.dept.includes('??);
    const bIsTeam = b.dept && b.dept.includes('??);
    if (aIsTeam && !bIsTeam) return -1;
    if (!aIsTeam && bIsTeam) return 1;
    return a.dept.localeCompare(b.dept, 'zh-TW') || a.name.localeCompare(b.name, 'zh-TW');
  });

  sortedInspectors.forEach(ins => {
    if (ins.status === 'active') { // ?ªé¡¯ç¤ºå??¨ä¸­??      const option = document.createElement('option');
      option.value = ins.id;
      option.textContent = `${ins.name} (${ins.dept})`;
      select.appendChild(option);
    }
  });
}

// [?°å?] æ¸²æ?æª¢é??¡ç¯©?¸é¸??function renderInspectorFilter() {
  const select = document.getElementById('summaryInspectorFilter');
  if (!select) return;

  // æ¸…ç©º?¸é? (ä¿ç??è¨­)
  select.innerHTML = '<option value="all">?¨éƒ¨æª¢é???/option>';

  // ?–å??€?‰æª¢é©—å“¡ (å·²åœ¨?¨å?è®Šæ•¸ allInspectors)
  // ?’å?ï¼šé? -> å§”å?
  const sortedInspectors = [...allInspectors].sort((a, b) => {
    const aIsTeam = a.dept && a.dept.includes('??);
    const bIsTeam = b.dept && b.dept.includes('??);
    if (aIsTeam && !bIsTeam) return -1;
    if (!aIsTeam && bIsTeam) return 1;
    return a.dept.localeCompare(b.dept, 'zh-TW') || a.name.localeCompare(b.name, 'zh-TW');
  });

  sortedInspectors.forEach(ins => {
    if (ins.status === 'active') { // ?ªé¡¯ç¤ºå??¨ä¸­??      const option = document.createElement('option');
      option.value = ins.id;
      option.textContent = `${ins.name} (${ins.dept})`;
      select.appendChild(option);
    }
  });
}

function updateGuestSummaryCards(dateString, summaryData) {
  // ?´æ–°?¥æ?é¡¯ç¤º
  const guestDateDisplay = document.getElementById('guestDateDisplay');
  if (guestDateDisplay) {
    guestDateDisplay.textContent = dateString;
  }

  // è¨ˆç??¶æ—¥?‰å¡«?±ç?å·¥ç??¸ï??’é™¤?ªå¡«?±ç?ï¼?  const filledCount = summaryData.filter(row => row.hasFilled).length;

  // ?´æ–°å·¥ç??¸é¡¯ç¤?  const guestProjectCount = document.getElementById('guestProjectCount');
  if (guestProjectCount) {
    guestProjectCount.textContent = filledCount;
  }
}

function renderSummaryTable(summaryData) {
  const tbody = document.getElementById('summaryTableBody');
  const thead = document.getElementById('summaryTableHead');

  // ?¹æ??»å…¥?€?‹èª¿?´è¡¨??  if (isGuestMode) {
    // è¨ªå®¢æ¨¡å?ï¼šä?é¡¯ç¤ºåºè??Œæ?ä½?    thead.innerHTML = `
      <tr>
        <th>å·¥ç??ç¨±</th>
        <th>?¿æ”¬??/th>
        <th>?¨é?</th>
        <th>æª¢é???/th>
        <th>å·¥åœ°è² è²¬äº?/th>
        <th>?·å?äººå“¡</th>
        <th>å·¥ä??°å?</th>
        <th>?½å·¥äººæ•¸</th>
        <th>ä¸»è?å·¥ä??…ç›®</th>
        <th>ä¸»è??½å®³é¡å?</th>
      </tr>
    `;
  } else {
    // å·²ç™»?¥ï?é¡¯ç¤ºå®Œæ•´æ¬„ä?
    thead.innerHTML = `
      <tr>
        <th>åºè?</th>
        <th>å·¥ç??ç¨±</th>
        <th>?¿æ”¬??/th>
        <th>?¨é?</th>
        <th>æª¢é???/th>
        <th>å·¥åœ°è² è²¬äº?/th>
        <th>?·å?äººå“¡</th>
        <th>å·¥ä??°å?</th>
        <th>?½å·¥äººæ•¸</th>
        <th>ä¸»è?å·¥ä??…ç›®</th>
        <th>ä¸»è??½å®³é¡å?</th>
        <th>?ä?</th>
      </tr>
    `;
  }

  const colspanCount = isGuestMode ? 10 : 12;

  if (summaryData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colspanCount}" class="text-muted">?¥ç„¡è³‡æ?</td></tr>`;
    return;
  }

  tbody.innerHTML = '';

  summaryData.forEach(row => {
    const isClickable = !isGuestMode && (row.hasFilled || row.projectStatus === '?½å·¥ä¸?);
    const inspectorText = formatInspectorDisplay(row.inspectors, row.inspectorDetails) || '-';
    const workersCountText = row.isHolidayNoWork ? '-' : (row.workersCount || '-');
    const holidayBadge = row.isHolidayWork ?
      '<span class="status-badge-holiday-work" style="margin-left: 0.5rem;">??ï¸??‡æ—¥?½å·¥</span>' : '';

    // ?¼å??–è·å®‰äºº?¡é¡¯ç¤ºï?å§“å?(è­‰ç…§) ??å§“å?
    const safetyOfficerText = row.safetyLicense ? `${row.safetyOfficer}(${row.safetyLicense})` : row.safetyOfficer;

    // ?¤æ–·?¯å¦?€è¦å??²å·¥ä½œé???    let workItems = [];

    if (row.isHolidayNoWork) {
      // ?‡æ—¥ä¸æ–½å·¥ï??®ä???      workItems = [{
        text: '??ï¸??‡æ—¥ä¸æ–½å·?,
        disasters: '??,
        isBadge: true
      }];
    } else if (row.workItems && row.workItems.length > 0) {
      // ?‰å·¥ä½œé??®ï?æ¯å€‹å·¥ä½œé??®å??‰è‡ªå·±ç??½å®³é¡å?
      workItems = row.workItems.map(wi => ({
        text: wi.text || '',
        disasters: wi.disasters && wi.disasters.length > 0 ? wi.disasters.join('??) : '??,
        countermeasures: wi.countermeasures || '',
        workLocation: wi.workLocation || ''
      }));
    } else {
      // ?ªå¡«å¯«ï??®ä???      workItems = [{
        text: '?ªå¡«å¯?,
        disasters: '?ªå¡«å¯?,
        isEmpty: true
      }];
    }

    // è¨ˆç??€è¦å?ä½µç??—æ•¸
    const rowspan = workItems.length;

    // ?Ÿæ?æ¯å€‹å·¥ä½œé??®ç???    workItems.forEach((workItem, idx) => {
      const tr = document.createElement('tr');

      // æ·»å?æ¨??é¡åˆ¥
      if (row.hasFilled) {
        tr.classList.add('filled-row');
      } else if (row.projectStatus === '?½å·¥ä¸?) {
        tr.classList.add('empty-row');
      }

      // [?°å?] æ¨™è??€å¾Œä??‹é??®ï??¨æ–¼ CSS ?Šæ??•ç?
      if (idx === workItems.length - 1) {
        tr.classList.add('is-last-item');
      }

      // ç¬¬ä??—å??«æ??‰å?ä½µç?æ¬„ä?
      if (idx === 0) {
        if (isClickable) {
          tr.style.cursor = 'pointer';
          tr.onclick = function () {
            if (row.hasFilled) {
              openEditSummaryLogModal(row);
            } else {
              openLogEntryForProject(row.seqNo, row.fullName);
            }
          };
        }

        if (isGuestMode) {
          // è¨ªå®¢æ¨¡å?
          tr.innerHTML = `
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);"><strong>${row.fullName}</strong>${holidayBadge}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${row.contractor}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${row.dept}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${inspectorText}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${row.resp}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${safetyOfficerText}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${truncateText(row.address, 20)}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${workersCountText}</td>
            <td style="border-top: 2px solid rgba(0,0,0,0.15); white-space: normal; word-wrap: break-word;">${workItem.isBadge ? '<span class="status-badge-holiday-no">' + workItem.text + '</span>' : (workItem.isEmpty ? '<span class="unfilled-text">' + workItem.text + '</span>' : workItem.text)}</td>
            <td style="border-top: 2px solid rgba(0,0,0,0.15); white-space: normal; word-wrap: break-word;">${workItem.isEmpty ? '<span class="unfilled-text">' + workItem.disasters + '</span>' : workItem.disasters}</td>
          `;
        } else {
          // å·²ç™»?¥æ¨¡å¼?          tr.innerHTML = `
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${row.seqNo}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);"><strong>${row.fullName}</strong>${holidayBadge}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${row.contractor}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${row.dept}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${inspectorText}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${row.resp}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${safetyOfficerText}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${truncateText(row.address, 20)}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">${workersCountText}</td>
            <td style="border-top: 2px solid rgba(0,0,0,0.15); white-space: normal; word-wrap: break-word;">${workItem.isBadge ? '<span class="status-badge-holiday-no">' + workItem.text + '</span>' : (workItem.isEmpty ? '<span class="unfilled-text">' + workItem.text + '</span>' : workItem.text)}</td>
            <td style="border-top: 2px solid rgba(0,0,0,0.15); white-space: normal; word-wrap: break-word;">${workItem.isEmpty ? '<span class="unfilled-text">' + workItem.disasters + '</span>' : workItem.disasters}</td>
            <td rowspan="${rowspan}" style="border-right: 1px solid rgba(0,0,0,0.08);">
              ${isClickable ? (row.hasFilled ? '<button class="btn-mini">?ï? ç·¨è¼¯</button>' : '<button class="btn-mini">?? å¡«å ±</button>') : '-'}
            </td>
          `;
        }
      } else {
        // å¾Œç??—åª?…å«å·¥ä??…ç›®?Œç½å®³é???        tr.innerHTML = `
          <td style="white-space: normal; word-wrap: break-word;">${workItem.isBadge ? '<span class="status-badge-holiday-no">' + workItem.text + '</span>' : (workItem.isEmpty ? '<span class="unfilled-text">' + workItem.text + '</span>' : workItem.text)}</td>
          <td style="white-space: normal; word-wrap: break-word;">${workItem.isEmpty ? '<span class="unfilled-text">' + workItem.disasters + '</span>' : workItem.disasters}</td>
        `;
      }

      tbody.appendChild(tr);
    });
  });
}

/**
 * [?°å?] æ¸²æ??‹æ??ˆç¸½è¡¨å¡?‡è??? * ?…å«æ¬„ä?ï¼šå·¥ç¨‹å?ç¨? ?¿æ”¬?? æª¢é??? å·¥åœ°è² è²¬äº? ?·å?äººå“¡, å·¥ä??°å?, ?½å·¥äººæ•¸, ä¸»è?å·¥ä??…ç›®, ä¸»è??½å®³é¡å?
 */
function renderMobileSummary(summaryData) {
  const container = document.getElementById('summaryMobileView');
  if (!container) return;

  if (summaryData.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">?¥ç„¡è³‡æ?</div>';
    return;
  }

  let html = '';

  summaryData.forEach(row => {
    // 1. ?€?‹åˆ¤??    const isFilled = row.hasFilled;
    const statusClass = isFilled ? 'status-filled' : 'status-active';
    const badgeClass = isFilled ? 'm-badge-success' : 'm-badge-warning';
    const badgeText = isFilled ? 'å·²å¡«å¯? : '?ªå¡«å¯?;

    // 2. è³‡æ??¼å???    const inspectorText = formatInspectorDisplay(row.inspectors, row.inspectorDetails) || '-';
    // ?·å?äººå“¡?¥æ?è­‰ç…§?‡é¡¯ç¤?    const safetyDisplay = row.safetyLicense ? `${row.safetyOfficer}(${row.safetyLicense})` : (row.safetyOfficer || '-');

    // 3. ?•ç?å·¥é??‡ç½å®³é???    let workItemsHtml = '';
    if (row.isHolidayNoWork) {
      workItemsHtml = '<div class="m-work-item" style="color: #0891b2; font-weight: bold;">??ï¸??‡æ—¥ä¸æ–½å·?/div>';
    } else if (row.workItems && row.workItems.length > 0) {
      row.workItems.forEach((item, idx) => {
        const disasterText = (item.disasters && item.disasters.length > 0) ? item.disasters : '??;
        workItemsHtml += `
          <div class="m-work-item">
            <div class="m-work-desc">${idx + 1}. ${item.text}</div>
            <div class="m-disaster">? ï? ?½å®³ï¼?{disasterText}</div>
          </div>
        `;
      });
    } else {
      workItemsHtml = '<div class="m-work-item" style="color: #9ca3af;">å°šç„¡å·¥é?è³‡æ?</div>';
    }

    // 4. çµ„è??¡ç? HTML
    html += `
      <div class="mobile-summary-card ${statusClass}">
        <div class="m-card-header">
          <div class="m-project-name">${row.fullName}</div>
          <div class="m-header-row">
             <div class="m-contractor">?¢ ${row.contractor}</div>
             <div class="m-badge ${badgeClass}">${badgeText}</div>
          </div>
        </div>
        
        <div class="m-body">
          <div class="m-row">
            <span class="m-label">æª¢é???/span>
            <span class="m-value">${inspectorText}</span>
          </div>
          <div class="m-row">
            <span class="m-label">å·¥åœ°è² è²¬äº?/span>
            <span class="m-value">${row.resp || '-'} ${row.respPhone ? '?“±' : ''}</span>
          </div>
          <div class="m-row">
            <span class="m-label">?·å?äººå“¡</span>
            <span class="m-value">${safetyDisplay} ${row.safetyPhone ? '?“±' : ''}</span>
          </div>
          <div class="m-row">
            <span class="m-label">å·¥ä??°å?</span>
            <span class="m-value">${row.address || '-'}</span>
          </div>
          
          ${isFilled ? `
          <div class="m-row">
            <span class="m-label">?½å·¥äººæ•¸</span>
            <span class="m-value" style="font-weight: bold;">${row.workersCount} äº?/span>
          </div>
          ` : ''}
        </div>

        <div class="m-work-section">
          <span class="m-section-title">ä¸»è?å·¥ä??…ç›® & ?½å®³é¡å?</span>
          ${workItemsHtml}
        </div>
        
        ${!isGuestMode ? `
          <button class="m-action-btn" onclick="${isFilled ? `openEditSummaryLogModal(${JSON.stringify(row).replace(/"/g, '&quot;')})` : `openLogEntryForProject('${row.seqNo}', '${row.fullName}')`}">
            ${isFilled ? '?ï? ç·¨è¼¯?¥è?' : '?? å¡«å¯«?¥è?'}
          </button>
        ` : ''}
      </div>
    `;
  });

  container.innerHTML = html;
}







function switchSummaryMode(mode) {
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');

  if (mode === 'calendar') {
    document.getElementById('summaryListView').style.display = 'none';
    document.getElementById('summaryCalendarView').style.display = 'block';
    renderCalendar();
  } else {
    document.getElementById('summaryListView').style.display = 'block';
    document.getElementById('summaryCalendarView').style.display = 'none';
  }
}

// ç¹¼ç??¨ç¬¬äºŒéƒ¨??..

// ============================================
// [?°å?] ?¹æ¬¡?‡æ—¥è¨­å??Ÿèƒ½
// ============================================
function showBatchHolidayModal() {
  const modal = document.getElementById('batchHolidayModal');
  const projectList = document.getElementById('batchProjectList');

  // è¨­å??è¨­?¥æ? (?æ—¥)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');

  // ?¥ç„¡?¼é?è¨­å¡«??  if (!document.getElementById('batchStartDate').value) {
    document.getElementById('batchStartDate').value = `${yyyy}-${mm}-${dd}`;
  }
  if (!document.getElementById('batchEndDate').value) {
    document.getElementById('batchEndDate').value = `${yyyy}-${mm}-${dd}`;
  }

  projectList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">è¼‰å…¥ä¸?..</div>';
  modal.style.display = 'flex';

  // è¼‰å…¥?½å·¥ä¸­å·¥ç¨?  google.script.run
    .withSuccessHandler(function (projects) {
      projectList.innerHTML = '';
      if (projects.length === 0) {
        projectList.innerHTML = '<div style="padding: 1rem; text-align: center;">?¡æ–½å·¥ä¸­å·¥ç?</div>';
        return;
      }

      projects.forEach(proj => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        const id = `batch_proj_${proj.seqNo}`;
        div.innerHTML = `
            <input type="checkbox" id="${id}" name="batchProject" value="${proj.seqNo}" checked>
            <label for="${id}">${proj.fullName} (${proj.shortName})</label>
          `;
        projectList.appendChild(div);
      });
    })
    .withFailureHandler(function (err) {
      projectList.innerHTML = '<div style="color: red;">è¼‰å…¥å¤±æ?</div>';
    })
    .getActiveProjects(); // ?€ç¢ºè?å¾Œç«¯?‰æ­¤?½å?ï¼Œæ?ä½¿ç”¨ getInitialData ä¸­ç? projects ?æ¿¾
}

function closeBatchHolidayModal() {
  document.getElementById('batchHolidayModal').style.display = 'none';
}

function toggleBatchAllProjects(checkbox) {
  const checkboxes = document.querySelectorAll('input[name="batchProject"]');
  checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

function submitBatchHoliday() {
  const startDate = document.getElementById('batchStartDate').value;
  const endDate = document.getElementById('batchEndDate').value;

  if (!startDate || !endDate) {
    showToast('è«‹é¸?‡æ—¥?Ÿç???, true);
    return;
  }

  if (startDate > endDate) {
    showToast('?‹å??¥æ?ä¸èƒ½?šæ–¼çµæ??¥æ?', true);
    return;
  }

  const targetDays = [];
  if (document.getElementById('batchCheckSun').checked) targetDays.push(0); // ?±æ—¥
  if (document.getElementById('batchCheckSat').checked) targetDays.push(6); // ?±å…­

  if (targetDays.length === 0) {
    showToast('è«‹è‡³å°‘é¸?‡ä?å¤?(?±å…­?–é€±æ—¥)', true);
    return;
  }

  const selectedProjects = [];
  document.querySelectorAll('input[name="batchProject"]:checked').forEach(cb => {
    selectedProjects.push(cb.value);
  });

  if (selectedProjects.length === 0) {
    showToast('è«‹è‡³å°‘é¸?‡ä??‹å·¥ç¨?, true);
    return;
  }

  const confirmMessage = `
       <p><strong>?? ?¹æ¬¡è¨­å??‡æ—¥ä¸æ–½å·?/strong></p>
       <p>?¥æ?ï¼?{startDate} ~ ${endDate}</p>
       <p>å°è±¡ï¼?{targetDays.includes(6) ? '?±å…­' : ''} ${targetDays.includes(0) ? '?±æ—¥' : ''}</p>
       <p>å·¥ç??¸ï?${selectedProjects.length} ??/p>
       <p style="margin-top: 1rem; color: var(--warning);">? ï? æ­¤æ?ä½œå?è¦†è??¾æ??¥è?ï¼Œç¢ºèªåŸ·è¡Œï?</p>
    `;

  showConfirmModal(confirmMessage, function () {
    showLoading();
    google.script.run
      .withSuccessHandler(function (result) {
        hideLoading();
        if (result.success) {
          showToast(`??${result.message}`);
          closeBatchHolidayModal();
          // ?æ–°?´ç?ç¸½è¡¨
          loadSummaryReport();
        } else {
          showToast('è¨­å?å¤±æ?ï¼? + result.message, true);
        }
      })
      .withFailureHandler(function (err) {
        hideLoading();
        showToast('ç³»çµ±?¯èª¤ï¼? + err.message, true);
      })
      .batchSubmitHolidayLogs(startDate, endDate, targetDays, selectedProjects);

    closeConfirmModal();
  });
}

// ============================================
// ç·¨è¼¯ç¸½è¡¨?¥è?

// ============================================
function openEditSummaryLogModal(rowData) {
  const dateString = document.getElementById('summaryDatePicker').value;

  document.getElementById('editSummaryLogDate').value = dateString;
  document.getElementById('editSummaryLogProjectSeqNo').value = rowData.seqNo;
  document.getElementById('editSummaryLogProjectName').textContent = rowData.fullName;
  document.getElementById('editSummaryIsHolidayNoWork').value = rowData.isHolidayNoWork ? 'yes' : 'no';

  // é¡¯ç¤º/?±è??‡æ??‰é??€??  const toggleContainer = document.getElementById('editHolidayToggleContainer');
  if (!toggleContainer) {
    // å¦‚æ?å®¹å™¨ä¸å??¨ï??•æ??µå»º
    const header = document.getElementById('editSummaryLogModal').querySelector('.modal-header');
    const container = document.createElement('div');
    container.id = 'editHolidayToggleContainer';
    container.style.marginTop = '10px';
    container.style.padding = '10px';
    container.style.background = '#f3f4f6';
    container.style.borderRadius = '8px';

    container.innerHTML = `
        <label class="toggle-switch">
          <input type="checkbox" id="editSwitchHolidayNoWork" onchange="toggleEditHolidayNoWork(this)">
          <span class="toggle-slider"></span>
          <span class="toggle-label">??ï¸??‡æ—¥ä¸æ–½å·?/span>
        </label>
      `;
    header.parentNode.insertBefore(container, header.nextSibling);
  }

  // è¨­å??å??€??  const isNoWork = rowData.isHolidayNoWork;
  document.getElementById('editSwitchHolidayNoWork').checked = isNoWork;
  document.getElementById('editSummaryIsHolidayNoWork').value = isNoWork ? 'yes' : 'no';

  toggleEditFields(isNoWork);

  // å¡«å…¥è³‡æ?ï¼ˆå³ä½¿éš±?ä?è¦å¡«?¥ï?ä»¥ä¾¿?‡æ??‚é¡¯ç¤ºï?
  renderInspectorCheckboxes('editInspectorCheckboxes', rowData.inspectorIds || []);
  document.getElementById('editSummaryWorkersCount').value = rowData.workersCount || 0;
  renderEditWorkItemsList(rowData.workItems || []);
  document.getElementById('editIsHolidayWork').checked = rowData.isHolidayWork || false;
  document.getElementById('editSummaryReason').value = '';
  document.getElementById('editSummaryLogModal').style.display = 'flex';
}

// [?°å?] ?‡æ?ç·¨è¼¯æ¨¡å??„å??¥ä??½å·¥?€??function toggleEditHolidayNoWork(checkbox) {
  const isNoWork = checkbox.checked;
  document.getElementById('editSummaryIsHolidayNoWork').value = isNoWork ? 'yes' : 'no';
  toggleEditFields(isNoWork);
}

// [?°å?] ?§åˆ¶ç·¨è¼¯æ¬„ä?é¡¯ç¤º
function toggleEditFields(isNoWork) {
  if (isNoWork) {
    document.getElementById('editHolidayNoWorkBadge').style.display = 'block';
    document.getElementById('editHolidayWorkBadge').style.display = 'none';
    document.getElementById('editHolidayWorkToggle').style.display = 'none';
    document.getElementById('editSummaryInspectorGroup').style.display = 'none';
    document.getElementById('editSummaryWorkersGroup').style.display = 'none';
    document.getElementById('editSummaryWorkItemsGroup').style.display = 'none';
  } else {
    document.getElementById('editHolidayNoWorkBadge').style.display = 'none';
    checkEditHolidayWorkStatus(); // ?´æ–°?‡æ—¥?½å·¥æ¨™è?
    document.getElementById('editHolidayWorkToggle').style.display = 'block';
    document.getElementById('editSummaryInspectorGroup').style.display = 'block';
    document.getElementById('editSummaryWorkersGroup').style.display = 'block';
    document.getElementById('editSummaryWorkItemsGroup').style.display = 'block';
  }
}

function checkEditHolidayWorkStatus() {
  const isHolidayWork = document.getElementById('editIsHolidayWork').checked;
  document.getElementById('editHolidayWorkBadge').style.display = isHolidayWork ? 'block' : 'none';
}

function closeEditSummaryLogModal() {
  document.getElementById('editSummaryLogModal').style.display = 'none';
}

function renderEditWorkItemsList(workItems) {
  const container = document.getElementById('editWorkItemsList');
  container.innerHTML = '';

  workItems.forEach((item, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'edit-work-item';

    const disasters = item.disasters.join('??);

    itemDiv.innerHTML = `
      <div class="edit-work-item-header">å·¥é? ${index + 1}</div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-icon">??ï¸?/span>
          <span>å·¥ä?å·¥é?</span>
        </label>
        <textarea class="form-textarea edit-work-item-text" rows="2">${item.text}</textarea>
      </div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-icon">? ï?</span>
          <span>?½å®³é¡å?</span>
        </label>
        <div class="disaster-checkboxes-grid-small">
          ${renderEditDisasterCheckboxes(index, item.disasters)}
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-icon">?›¡ï¸?/span>
          <span>?±å®³å°ç?</span>
        </label>
        <textarea class="form-textarea edit-countermeasures-text" rows="2">${item.countermeasures}</textarea>
      </div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-icon">??</span>
          <span>å·¥ä??°é?</span>
        </label>
        <input type="text" class="form-input edit-work-location-text" value="${item.workLocation}">
      </div>
      
      <button type="button" class="btn-remove" onclick="removeEditWorkItem(this)" style="width: 100%;">??ç§»é™¤æ­¤å·¥??/button>
    `;

    container.appendChild(itemDiv);
  });

  // ?°å?å·¥é??‰é?
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-secondary';
  addBtn.style.width = '100%';
  addBtn.innerHTML = '<span class="btn-icon">??/span><span>?°å?å·¥é?</span>';
  addBtn.onclick = addEditWorkItem;
  container.appendChild(addBtn);
}

function renderEditDisasterCheckboxes(itemIndex, selectedDisasters) {
  let html = '';

  disasterOptions.forEach(disaster => {
    if (disaster.type === '?¶ä?') return; // ç·¨è¼¯æ¨¡å??«ä??¯æ´?°å??Œå…¶ä»–ã€?
    const isChecked = selectedDisasters.includes(disaster.type);
    const checkboxId = `edit_disaster_${itemIndex}_${disaster.type.replace(/[?\/]/g, '_')}`;

    html += `
      <div class="disaster-checkbox-item-small">
        <input type="checkbox" id="${checkboxId}" value="${disaster.type}" ${isChecked ? 'checked' : ''}>
        <label for="${checkboxId}">${disaster.icon} ${disaster.type}</label>
      </div>
    `;
  });

  return html;
}

function addEditWorkItem() {
  const container = document.getElementById('editWorkItemsList');
  const addBtn = container.querySelector('.btn-secondary');

  const itemCount = container.querySelectorAll('.edit-work-item').length + 1;

  const itemDiv = document.createElement('div');
  itemDiv.className = 'edit-work-item';

  itemDiv.innerHTML = `
    <div class="edit-work-item-header">å·¥é? ${itemCount}</div>
    
    <div class="form-group">
      <label class="form-label">
        <span class="label-icon">??ï¸?/span>
        <span>å·¥ä?å·¥é?</span>
      </label>
      <textarea class="form-textarea edit-work-item-text" rows="2" placeholder="è«‹æ?è¿°ä¸»è¦å·¥ä½œå…§å®?></textarea>
    </div>
    
    <div class="form-group">
      <label class="form-label">
        <span class="label-icon">? ï?</span>
        <span>?½å®³é¡å?</span>
      </label>
      <div class="disaster-checkboxes-grid-small">
        ${renderEditDisasterCheckboxes(itemCount, [])}
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">
        <span class="label-icon">?›¡ï¸?/span>
        <span>?±å®³å°ç?</span>
      </label>
      <textarea class="form-textarea edit-countermeasures-text" rows="2" placeholder="è«‹æ?è¿°å…·é«”ç??±å®³å°ç?"></textarea>
    </div>
    
    <div class="form-group">
      <label class="form-label">
        <span class="label-icon">??</span>
        <span>å·¥ä??°é?</span>
      </label>
      <input type="text" class="form-input edit-work-location-text" placeholder="è«‹è¼¸?¥å…·é«”å·¥ä½œåœ°é»?>
    </div>
    
    <button type="button" class="btn-remove" onclick="removeEditWorkItem(this)" style="width: 100%;">??ç§»é™¤æ­¤å·¥??/button>
  `;

  container.insertBefore(itemDiv, addBtn);
  updateEditWorkItemNumbers();
}

function removeEditWorkItem(button) {
  button.closest('.edit-work-item').remove();
  updateEditWorkItemNumbers();
}

function updateEditWorkItemNumbers() {
  const items = document.querySelectorAll('.edit-work-item');
  items.forEach((item, index) => {
    item.querySelector('.edit-work-item-header').textContent = `å·¥é? ${index + 1}`;
  });
}

function confirmEditSummaryLog() {
  const dateString = document.getElementById('editSummaryLogDate').value;
  const projectSeqNo = document.getElementById('editSummaryLogProjectSeqNo').value;
  const isHolidayNoWork = document.getElementById('editSummaryIsHolidayNoWork').value === 'yes';
  const reason = document.getElementById('editSummaryReason').value.trim();

  if (!reason) {
    showToast('è«‹å¡«å¯«ä¿®?¹å???, true);
    return;
  }

  if (isHolidayNoWork) {
    // ?‡æ—¥ä¸æ–½å·¥ä??€è¦å…¶ä»–è???    const confirmMessage = `
      <p><strong>?? ä¿®æ”¹?¥è?</strong></p>
      <p><strong>?? ?¥æ?ï¼?/strong>${dateString}</p>
      <p><strong>??ï¸?å·¥ç?ï¼?/strong>${document.getElementById('editSummaryLogProjectName').textContent}</p>
      <p><strong>?? ä¿®æ”¹?Ÿå?ï¼?/strong>${reason}</p>
      <p style="margin-top: 1rem; color: var(--warning);">? ï? ç¢ºè?ä¿®æ”¹?ï?</p>
    `;

    showConfirmModal(confirmMessage, function () {
      showLoading();
      executeUpdateSummaryLog({
        dateString: dateString,
        projectSeqNo: projectSeqNo,
        isHolidayNoWork: true,
        reason: reason
      });
      closeConfirmModal();
    });
    return;
  }

  const inspectorIds = getSelectedInspectors('editInspectorCheckboxes');
  const workersCount = document.getElementById('editSummaryWorkersCount').value;
  const isHolidayWork = document.getElementById('editIsHolidayWork').checked;

  if (inspectorIds.length === 0) {
    showToast('è«‹è‡³å°‘é¸?‡ä?ä½æª¢é©—å“¡', true);
    return;
  }

  if (!workersCount || workersCount <= 0) {
    showToast('è«‹å¡«å¯«æ–½å·¥äºº??, true);
    return;
  }

  const workItems = collectEditWorkItems();
  if (workItems.length === 0) {
    showToast('è«‹è‡³å°‘å¡«å¯«ä?çµ„å·¥?…è???, true);
    return;
  }

  const confirmMessage = `
    <p><strong>?? ä¿®æ”¹?¥è?</strong></p>
    <p><strong>?? ?¥æ?ï¼?/strong>${dateString}</p>
    <p><strong>??ï¸?å·¥ç?ï¼?/strong>${document.getElementById('editSummaryLogProjectName').textContent}</p>
    <p><strong>?? ä¿®æ”¹?Ÿå?ï¼?/strong>${reason}</p>
    <p style="margin-top: 1rem; color: var(--warning);">? ï? ç¢ºè?ä¿®æ”¹?ï?</p>
  `;

  showConfirmModal(confirmMessage, function () {
    showLoading();
    executeUpdateSummaryLog({
      dateString: dateString,
      projectSeqNo: projectSeqNo,
      isHolidayNoWork: false,
      isHolidayWork: isHolidayWork,
      inspectorIds: inspectorIds,
      workersCount: parseInt(workersCount),
      workItems: workItems,
      reason: reason
    });
    closeConfirmModal();
  });
}

function collectEditWorkItems() {
  const workItems = [];
  const items = document.querySelectorAll('.edit-work-item');

  items.forEach(item => {
    const workItemText = item.querySelector('.edit-work-item-text').value.trim();
    const countermeasuresText = item.querySelector('.edit-countermeasures-text').value.trim();
    const workLocationText = item.querySelector('.edit-work-location-text').value.trim();

    const disasterCheckboxes = item.querySelectorAll('.disaster-checkboxes-grid-small input[type="checkbox"]:checked');
    const disasterTypes = Array.from(disasterCheckboxes).map(cb => cb.value);

    if (workItemText && disasterTypes.length > 0 && countermeasuresText && workLocationText) {
      workItems.push({
        workItem: workItemText,
        disasterTypes: disasterTypes,
        countermeasures: countermeasuresText,
        workLocation: workLocationText
      });
    }
  });

  return workItems;
}

function executeUpdateSummaryLog(data) {
  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();
      if (result.success) {
        showToast(`??${result.message}`);
        closeEditSummaryLogModal();
        loadSummaryReport();
      } else {
        showToast('ä¿®æ”¹å¤±æ?ï¼? + result.message, true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
    })
    .updateDailySummaryLog(data);
}

// ============================================
// [?°å?] ?¹æ¬¡?‡æ—¥è¨­å??¸é??Ÿèƒ½
// ============================================
function showBatchHolidayModal() {
  const modal = document.getElementById('batchHolidayModal');
  if (!modal) return;

  // ?è¨­?¥æ?ï¼šæ???  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  document.getElementById('batchStartDate').value = tomorrowStr;
  document.getElementById('batchEndDate').value = tomorrowStr;

  // æ¸²æ?å·¥ç??—è¡¨
  renderBatchProjectList();

  modal.style.display = 'flex';
}

function closeBatchHolidayModal() {
  document.getElementById('batchHolidayModal').style.display = 'none';
}

function renderBatchProjectList() {
  const container = document.getElementById('batchProjectList');
  if (!container) return;

  container.innerHTML = '';

  // ?–å??€?‰æ–½å·¥ä¸­å·¥ç? (?¨å?è®Šæ•¸ allProjects)
  const activeProjects = allProjects.filter(p => p.projectStatus === '?½å·¥ä¸?);

  activeProjects.forEach(project => {
    const div = document.createElement('div');
    div.className = 'checkbox-item';
    div.innerHTML = `
        <input type="checkbox" name="batchProject" value="${project.seqNo}" checked>
        <label>${project.shortName || project.fullName}</label>
      `;
    container.appendChild(div);
  });
}

function toggleBatchAllProjects(checkbox) {
  const checkboxes = document.querySelectorAll('input[name="batchProject"]');
  checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

function submitBatchHoliday() {
  const startDate = document.getElementById('batchStartDate').value;
  const endDate = document.getElementById('batchEndDate').value;

  if (!startDate || !endDate) {
    showToast('è«‹é¸?‡é?å§‹è?çµæ??¥æ?', true);
    return;
  }

  if (startDate > endDate) {
    showToast('?‹å??¥æ?ä¸èƒ½?šæ–¼çµæ??¥æ?', true);
    return;
  }

  const targetDays = [];
  if (document.getElementById('batchCheckSat').checked) targetDays.push(6);
  if (document.getElementById('batchCheckSun').checked) targetDays.push(0);

  if (targetDays.length === 0) {
    showToast('è«‹è‡³å°‘é¸?‡ä??‹æ??Ÿå¹¾ (?±å…­?–é€±æ—¥)', true);
    return;
  }

  const selectedProjects = [];
  document.querySelectorAll('input[name="batchProject"]:checked').forEach(cb => {
    selectedProjects.push(cb.value);
  });

  if (selectedProjects.length === 0) {
    showToast('è«‹è‡³å°‘é¸?‡ä??‹å·¥ç¨?, true);
    return;
  }

  if (!confirm(`ç¢ºå?è¦ç‚º ${selectedProjects.length} ?‹å·¥ç¨‹è¨­å®šå??¥ä??½å·¥?ï?\n?¥æ?ï¼?{startDate} ~ ${endDate}`)) {
    return;
  }

  showLoading();
  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();
      if (result.success) {
        showToast(result.message);
        closeBatchHolidayModal();
        // å¦‚æ??¶å??¨æ—¥èªŒå¡«?±é??¢ä??¥æ??¨ç??å…§ï¼Œå¯?½é?è¦é??°æ•´??      } else {
        showToast(result.message, true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('?¹æ¬¡è¨­å?å¤±æ?ï¼? + error.message, true);
    })
    .batchSubmitHolidayLogs(startDate, endDate, targetDays, selectedProjects);
}

function copyPreviousDayData() {
  const projectSeqNo = document.getElementById('editSummaryLogProjectSeqNo').value;
  const currentDate = document.getElementById('editSummaryLogDate').value;

  showLoading();
  google.script.run
    .withSuccessHandler(function (prevLog) {
      hideLoading();
      if (prevLog) {
        renderInspectorCheckboxes('editInspectorCheckboxes', prevLog.inspectorIds);
        document.getElementById('editSummaryWorkersCount').value = prevLog.workersCount;
        showToast('??å·²è?è£½å?ä¸€å¤©è???);
      } else {
        showToast('?¾ä??°å?ä¸€å¤©ç??¥è?è³‡æ?', true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¤‡è£½å¤±æ?ï¼? + error.message, true);
    })
    .getPreviousDayLog(projectSeqNo, currentDate);
}

// ============================================
// å·¥ç?è¨­å??Ÿèƒ½
// ============================================
function loadAndRenderProjectCards() {
  // showLoading å·²åœ¨ switchTab ä¸­è???
  // å¦‚æ? allInspectors ?„æ?è¼‰å…¥ï¼Œå?è¼‰å…¥æª¢é??¡è???  if (!allInspectors || allInspectors.length === 0) {
    google.script.run
      .withSuccessHandler(function (inspectors) {
        allInspectors = inspectors;
        // è¼‰å…¥æª¢é??¡è??™å?ï¼Œå?è¼‰å…¥å·¥ç?è³‡æ?
        loadProjectsData();
      })
      .withFailureHandler(function (error) {
        hideLoading();
        showToast('è¼‰å…¥æª¢é??¡è??™å¤±?—ï?' + error.message, true);
      })
      .getAllInspectors();
  } else {
    // allInspectors å·²ç?è¼‰å…¥ï¼Œç›´?¥è??¥å·¥ç¨‹è???    loadProjectsData();
  }
}

function loadProjectsData() {
  google.script.run
    .withSuccessHandler(function (projects) {
      // ä¸è??¨é€™è£¡ hideLoadingï¼Œç?çµ?renderProjectCards å®Œæ?å¾Œå??œé?
      allProjectsData = projects;

      let filteredProjects = projects;

      // å¡«è¡¨äººåª?½ç??°è‡ªå·±ç?å·¥ç?
      if (currentUserInfo && currentUserInfo.role === 'å¡«è¡¨äº?) {
        const managedProjects = currentUserInfo.managedProjects || [];
        filteredProjects = filteredProjects.filter(p => managedProjects.includes(p.seqNo));
      }

      const filterStatus = document.querySelector('input[name="projectStatusFilter"]:checked').value;
      const filterDept = document.getElementById('projectDeptFilter').value;

      if (filterStatus === 'active') {
        filteredProjects = filteredProjects.filter(p => p.projectStatus === '?½å·¥ä¸?);
      }

      if (filterDept && filterDept !== 'all') {
        filteredProjects = filteredProjects.filter(p => p.dept === filterDept);
      }

      // renderProjectCards ?ƒåœ¨æ¸²æ?å®Œæ?å¾?hideLoading
      renderProjectCards(filteredProjects);
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¼‰å…¥å·¥ç?è³‡æ?å¤±æ?ï¼? + error.message, true);
    })
    .getAllProjects();
}

function formatProjectDefaultInspector(inspectorIds) {
  // å¦‚æ?æ²’æ??è¨­æª¢é??¡ï?è¿”å?ç´…è‰²è­¦å?
  if (!inspectorIds || inspectorIds.length === 0) {
    return '<span style="color: #dc2626; font-weight: 600;">? ï? ?ªè¨­å®šé?è¨­æª¢é©—å“¡</span>';
  }

  // å¾?allInspectors ?¨å?è®Šæ•¸ä¸­æŸ¥?¾æª¢é©—å“¡è³‡è?
  if (!allInspectors || allInspectors.length === 0) {
    return inspectorIds.join('??);
  }

  const inspectorNames = inspectorIds.map(id => {
    const inspector = allInspectors.find(ins => ins.id === id);
    if (inspector) {
      const isOutsource = inspector.dept === 'å§”å???€?;
      return `${inspector.name}(${inspector.profession})${isOutsource ? 'å§? : ''}`;
    }
    return id;
  });

  return inspectorNames.join('??);
}

function renderProjectCards(projects) {
  const container = document.getElementById('projectCardsContainer');

  if (projects.length === 0) {
    container.innerHTML = '<div class="text-muted" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">?¥ç„¡å·¥ç?è³‡æ?</div>';
    hideLoading();
    return;
  }

  // ?ˆä?è¦æ?ç©ºå®¹?¨ï?ä¿æ? loading é¡¯ç¤º
  // container.innerHTML = '';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().substring(0, 10);

  google.script.run
    .withSuccessHandler(function (summaryData) {
      // ?¶åˆ°è³‡æ?å¾Œæ?æ¸…ç©ºå®¹å™¨ä¸¦æ¸²??      container.innerHTML = '';

      const filledSeqNos = new Set();
      summaryData.forEach(row => {
        if (row.hasFilled) {
          filledSeqNos.add(row.seqNo);
        }
      });

      projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card editable';

        const hasFilled = filledSeqNos.has(project.seqNo);
        const isActive = project.projectStatus === '?½å·¥ä¸?;

        if (hasFilled) {
          card.classList.add('filled');
        } else if (isActive) {
          card.classList.add('not-filled');
        } else {
          card.classList.add('inactive');
        }

        card.onclick = function () {
          openEditProjectModal(project);
        };

        const statusClass = `status-${project.projectStatus}`;
        const statusIcon = hasFilled ? '?? : (isActive ? '?? : '??);
        const statusText = hasFilled ? 'å·²å¡«å¯? : (isActive ? '?ªå¡«å¯? : '?æ–½å·¥ä¸­');
        const statusColor = hasFilled ? 'filled' : (isActive ? 'not-filled' : 'inactive');

        // ?¼å??–é?è¨­æª¢é©—å“¡é¡¯ç¤º
        const defaultInspectorDisplay = formatProjectDefaultInspector(project.defaultInspectors);

        card.innerHTML = `
          <div class="card-edit-hint">é»æ?ç·¨è¼¯</div>

          <div class="project-card-header">
            <div class="project-card-seq-name">
              <div class="project-card-icon">??ï¸?/div>
              <div class="project-card-seq">${project.seqNo}</div>
            </div>
            <div class="project-status-badge ${statusClass}">${project.projectStatus}</div>
          </div>

          <div class="project-card-body">
            <div class="project-card-title">${project.fullName}</div>

            <div class="project-card-info">
              <div class="info-row">
                <span class="info-label">?¿æ”¬?†ï?</span>
                <span class="info-value">${project.contractor}</span>
              </div>
              <div class="info-row">
                <span class="info-label">?¨é?ï¼?/span>
                <span class="info-value">${project.dept}</span>
              </div>
              <div class="info-row">
                <span class="info-label">?è¨­æª¢é??¡ï?</span>
                <span class="info-value">${defaultInspectorDisplay}</span>
              </div>
              <div class="info-row">
                <span class="info-label">å·¥åœ°è² è²¬äººï?</span>
                <span class="info-value">${project.resp}</span>
              </div>
              <div class="info-row">
                <span class="info-label">?·å?äººå“¡ï¼?/span>
                <span class="info-value">${project.safetyOfficer}</span>
              </div>
            </div>

            ${project.remark ? `<div class="project-remark">?? ${project.remark}</div>` : ''}
          </div>

          <div class="project-card-footer ${statusColor}">
            <span class="status-icon">${statusIcon}</span>
            <span>${tomorrowStr} - ${statusText}</span>
          </div>
        `;

        container.appendChild(card);
      });

      // ?¡ç?æ¸²æ?å®Œæ?å¾Œé???loading
      hideLoading();
    })
    .withFailureHandler(function (error) {
      console.error('è¼‰å…¥å¡«å ±?€æ³å¤±?—ï?', error);

      // æ¸…ç©ºå®¹å™¨
      container.innerHTML = '';

      projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card editable';

        if (project.projectStatus !== '?½å·¥ä¸?) {
          card.classList.add('inactive');
        }

        card.onclick = function () {
          openEditProjectModal(project);
        };

        const statusClass = `status-${project.projectStatus}`;
        const defaultInspectorDisplay = formatProjectDefaultInspector(project.defaultInspectors);

        card.innerHTML = `
          <div class="card-edit-hint">é»æ?ç·¨è¼¯</div>

          <div class="project-card-header">
            <div class="project-card-seq-name">
              <div class="project-card-icon">??ï¸?/div>
              <div class="project-card-seq">${project.seqNo}</div>
            </div>
            <div class="project-status-badge ${statusClass}">${project.projectStatus}</div>
          </div>

          <div class="project-card-body">
            <div class="project-card-title">${project.fullName}</div>

            <div class="project-card-info">
              <div class="info-row">
                <span class="info-label">?¿æ”¬?†ï?</span>
                <span class="info-value">${project.contractor}</span>
              </div>
              <div class="info-row">
                <span class="info-label">?¨é?ï¼?/span>
                <span class="info-value">${project.dept}</span>
              </div>
              <div class="info-row">
                <span class="info-label">?è¨­æª¢é??¡ï?</span>
                <span class="info-value">${defaultInspectorDisplay}</span>
              </div>
              <div class="info-row">
                <span class="info-label">å·¥åœ°è² è²¬äººï?</span>
                <span class="info-value">${project.resp}</span>
              </div>
              <div class="info-row">
                <span class="info-label">?·å?äººå“¡ï¼?/span>
                <span class="info-value">${project.safetyOfficer}</span>
              </div>
            </div>

            ${project.remark ? `<div class="project-remark">?? ${project.remark}</div>` : ''}
          </div>
          
          <div class="project-card-footer inactive">
            <span class="status-icon">??/span>
            <span>å·¥ç?è³‡æ?</span>
          </div>
        `;

        container.appendChild(card);
      });

      // å¤±æ??‚ä?è¦é???loading
      hideLoading();
    })
    .getDailySummaryReport(tomorrowStr, 'all', 'all', isGuestMode, currentUserInfo);
}

function openEditProjectModal(project) {
  document.getElementById('editProjectSeqNo').value = project.seqNo;
  document.getElementById('editProjectName').textContent = `${project.seqNo} - ${project.fullName}`;

  document.getElementById('editResp').value = project.resp || '';
  document.getElementById('editRespPhone').value = project.respPhone || '';
  document.getElementById('editSafetyOfficer').value = project.safetyOfficer || '';
  document.getElementById('editSafetyPhone').value = project.safetyPhone || '';
  document.getElementById('editSafetyLicense').value = project.safetyLicense || '';
  document.getElementById('editProjectStatus').value = project.projectStatus || '?½å·¥ä¸?;
  document.getElementById('editStatusRemark').value = project.remark || '';

  // è§¸ç™¼?€?‹è??´ä?ä»¶ä»¥é¡¯ç¤º/?±è??™è¨»æ¬?  const statusSelect = document.getElementById('editProjectStatus');
  statusSelect.dispatchEvent(new Event('change'));

  // ?è¨­æª¢é???  renderInspectorCheckboxes('editDefaultInspectorCheckboxes', project.defaultInspectors);

  document.getElementById('editProjectReason').value = '';

  document.getElementById('editProjectModal').style.display = 'flex';
}

function closeEditProjectModal() {
  document.getElementById('editProjectModal').style.display = 'none';
}

function confirmEditProject() {
  const projectSeqNo = document.getElementById('editProjectSeqNo').value;
  const resp = document.getElementById('editResp').value.trim();
  const respPhone = document.getElementById('editRespPhone').value.trim();
  const safetyOfficer = document.getElementById('editSafetyOfficer').value.trim();
  const safetyPhone = document.getElementById('editSafetyPhone').value.trim();
  const safetyLicense = document.getElementById('editSafetyLicense').value;
  const projectStatus = document.getElementById('editProjectStatus').value;
  const statusRemark = document.getElementById('editStatusRemark').value.trim();
  const reason = document.getElementById('editProjectReason').value.trim();

  if (!resp || !safetyOfficer || !reason) {
    showToast('è«‹å¡«å¯«æ??‰å?å¡«æ?ä½?, true);
    return;
  }

  if (projectStatus !== '?½å·¥ä¸? && !statusRemark) {
    showToast('å·¥ç??€?‹é??Œæ–½å·¥ä¸­?æ?ï¼Œå?è¨»æ??ºå?å¡?, true);
    return;
  }

  const defaultInspectors = getSelectedInspectors('editDefaultInspectorCheckboxes');

  // ?–å??¶å?ä½¿ç”¨?…å?ç¨?  const modifierName = currentUserInfo ? currentUserInfo.name : 'è¨ªå®¢';

  // ?–å??è¨­æª¢é??¡å?ç¨?  const defaultInspectorNames = defaultInspectors.map(id => {
    const inspector = allInspectorsWithStatus.find(ins => ins.id === id);
    return inspector ? `${inspector.name} (${id})` : id;
  }).join('??);
  const inspectorDisplay = defaultInspectorNames || '?ªè¨­å®?;

  const safetyDisplay = safetyLicense ? `${safetyOfficer}(${safetyLicense})` : safetyOfficer;

  const confirmMessage = `
    <p><strong>?™ï? ä¿®æ”¹å·¥ç?è³‡æ?</strong></p>
    <p><strong>??ï¸?å·¥ç?ï¼?/strong>${document.getElementById('editProjectName').textContent}</p>
    <p><strong>?‘¤ ä¿®æ”¹äººå“¡ï¼?/strong>${modifierName}</p>
    <p><strong>?‘· å·¥åœ°è² è²¬äººï?</strong>${resp}</p>
    <p><strong>?¦º ?·å?äººå“¡ï¼?/strong>${safetyDisplay}</p>
    <p><strong>?? å·¥ç??€?‹ï?</strong>${projectStatus}</p>
    ${statusRemark ? `<p><strong>?? ?™è¨»ï¼?/strong>${statusRemark}</p>` : ''}
    <p><strong>?‘¨?ğ???è¨­æª¢é??¡ï?</strong>${inspectorDisplay}</p>
    <p><strong>?? ä¿®æ”¹?Ÿå?ï¼?/strong>${reason}</p>
    <p style="margin-top: 1rem; color: var(--warning);">? ï? ç¢ºè?ä¿®æ”¹?ï?</p>
  `;

  showConfirmModal(confirmMessage, function () {
    showLoading();
    google.script.run
      .withSuccessHandler(function (result) {
        hideLoading();
        if (result.success) {
          showToast(`??${result.message}`);
          closeEditProjectModal();
          loadAndRenderProjectCards();
        } else {
          showToast('ä¿®æ”¹å¤±æ?ï¼? + result.message, true);
        }
      })
      .withFailureHandler(function (error) {
        hideLoading();
        showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
      })
      .updateProjectInfo({
        projectSeqNo: projectSeqNo,
        resp: resp,
        respPhone: respPhone,
        safetyOfficer: safetyOfficer,
        safetyPhone: safetyPhone,
        safetyLicense: safetyLicense,
        projectStatus: projectStatus,
        statusRemark: statusRemark,
        defaultInspectors: defaultInspectors,
        reason: reason
      });
    closeConfirmModal();
  });
}

// ============================================
// æª¢é??¡ç®¡?†å???// ============================================
function loadInspectorManagement() {
  // showLoading å·²åœ¨ switchTab ä¸­è???  google.script.run
    .withSuccessHandler(function (inspectors) {
      hideLoading();
      allInspectorsWithStatus = inspectors;

      const filterStatus = document.querySelector('input[name="inspectorStatusFilter"]:checked').value;
      const filterDept = document.getElementById('inspectorDeptFilter').value;

      let filteredInspectors = inspectors;

      if (filterStatus === 'active') {
        filteredInspectors = filteredInspectors.filter(ins => ins.status === '?Ÿç”¨');
      }

      if (filterDept && filterDept !== 'all') {
        filteredInspectors = filteredInspectors.filter(ins => ins.dept === filterDept);
      }

      renderInspectorCards(filteredInspectors);
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¼‰å…¥æª¢é??¡è??™å¤±?—ï?' + error.message, true);
    })
    .getAllInspectorsWithStatus();
}

function renderInspectorCards(inspectors) {
  const container = document.getElementById('inspectorCardsContainer');

  if (inspectors.length === 0) {
    container.innerHTML = '<div class="text-muted" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">?¥ç„¡æª¢é??¡è???/div>';
    return;
  }

  container.innerHTML = '';

  // ?‰éƒ¨?€?†ç?
  const inspectorsByDept = {};
  inspectors.forEach(inspector => {
    const dept = inspector.dept || '?ªå?é¡?;
    if (!inspectorsByDept[dept]) {
      inspectorsByDept[dept] = [];
    }
    inspectorsByDept[dept].push(inspector);
  });

  // æ¸²æ?æ¯å€‹éƒ¨?€
  Object.keys(inspectorsByDept).sort().forEach(dept => {
    // ?¨é?æ¨™é?
    const deptHeader = document.createElement('div');
    deptHeader.style.cssText = 'grid-column: 1 / -1; margin-top: 1.5rem; margin-bottom: 1rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 12px; font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);';
    deptHeader.innerHTML = `
      <span style="font-size: 1.5rem;">?¢</span>
      <span>${dept}</span>
      <span style="margin-left: auto; background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.9rem;">${inspectorsByDept[dept].length} ä½?/span>
    `;
    container.appendChild(deptHeader);

    // æ¸²æ?è©²éƒ¨?€?„æª¢é©—å“¡?¡ç?
    inspectorsByDept[dept].forEach(inspector => {
      const card = document.createElement('div');
      card.className = 'inspector-card';

      const isActive = inspector.status === '?Ÿç”¨';

      if (!isActive) {
        card.classList.add('inactive');
      }

      const statusClass = isActive ? 'active' : 'inactive';

      card.innerHTML = `
      <div class="inspector-card-header">
        <div class="inspector-card-id">${inspector.id}</div>
        <div class="inspector-card-status ${statusClass}">${inspector.status}</div>
      </div>
      
      <div class="inspector-card-body">
        <div class="inspector-card-name">${inspector.name}</div>
        
        <div class="inspector-card-info">
          <div class="inspector-info-row">
            <span class="inspector-info-icon">?¢</span>
            <span class="inspector-info-label">?¨é?ï¼?/span>
            <span class="inspector-info-value">${inspector.dept}</span>
          </div>
          <div class="inspector-info-row">
            <span class="inspector-info-icon">??</span>
            <span class="inspector-info-label">?·ç¨±ï¼?/span>
            <span class="inspector-info-value">${inspector.title}</span>
          </div>
          <div class="inspector-info-row">
            <span class="inspector-info-icon">?”§</span>
            <span class="inspector-info-label">å°ˆæ¥­ï¼?/span>
            <span class="inspector-info-value">${inspector.profession}</span>
          </div>
          ${inspector.phone ? `
          <div class="inspector-info-row">
            <span class="inspector-info-icon">??</span>
            <span class="inspector-info-label">?»è©±ï¼?/span>
            <span class="inspector-info-value">${inspector.phone}</span>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div class="inspector-card-footer">
        <button class="btn btn-primary btn-mini" onclick="openEditInspectorModal('${inspector.id}')">
          <span>?ï? ç·¨è¼¯</span>
        </button>
        ${isActive ?
          `<button class="btn btn-danger btn-mini" onclick="confirmDeactivateInspector('${inspector.id}')">
            <span>?¸ï? ?œç”¨</span>
          </button>` :
          `<button class="btn btn-success btn-mini" onclick="confirmActivateInspector('${inspector.id}')">
            <span>?¶ï? ?Ÿç”¨</span>
          </button>`
        }
      </div>
    `;

      container.appendChild(card);
    });
  });
}

function generateInspectorId(dept) {
  const prefix = DEPT_CODE_MAP[dept];
  if (!prefix) {
    return null;
  }

  // ?¾å‡ºè©²éƒ¨?€?¾æ??„æ?å¤§ç·¨??  const deptInspectors = allInspectorsWithStatus.filter(ins => ins.dept === dept);
  let maxNumber = 0;

  deptInspectors.forEach(ins => {
    if (ins.id && ins.id.startsWith(prefix)) {
      const numPart = ins.id.substring(prefix.length);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  // ?Ÿæ??°ç·¨?Ÿï??©ä??¸ï?
  const newNumber = maxNumber + 1;
  return `${prefix}${String(newNumber).padStart(2, '0')}`;
}

function openAddInspectorModal() {
  document.getElementById('addInspectorDept').value = '';
  document.getElementById('addInspectorName').value = '';
  document.getElementById('addInspectorTitle').value = '';
  document.getElementById('addInspectorProfession').value = '';
  document.getElementById('addInspectorPhone').value = '';
  document.getElementById('addInspectorReason').value = '';
  document.getElementById('addInspectorIdPreview').textContent = 'è«‹å??¸æ??¨é?';

  document.getElementById('addInspectorModal').style.display = 'flex';
}

function updateInspectorIdPreview() {
  const dept = document.getElementById('addInspectorDept').value;
  const previewElement = document.getElementById('addInspectorIdPreview');

  if (!dept) {
    previewElement.textContent = 'è«‹å??¸æ??¨é?';
    previewElement.style.color = 'var(--text-muted)';
    return;
  }

  const newId = generateInspectorId(dept);
  if (newId) {
    previewElement.textContent = newId;
    previewElement.style.color = 'var(--primary)';
    previewElement.style.fontWeight = 'bold';
  } else {
    previewElement.textContent = '?¡æ??Ÿæ?ç·¨è?';
    previewElement.style.color = 'var(--error)';
  }
}

function closeAddInspectorModal() {
  document.getElementById('addInspectorModal').style.display = 'none';
}

function confirmAddInspector() {
  const dept = document.getElementById('addInspectorDept').value;
  const name = document.getElementById('addInspectorName').value.trim();
  const title = document.getElementById('addInspectorTitle').value.trim();
  const profession = document.getElementById('addInspectorProfession').value;
  const phone = document.getElementById('addInspectorPhone').value.trim();
  const reason = document.getElementById('addInspectorReason').value.trim();

  if (!dept || !name || !title || !profession || !reason) {
    showToast('è«‹å¡«å¯«æ??‰å?å¡«æ?ä½?, true);
    return;
  }

  // ?Ÿæ?æª¢é??¡ç·¨??  const newId = generateInspectorId(dept);
  if (!newId) {
    showToast('?¡æ??Ÿæ?æª¢é??¡ç·¨?Ÿï?è«‹æª¢?¥éƒ¨?€è¨­å?', true);
    return;
  }

  const confirmMessage = `
    <p><strong>???°å?æª¢é???/strong></p>
    <p><strong>?”¢ ç·¨è?ï¼?/strong><span style="color: var(--primary); font-weight: bold;">${newId}</span></p>
    <p><strong>?¢ ?¨é?ï¼?/strong>${dept}</p>
    <p><strong>?‘¤ å§“å?ï¼?/strong>${name}</p>
    <p><strong>?? ?·ç¨±ï¼?/strong>${title}</p>
    <p><strong>?”§ å°ˆæ¥­ï¼?/strong>${profession}</p>
    ${phone ? `<p><strong>?? ?»è©±ï¼?/strong>${phone}</p>` : ''}
    <p><strong>?? ?°å??Ÿå?ï¼?/strong>${reason}</p>
    <p style="margin-top: 1rem; color: var(--warning);">? ï? ç¢ºè??°å??ï?</p>
  `;

  showConfirmModal(confirmMessage, function () {
    showLoading();
    google.script.run
      .withSuccessHandler(function (result) {
        hideLoading();
        if (result.success) {
          showToast(`??${result.message}`);
          closeAddInspectorModal();
          loadInspectorManagement();
          loadInitialData();
        } else {
          showToast('?°å?å¤±æ?ï¼? + result.message, true);
        }
      })
      .withFailureHandler(function (error) {
        hideLoading();
        showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
      })
      .addInspector({
        id: newId,
        dept: dept,
        name: name,
        title: title,
        profession: profession,
        phone: phone,
        reason: reason
      });
    closeConfirmModal();
  });
}

function openEditInspectorModal(inspectorId) {
  const inspector = allInspectorsWithStatus.find(ins => ins.id === inspectorId);
  if (!inspector) {
    showToast('?¾ä??°æª¢é©—å“¡è³‡æ?', true);
    return;
  }

  document.getElementById('editInspectorId').value = inspector.id;
  document.getElementById('editInspectorIdDisplay').textContent = inspector.id;
  document.getElementById('editInspectorDept').value = inspector.dept;
  document.getElementById('editInspectorName').value = inspector.name;
  document.getElementById('editInspectorTitle').value = inspector.title;
  document.getElementById('editInspectorProfession').value = inspector.profession;
  document.getElementById('editInspectorPhone').value = inspector.phone || '';
  document.getElementById('editInspectorReason').value = '';

  document.getElementById('editInspectorModal').style.display = 'flex';
}

function closeEditInspectorModal() {
  document.getElementById('editInspectorModal').style.display = 'none';
}

function confirmEditInspector() {
  const id = document.getElementById('editInspectorId').value;
  const dept = document.getElementById('editInspectorDept').value;
  const name = document.getElementById('editInspectorName').value.trim();
  const title = document.getElementById('editInspectorTitle').value.trim();
  const profession = document.getElementById('editInspectorProfession').value;
  const phone = document.getElementById('editInspectorPhone').value.trim();
  const reason = document.getElementById('editInspectorReason').value.trim();

  if (!dept || !name || !title || !profession || !reason) {
    showToast('è«‹å¡«å¯«æ??‰å?å¡«æ?ä½?, true);
    return;
  }

  const confirmMessage = `
    <p><strong>?ï? ä¿®æ”¹æª¢é??¡è???/strong></p>
    <p><strong>?? ç·¨è?ï¼?/strong>${id}</p>
    <p><strong>?¢ ?¨é?ï¼?/strong>${dept}</p>
    <p><strong>?‘¤ å§“å?ï¼?/strong>${name}</p>
    <p><strong>?? ?·ç¨±ï¼?/strong>${title}</p>
    <p><strong>?”§ å°ˆæ¥­ï¼?/strong>${profession}</p>
    ${phone ? `<p><strong>?? ?»è©±ï¼?/strong>${phone}</p>` : ''}
    <p><strong>?? ä¿®æ”¹?Ÿå?ï¼?/strong>${reason}</p>
    <p style="margin-top: 1rem; color: var(--warning);">? ï? ç¢ºè?ä¿®æ”¹?ï?</p>
  `;

  showConfirmModal(confirmMessage, function () {
    showLoading();
    google.script.run
      .withSuccessHandler(function (result) {
        hideLoading();
        if (result.success) {
          showToast(`??${result.message}`);
          closeEditInspectorModal();
          loadInspectorManagement();
          loadInitialData();
        } else {
          showToast('ä¿®æ”¹å¤±æ?ï¼? + result.message, true);
        }
      })
      .withFailureHandler(function (error) {
        hideLoading();
        showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
      })
      .updateInspector({
        id: id,
        dept: dept,
        name: name,
        title: title,
        profession: profession,
        phone: phone,
        reason: reason
      });
    closeConfirmModal();
  });
}

function confirmDeactivateInspector(inspectorId) {
  const inspector = allInspectorsWithStatus.find(ins => ins.id === inspectorId);
  if (!inspector) return;

  showLoading();
  google.script.run
    .withSuccessHandler(function (usage) {
      hideLoading();

      let warningMessage = '';
      if (usage.isUsed) {
        warningMessage = '<div style="background: rgba(245, 158, 11, 0.1); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">';
        warningMessage += '<p style="color: var(--warning); font-weight: 600;">? ï? ä½¿ç”¨?€æ³æ???/p>';

        if (usage.projects.length > 0) {
          warningMessage += '<p style="margin-top: 0.5rem;">æ­¤æª¢é©—å“¡?ºä»¥ä¸‹å·¥ç¨‹ç??è¨­æª¢é??¡ï?</p>';
          warningMessage += '<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">';
          usage.projects.forEach(proj => {
            warningMessage += `<li>${proj.seqNo} - ${proj.name}</li>`;
          });
          warningMessage += '</ul>';
        }

        if (usage.logs.length > 0) {
          warningMessage += `<p style="margin-top: 0.5rem;">?€è¿?0å¤©å…§??${usage.logs.length} ç­†æ—¥èªŒè??„ä½¿?¨æ­¤æª¢é???/p>`;
        }

        warningMessage += '</div>';
      }

      const reason = prompt(`${warningMessage ? warningMessage + '\n' : ''}è«‹è¼¸?¥å??¨å?? ï?`);

      if (!reason || reason.trim() === '') {
        showToast('?ªè¼¸?¥å??¨å?? ï?å·²å?æ¶ˆæ?ä½?, false);
        return;
      }

      const confirmMessage = `
        <p><strong>?¸ï? ?œç”¨æª¢é???/strong></p>
        <p><strong>?? ç·¨è?ï¼?/strong>${inspector.id}</p>
        <p><strong>?‘¤ å§“å?ï¼?/strong>${inspector.name}</p>
        ${warningMessage}
        <p><strong>?? ?œç”¨?Ÿå?ï¼?/strong>${reason}</p>
        <p style="margin-top: 1rem; color: var(--danger);">? ï? ç¢ºè??œç”¨?ï?</p>
      `;

      showConfirmModal(confirmMessage, function () {
        showLoading();
        google.script.run
          .withSuccessHandler(function (result) {
            hideLoading();
            if (result.success) {
              showToast(`??${result.message}`);
              loadInspectorManagement();
              loadInitialData();
            } else {
              showToast('?œç”¨å¤±æ?ï¼? + result.message, true);
            }
          })
          .withFailureHandler(function (error) {
            hideLoading();
            showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
          })
          .deactivateInspector({
            id: inspectorId,
            reason: reason.trim()
          });
        closeConfirmModal();
      });
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('æª¢æŸ¥ä½¿ç”¨?€æ³å¤±?—ï?' + error.message, true);
    })
    .checkInspectorUsage(inspectorId);
}

function confirmActivateInspector(inspectorId) {
  const inspector = allInspectorsWithStatus.find(ins => ins.id === inspectorId);
  if (!inspector) return;

  const reason = prompt('è«‹è¼¸?¥å??¨å?? ï?');

  if (!reason || reason.trim() === '') {
    showToast('?ªè¼¸?¥å??¨å?? ï?å·²å?æ¶ˆæ?ä½?, false);
    return;
  }

  const confirmMessage = `
    <p><strong>?¶ï? ?Ÿç”¨æª¢é???/strong></p>
    <p><strong>?? ç·¨è?ï¼?/strong>${inspector.id}</p>
    <p><strong>?‘¤ å§“å?ï¼?/strong>${inspector.name}</p>
    <p><strong>?? ?Ÿç”¨?Ÿå?ï¼?/strong>${reason}</p>
    <p style="margin-top: 1rem; color: var(--success);">??ç¢ºè??Ÿç”¨?ï?</p>
  `;

  showConfirmModal(confirmMessage, function () {
    showLoading();
    google.script.run
      .withSuccessHandler(function (result) {
        hideLoading();
        if (result.success) {
          showToast(`??${result.message}`);
          loadInspectorManagement();
          loadInitialData();
        } else {
          showToast('?Ÿç”¨å¤±æ?ï¼? + result.message, true);
        }
      })
      .withFailureHandler(function (error) {
        hideLoading();
        showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
      })
      .activateInspector({
        id: inspectorId,
        reason: reason.trim()
      });
    closeConfirmModal();
  });
}

// ç¹¼ç??¨ç¬¬ä¸‰éƒ¨??..

// ============================================
// ?¥è?å¡«å ±?€æ³ç¸½è¦?// ============================================
function loadLogStatus() {
  // showLoading å·²åœ¨ switchTab ä¸­è???  google.script.run
    .withSuccessHandler(function (data) {
      hideLoading();
      renderLogStatus(data);
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¼‰å…¥å¡«å ±?€æ³å¤±?—ï?' + error.message, true);
    })
    .getDailyLogStatus();
}

function renderLogStatus(data) {
  document.getElementById('statusTomorrowDate').textContent = data.tomorrowDate;

  document.getElementById('statTotalProjects').textContent = data.totalProjects;
  document.getElementById('statFilledTomorrow').textContent = data.filledTomorrow;

  const completionRate = data.totalProjects > 0 ?
    Math.round((data.filledTomorrow / data.totalProjects) * 100) : 0;
  document.getElementById('statCompletionRate').textContent = completionRate + '%';

  const container = document.getElementById('deptCardsContainer');
  container.innerHTML = '';

  const deptNames = Object.keys(data.byDept);

  // ä¿®æ­£5ï¼šéƒ¨?€?’å?
  deptNames.sort((a, b) => {
    const aIsTeam = a.includes('??);
    const bIsTeam = b.includes('??);

    if (aIsTeam && !bIsTeam) return -1;
    if (!aIsTeam && bIsTeam) return 1;

    if (a === 'å§”å???€? && b !== 'å§”å???€?) return 1;
    if (a !== 'å§”å???€? && b === 'å§”å???€?) return -1;

    return a.localeCompare(b, 'zh-TW');
  });

  deptNames.forEach(deptName => {
    const deptData = data.byDept[deptName];
    const deptRate = deptData.total > 0 ?
      Math.round((deptData.filled.length / deptData.total) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'dept-card';

    const cardId = `deptCard_${deptName.replace(/\s/g, '_')}`;

    card.innerHTML = `
      <div class="dept-card-header" onclick="toggleDeptCard('${cardId}')">
        <div class="dept-card-title">
          <span class="dept-icon">?¢</span>
          <span class="dept-name">${deptName}</span>
        </div>
        <div class="dept-card-stats">
          <span>${deptData.filled.length} / ${deptData.total}</span>
          ${deptData.missing.length > 0 ?
        `<span class="dept-missing">ç¼?${deptData.missing.length}</span>` : ''}
          <span class="dept-rate" style="background: ${deptRate === 100 ? 'var(--success)' : (deptRate >= 50 ? 'var(--warning)' : 'var(--danger)')}">${deptRate}%</span>
          <span class="dept-toggle" id="${cardId}_toggle">??/span>
        </div>
      </div>
      <div class="dept-card-content" id="${cardId}_content" style="display: none;">
        ${deptData.missing.length > 0 ? `
          <div style="margin-bottom: 1rem;">
            <strong style="color: var(--danger);">? ï? ?ªå¡«å¯?(${deptData.missing.length})</strong>
            ${deptData.missing.map(proj => `
              <div class="project-list-item">
                <div class="project-info">
                  <div class="project-name">${proj.fullName}</div>
                  <div class="project-meta">åºè?ï¼?{proj.seqNo} | ?¿æ”¬?†ï?${proj.contractor}</div>
                </div>
                <span class="status-badge">?ªå¡«å¯?/span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${deptData.filled.length > 0 ? `
          <div>
            <strong style="color: var(--success);">??å·²å¡«å¯?(${deptData.filled.length})</strong>
            ${deptData.filled.map(proj => `
              <div class="project-list-item">
                <div class="project-info">
                  <div class="project-name">${proj.fullName}</div>
                  <div class="project-meta">åºè?ï¼?{proj.seqNo} | ?¿æ”¬?†ï?${proj.contractor}</div>
                </div>
                <span class="status-badge" style="background: var(--success);">å·²å¡«å¯?/span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    container.appendChild(card);
  });
}

function toggleDeptCard(cardId) {
  const content = document.getElementById(`${cardId}_content`);
  const toggle = document.getElementById(`${cardId}_toggle`);

  if (content.style.display === 'none') {
    content.style.display = 'block';
    toggle.textContent = '??;
  } else {
    content.style.display = 'none';
    toggle.textContent = '??;
  }
}

// ============================================
// ä¿®æ­£4ï¼šæ—¥?†å??½ï??ˆä»½?•ç?ä¿®æ­£ï¼?// ============================================
function loadFilledDates() {
  google.script.run
    .withSuccessHandler(function (dates) {
      filledDates = dates;
    })
    .withFailureHandler(function (error) {
      console.error('è¼‰å…¥å·²å¡«å¯«æ—¥?Ÿå¤±?—ï?', error);
    })
    .getFilledDates();
}

function changeMonth(delta) {
  currentCalendarMonth += delta;

  // ä¿®æ­£4ï¼šæ­£ç¢ºè??†æ?ä»½é???  if (currentCalendarMonth > 11) {
    currentCalendarMonth = 0;
    currentCalendarYear += 1;
  } else if (currentCalendarMonth < 0) {
    currentCalendarMonth = 11;
    currentCalendarYear -= 1;
  }

  renderCalendar();
}

function renderCalendar() {
  // ä¿®æ­£4ï¼šæ­£ç¢ºä½¿?¨æ?ä»½ï?JavaScript?ˆä»½??-11ï¼?  const year = currentCalendarYear;
  const month = currentCalendarMonth + 1; // è½‰ç‚º1-12ä¾›å?ç«¯ä½¿??
  showLoading();

  // è¼‰å…¥è©²æ??‡æ—¥è³‡è?
  google.script.run
    .withSuccessHandler(function (holidays) {
      currentMonthHolidays = holidays;
      renderCalendarGrid();
      hideLoading();
    })
    .withFailureHandler(function (error) {
      console.error('è¼‰å…¥?‡æ—¥è³‡è?å¤±æ?ï¼?, error);
      currentMonthHolidays = {};
      renderCalendarGrid();
      hideLoading();
    })
    .getMonthHolidays(year, month);
}

function renderCalendarGrid() {
  const year = currentCalendarYear;
  const month = currentCalendarMonth;

  // ?´æ–°æ¨™é?
  const monthNames = ['1??, '2??, '3??, '4??, '5??, '6??, '7??, '8??, '9??, '10??, '11??, '12??];
  document.getElementById('calendarTitle').textContent = `${year}å¹?${monthNames[month]}`;

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  // ?Ÿæ?æ¨™é?
  const weekdays = ['??, 'ä¸€', 'äº?, 'ä¸?, '??, 'äº?, '??];
  weekdays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-weekday';
    dayHeader.textContent = day;
    grid.appendChild(dayHeader);
  });

  // è¨ˆç?è©²æ?ç¬¬ä?å¤©æ˜¯?Ÿæ?å¹?  const firstDay = new Date(year, month, 1).getDay();

  // è©²æ??‰å?å°‘å¤©
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // å¡«å?ç©ºç™½?¥æ?
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    grid.appendChild(emptyDay);
  }

  // å¡«å??¥æ?
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';

    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // æª¢æŸ¥?¯å¦?ºå???    const isHoliday = currentMonthHolidays[dateString];
    if (isHoliday) {
      dayDiv.classList.add('holiday');
    }

    // æª¢æŸ¥?¯å¦?‰å¡«?±è??™ä¸¦è¨ˆç?å·¥ç??¸é?
    const filledData = filledDates.filter(fd => fd.dateString === dateString);
    const hasData = filledData.length > 0;
    const projectCount = hasData ? filledData.length : 0;

    if (hasData) {
      dayDiv.classList.add('has-data');
      dayDiv.onclick = function () {
        showCalendarDetailModal(dateString);
      };
    } else {
      // æ²’æ?è³‡æ??‚ä??¯ä»¥é»æ?å»ºç½®?¥è?
      dayDiv.style.cursor = 'pointer';
      dayDiv.onclick = function () {
        createLogFromCalendar(dateString);
      };
    }

    dayDiv.innerHTML = `
      <div class="day-number">${day}</div>
      ${isHoliday && isHoliday.remark ? `<div class="day-remark">${isHoliday.remark}</div>` : ''}
      ${hasData ? `<div class="day-indicator" style="color: var(--success); font-weight: 700; font-size: 0.85rem;">${projectCount}ç­?/div>` : '<div class="day-indicator" style="color: var(--text-muted); font-size: 0.75rem;">+å»ºç½®</div>'}
    `;

    grid.appendChild(dayDiv);
  }
}

// å¾æ—¥?†å»ºç½®æ—¥èª?function createLogFromCalendar(dateString) {
  const confirmMessage = `
    <p><strong>?? å»ºç½®?¥è?</strong></p>
    <p><strong>?¥æ?ï¼?/strong>${dateString}</p>
    <p style="margin-top: 1rem;">ç¢ºè?è¦å??›åˆ°?¥è?å¡«å ±?é¢?ï?</p>
  `;

  showConfirmModal(confirmMessage, function () {
    // è¨­ç½®?¥æ?
    document.getElementById('logDatePicker').value = dateString;

    // ?‡æ??°æ—¥èªŒå¡«?±é???    switchTab('logEntry');

    closeConfirmModal();

    // æ»¾å??°é???    window.scrollTo({ top: 0, behavior: 'smooth' });

    showToast(`å·²å??›è‡³?¥è?å¡«å ±ï¼Œæ—¥?Ÿï?${dateString}`);
  });
}

function showCalendarDetailModal(dateString) {
  document.getElementById('detailDateTitle').textContent = dateString;

  showLoading();
  google.script.run
    .withSuccessHandler(function (summaryData) {
      hideLoading();

      const filledData = summaryData.filter(row => row.hasFilled);

      const container = document.getElementById('calendarDetailContent');

      if (filledData.length === 0) {
        container.innerHTML = '<div class="text-muted">è©²æ—¥?Ÿç„¡å¡«å ±è³‡æ?</div>';
      } else {
        container.innerHTML = '<div class="detail-list">' +
          filledData.map(row => `
            <div class="detail-item">
              <div class="detail-header">
                <h4>${row.fullName}</h4>
                <div class="detail-contractor">${row.contractor}</div>
              </div>
              <div class="detail-body">
                <div class="detail-row">
                  <span class="detail-label">?¨é?ï¼?/span>
                  <span>${row.dept}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">æª¢é??¡ï?</span>
                  <span>${row.inspectors || '-'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">?½å·¥äººæ•¸ï¼?/span>
                  <span>${row.isHolidayNoWork ? '?‡æ—¥ä¸æ–½å·? : (row.workersCount + ' äº?)}</span>
                </div>
                ${!row.isHolidayNoWork && row.workItems.length > 0 ? `
                  <div class="detail-row">
                    <span class="detail-label">å·¥é?ï¼?/span>
                    <span>${row.workItems.map(wi => wi.text).join('ï¼?)}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('') +
          '</div>';
      }

      document.getElementById('calendarDetailModal').style.display = 'flex';
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¼‰å…¥?¥æ?è©³æ?å¤±æ?ï¼? + error.message, true);
    })
    .getDailySummaryReport(dateString, 'all', 'all', isGuestMode, currentUserInfo);
}

function closeCalendarDetailModal() {
  document.getElementById('calendarDetailModal').style.display = 'none';
}

// ============================================
// TBM-KY ?Ÿæ??Ÿèƒ½
// ============================================
function openTBMKYModal() {
  const dateString = document.getElementById('summaryDatePicker').value;

  if (!dateString) {
    showToast('è«‹å??¸æ??¥æ?', true);
    return;
  }

  if (currentSummaryData.length === 0) {
    showToast('è«‹å?è¼‰å…¥ç¸½è¡¨è³‡æ?', true);
    return;
  }

  // å¡«å?å·¥ç??¸å–®
  const select = document.getElementById('tbmkyProjectSelect');
  select.innerHTML = '<option value="">è«‹é¸?‡å·¥ç¨?/option>';

  const filledProjects = currentSummaryData.filter(row => row.hasFilled && !row.isHolidayNoWork);

  if (filledProjects.length === 0) {
    showToast('?¶æ—¥?¡å¯?Ÿæ?TBM-KY?„å·¥ç¨?, true);
    return;
  }

  filledProjects.forEach(proj => {
    const option = document.createElement('option');
    option.value = proj.seqNo;
    option.textContent = `${proj.seqNo} - ${proj.fullName}`;
    select.appendChild(option);
  });

  document.getElementById('tbmkyDatePicker').value = dateString;

  document.getElementById('tbmkyModal').style.display = 'flex';
}

function closeTBMKYModal() {
  document.getElementById('tbmkyModal').style.display = 'none';
}

function confirmGenerateTBMKY() {
  const projectSeqNo = document.getElementById('tbmkyProjectSelect').value;
  const dateString = document.getElementById('tbmkyDatePicker').value;
  const mode = document.querySelector('input[name="tbmkyMode"]:checked').value;

  if (!projectSeqNo || !dateString) {
    showToast('è«‹é¸?‡å·¥ç¨‹å??¥æ?', true);
    return;
  }

  closeTBMKYModal();
  showLoading();

  google.script.run
    .withSuccessHandler(function (result) {
      hideLoading();
      if (result.success) {
        showTBMKYResultModal(result);
      } else {
        showToast('?Ÿæ?å¤±æ?ï¼? + result.message, true);
      }
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
    })
    .generateTBMKY({
      projectSeqNo: projectSeqNo,
      dateString: dateString,
      mode: mode
    });
}

function showTBMKYResultModal(result) {
  document.getElementById('tbmkyResultMessage').textContent = result.message;

  const filesList = document.getElementById('tbmkyFilesList');
  filesList.innerHTML = '';

  result.files.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'tbmky-file-item';

    fileItem.innerHTML = `
      <div class="tbmky-file-icon">??</div>
      <div class="tbmky-file-info">
        <div class="tbmky-file-name">${file.name}</div>
        <a href="${file.url}" target="_blank" class="tbmky-file-link">?? ?‹å??‡ä»¶</a>
      </div>
    `;

    filesList.appendChild(fileItem);
  });

  document.getElementById('tbmkyResultModal').style.display = 'flex';
}

function closeTBMKYResultModal() {
  document.getElementById('tbmkyResultModal').style.display = 'none';
}

// ============================================
// å·¥å…·?½æ•¸
// ============================================
function showLoading() {
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;

  if (isError) {
    toast.classList.add('error');
  } else {
    toast.classList.remove('error');
  }

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function showConfirmModal(message, onConfirm) {
  document.getElementById('confirmMessage').innerHTML = message;

  const confirmBtn = document.getElementById('confirmBtn');

  // ç§»é™¤?Šç???½??  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  // æ·»å??°ç???½??  newConfirmBtn.addEventListener('click', function () {
    onConfirm();
  });

  document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
}

function renderProjectSelect(selectId, projects, activeOnly = false) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">è«‹é¸?‡å·¥ç¨?/option>';

  let filteredProjects = projects;

  // ç¯©é¸?½å·¥ä¸­ç?å·¥ç?
  if (activeOnly) {
    filteredProjects = projects.filter(p => p.projectStatus === '?½å·¥ä¸?);
  }

  // å¡«è¡¨äººåª?½ç??°è¢«?‡æ´¾?„å·¥ç¨?  if (currentUserInfo && currentUserInfo.role === 'å¡«è¡¨äº?) {
    const managedProjects = currentUserInfo.managedProjects || [];
    filteredProjects = filteredProjects.filter(p => {
      // ?¯æ´?©ç¨®?¼å?ï¼?      // 1. ç´”å??Ÿï?'1', '2', '3'
      // 2. åºè?+?ç¨±ï¼?1?æ½­-?¯é?', '2?”å?-æ³°è?-å£«æ?'
      return managedProjects.some(managed => {
        // ?å?åºè?ï¼ˆå?ç¬¬ä??‹é??¸å?å­—å?ä¹‹å??„éƒ¨?†ï?
        const managedSeqNo = managed.match(/^\d+/)?.[0];
        return managedSeqNo && p.seqNo.toString() === managedSeqNo;
      });
    });
  }

  filteredProjects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.seqNo;
    option.textContent = `${project.seqNo} - ${project.shortName}`;
    option.setAttribute('data-short-name', project.shortName);
    select.appendChild(option);
  });
}

function truncateText(text, maxLength) {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function openLogEntryForProject(seqNo, projectName) {
  const confirmMessage = `
    <p><strong>?? ?‡æ??³æ—¥èªŒå¡«??/strong></p>
    <p><strong>??ï¸?å·¥ç?ï¼?/strong>${projectName}</p>
    <p>?¯å¦è¦å??›åˆ°?¥è?å¡«å ±?é¢ä¸¦é¸?‡æ­¤å·¥ç?ï¼?/p>
  `;

  showConfirmModal(confirmMessage, function () {
    switchTab('logEntry');
    document.getElementById('logProjectSelect').value = seqNo;
    handleProjectChange();
    closeConfirmModal();

    // æ»¾å??°é???    window.scrollTo({ top: 0, behavior: 'smooth' });

    showToast('??å·²å??›è‡³?¥è?å¡«å ±ï¼Œè?å¡«å¯«è³‡æ?');
  });
}

// ============================================
// ?µç›¤å¿«æ·??// ============================================
document.addEventListener('keydown', function (e) {
  // ESC ?œé?å½ˆç?
  if (e.key === 'Escape') {
    // ä¾å?æª¢æŸ¥ä¸¦é??‰æ??‹ç?å½ˆç?
    if (document.getElementById('editSummaryLogModal').style.display === 'flex') {
      closeEditSummaryLogModal();
    } else if (document.getElementById('editProjectModal').style.display === 'flex') {
      closeEditProjectModal();
    } else if (document.getElementById('addInspectorModal').style.display === 'flex') {
      closeAddInspectorModal();
    } else if (document.getElementById('editInspectorModal').style.display === 'flex') {
      closeEditInspectorModal();
    } else if (document.getElementById('tbmkyModal').style.display === 'flex') {
      closeTBMKYModal();
    } else if (document.getElementById('tbmkyResultModal').style.display === 'flex') {
      closeTBMKYResultModal();
    } else if (document.getElementById('calendarDetailModal').style.display === 'flex') {
      closeCalendarDetailModal();
    } else if (document.getElementById('confirmModal').style.display === 'flex') {
      closeConfirmModal();
    }
  }
});

// ============================================
// å½ˆç?å¤–é??Šé???// ============================================
function setupModalOutsideClick() {
  const modals = [
    'editSummaryLogModal',
    'editProjectModal',
    'addInspectorModal',
    'editInspectorModal',
    'tbmkyModal',
    'tbmkyResultModal',
    'calendarDetailModal',
    'confirmModal'
  ];

  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          switch (modalId) {
            case 'editSummaryLogModal':
              closeEditSummaryLogModal();
              break;
            case 'editProjectModal':
              closeEditProjectModal();
              break;
            case 'addInspectorModal':
              closeAddInspectorModal();
              break;
            case 'editInspectorModal':
              closeEditInspectorModal();
              break;
            case 'tbmkyModal':
              closeTBMKYModal();
              break;
            case 'tbmkyResultModal':
              closeTBMKYResultModal();
              break;
            case 'calendarDetailModal':
              closeCalendarDetailModal();
              break;
            case 'confirmModal':
              closeConfirmModal();
              break;
          }
        }
      });
    }
  });
}

// ?¶DOMè¼‰å…¥å®Œæ?å¾Œè¨­ç½?document.addEventListener('DOMContentLoaded', function () {
  setupModalOutsideClick();
});

// ============================================
// ?²æ­¢?è??äº¤
// ============================================
let isSubmitting = false;

function preventDoubleSubmit(fn) {
  return function (...args) {
    if (isSubmitting) {
      showToast('è«‹å‹¿?è??äº¤', true);
      return;
    }

    isSubmitting = true;

    try {
      fn.apply(this, args);
    } finally {
      setTimeout(() => {
        isSubmitting = false;
      }, 1000);
    }
  };
}

// ============================================
// ?ªå??²å??‰ç¨¿ï¼ˆå¯?¸å??½ï?
// ============================================
function saveDraft() {
  try {
    const draft = {
      logDate: document.getElementById('logDatePicker').value,
      projectSeqNo: document.getElementById('logProjectSelect').value,
      workersCount: document.getElementById('logWorkersCount').value,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('dailyLogDraft', JSON.stringify(draft));
  } catch (error) {
    console.error('?²å??‰ç¨¿å¤±æ?ï¼?, error);
  }
}

function loadDraft() {
  try {
    const draftStr = localStorage.getItem('dailyLogDraft');
    if (!draftStr) return;

    const draft = JSON.parse(draftStr);

    // æª¢æŸ¥?‰ç¨¿?¯å¦??4å°æ???    const draftTime = new Date(draft.timestamp);
    const now = new Date();
    const hoursDiff = (now - draftTime) / 1000 / 60 / 60;

    if (hoursDiff > 24) {
      localStorage.removeItem('dailyLogDraft');
      return;
    }

    // è©¢å??¯å¦è¼‰å…¥?‰ç¨¿
    if (confirm('?¼ç¾?ªæ?äº¤ç??‰ç¨¿ï¼Œæ˜¯?¦è?è¼‰å…¥ï¼?)) {
      if (draft.logDate) document.getElementById('logDatePicker').value = draft.logDate;
      if (draft.projectSeqNo) document.getElementById('logProjectSelect').value = draft.projectSeqNo;
      if (draft.workersCount) document.getElementById('logWorkersCount').value = draft.workersCount;

      showToast('??å·²è??¥è?ç¨?);
    } else {
      localStorage.removeItem('dailyLogDraft');
    }
  } catch (error) {
    console.error('è¼‰å…¥?‰ç¨¿å¤±æ?ï¼?, error);
  }
}

// ============================================
// ?é¢?¢é??æ???// ============================================
window.addEventListener('beforeunload', function (e) {
  // æª¢æŸ¥è¡¨å–®?¯å¦?‰æœª?äº¤?„å…§å®?  const form = document.getElementById('dailyLogForm');
  if (!form) return;

  const hasContent =
    document.getElementById('logProjectSelect').value ||
    document.getElementById('logWorkersCount').value ||
    document.querySelectorAll('.work-item-pair').length > 0;

  if (hasContent) {
    // ?²å??‰ç¨¿
    saveDraft();

    // æ¨™æ??„é›¢?‹æ???    e.preventDefault();
    e.returnValue = '';
  }
});

// ============================================
// ?ˆèƒ½??§ï¼ˆé??¼ç”¨ï¼?// ============================================
function logPerformance(label) {
  if (window.performance && window.performance.now) {
    const time = window.performance.now();
    console.log(`[Performance] ${label}: ${time.toFixed(2)}ms`);
  }
}

// ============================================
// ?¯èª¤è¿½è¹¤
// ============================================
window.addEventListener('error', function (e) {
  console.error('Global error:', e.error);

  // ?¯é¸ï¼šå??¯èª¤è¨˜é??°å?ç«?  if (currentUserInfo && currentUserInfo.role === 'è¶…ç?ç®¡ç???) {
    showToast(`ç³»çµ±?¯èª¤ï¼?{e.message}`, true);
  }
});

window.addEventListener('unhandledrejection', function (e) {
  console.error('Unhandled promise rejection:', e.reason);

  if (currentUserInfo && currentUserInfo.role === 'è¶…ç?ç®¡ç???) {
    showToast(`Promise?¯èª¤ï¼?{e.reason}`, true);
  }
});

// ============================================
// ?ˆæœ¬è³‡è?
// ============================================
// ä½¿ç”¨?…ç®¡?†å???// ============================================

let allUsersData = [];

function loadUserManagement() {
  // é¡¯ç¤º/?±è??ç¤º?‡å?ï¼ˆåªå°è¯çµ¡å“¡é¡¯ç¤ºï¼?  const hintElement = document.getElementById('userManagementHint');
  if (hintElement && currentUserInfo.role === '?¯çµ¡??) {
    hintElement.style.display = 'block';
  }

  // showLoading å·²åœ¨ switchTab ä¸­è???  google.script.run
    .withSuccessHandler(function (users) {
      hideLoading();
      allUsersData = users;
      populateUserDeptFilter();
      applyUserFilters();
    })
    .withFailureHandler(function (error) {
      hideLoading();
      showToast('è¼‰å…¥ä½¿ç”¨?…è??™å¤±?—ï?' + error.message, true);
    })
    .getAllUsers();
}

function populateUserDeptFilter() {
  const deptSet = new Set();
  allUsersData.forEach(user => {
    if (user.dept && user.dept.trim()) {
      deptSet.add(user.dept);
    }
  });

  // ?¯çµ¡?¡æ??é?æ¿¾ï??ªé¡¯ç¤ºè‡ªå·±éƒ¨?€ + å§”å???€ éƒ¨?€
  let deptArray = Array.from(deptSet).sort();
  if (currentUserInfo.role === '?¯çµ¡??) {
    deptArray = deptArray.filter(dept => {
      return dept === currentUserInfo.dept || dept.includes('å§”å???€?);
    });
  }

  const deptFilter = document.getElementById('userDeptFilter');
  deptFilter.innerHTML = '<option value="all">?¨éƒ¨?¨é?</option>';

  deptArray.forEach(dept => {
    const option = document.createElement('option');
    option.value = dept;
    option.textContent = dept;
    deptFilter.appendChild(option);
  });
}

function applyUserFilters() {
  const roleFilter = document.getElementById('userRoleFilter').value;
  const deptFilter = document.getElementById('userDeptFilter').value;
  const searchText = document.getElementById('userSearchInput').value.toLowerCase().trim();

  // ?¹æ??¶å?ä½¿ç”¨?…è??²ç¯©?¸å¯è¦‹ç?ä½¿ç”¨??  let visibleUsers = allUsersData;
  if (currentUserInfo.role === '?¯çµ¡??) {
    // ?¯çµ¡?¡åª?½ç??°è‡ªå·±éƒ¨?€?„å¡«è¡¨äºº + å§”å???€ éƒ¨?€?„å¡«è¡¨äºº
    visibleUsers = allUsersData.filter(u => {
      return u.role === 'å¡«è¡¨äº? &&
        (u.dept === currentUserInfo.dept || (u.dept && u.dept.includes('å§”å???€?)));
    });
  }

  // ?‰ç”¨è§’è‰²ç¯©é¸
  if (roleFilter !== 'all') {
    visibleUsers = visibleUsers.filter(u => u.role === roleFilter);
  }

  // ?‰ç”¨?¨é?ç¯©é¸
  if (deptFilter !== 'all') {
    visibleUsers = visibleUsers.filter(u => u.dept === deptFilter);
  }

  // ?‰ç”¨?œå?
  if (searchText) {
    visibleUsers = visibleUsers.filter(u => {
      return (u.name && u.name.toLowerCase().includes(searchText)) ||
        (u.account && u.account.toLowerCase().includes(searchText)) ||
        (u.email && u.email.toLowerCase().includes(searchText));
    });
  }

  renderUserCards(visibleUsers);
  updateUserStats(visibleUsers.length);
}

function clearUserFilters() {
  document.getElementById('userRoleFilter').value = 'all';
  document.getElementById('userDeptFilter').value = 'all';
  document.getElementById('userSearchInput').value = '';
  applyUserFilters();
}

function updateUserStats(count) {
  document.getElementById('userTotalCount').textContent = count;
}

function renderUserCards(visibleUsers) {
  const container = document.getElementById('userListContainer');

  if (!visibleUsers || visibleUsers.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #9ca3af;"><p style="font-size: 1.25rem; margin-bottom: 0.5rem;">?“­</p><p>?¾ä??°ç¬¦?ˆæ?ä»¶ç?ä½¿ç”¨??/p></div>';
    return;
  }

  container.innerHTML = visibleUsers.map(user => {
    const managedProjectsText = user.managedProjects.length > 0 ?
      user.managedProjects.join('??) : '<span style="color: #94a3b8;">??/span>';

    // ?¹æ?è§’è‰²è¨­å?é¡è‰²?Œæ¨£å¼?    let roleConfig = {
      color: '#2563eb',
      bgLight: '#eff6ff',
      bgGradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      icon: '?ï?',
      label: 'å¡«è¡¨äº?
    };

    if (user.role === 'è¶…ç?ç®¡ç???) {
      roleConfig = {
        color: '#dc2626',
        bgLight: '#fef2f2',
        bgGradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        icon: '??',
        label: 'è¶…ç?ç®¡ç???
      };
    } else if (user.role === '?¯çµ¡??) {
      roleConfig = {
        color: '#059669',
        bgLight: '#f0fdf4',
        bgGradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        icon: '??',
        label: '?¯çµ¡??
      };
    }

    return `
      <div style="
        background: white;
        border-radius: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
        transition: all 0.3s ease;
        border: 2px solid ${roleConfig.bgLight};
        height: 100%;
        display: flex;
        flex-direction: column;
      " onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'; this.style.transform='translateY(-4px)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)'; this.style.transform='translateY(0)'">

        <div style="background: ${roleConfig.bgGradient}; padding: 1rem 1.5rem; border-bottom: 3px solid ${roleConfig.color};">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="
              width: 48px;
              height: 48px;
              background: ${roleConfig.color};
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ">${roleConfig.icon}</div>
            <div style="flex: 1;">
              <div style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">
                ${user.name}
              </div>
              <div style="
                display: inline-block;
                background: ${roleConfig.color};
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                letter-spacing: 0.02em;
              ">${roleConfig.label}</div>
            </div>
          </div>
        </div>

        <div style="padding: 1.5rem; flex: 1; background: #fafafa;">
          <div style="display: flex; flex-direction: column; gap: 1rem;">

            ${user.dept ? `
            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: white; border-radius: 8px; border-left: 3px solid ${roleConfig.color};">
              <span style="font-size: 1.25rem;">?¢</span>
              <div style="flex: 1;">
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.125rem;">?¨é?</div>
                <div style="color: #1e293b; font-weight: 600;">${user.dept}</div>
              </div>
            </div>
            ` : ''}

            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: white; border-radius: 8px;">
              <span style="font-size: 1.25rem;">??</span>
              <div style="flex: 1;">
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.125rem;">å¸³è?</div>
                <div style="color: #1e293b; font-family: 'Courier New', monospace; font-weight: 600; font-size: 0.95rem;">${user.account}</div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: white; border-radius: 8px;">
              <span style="font-size: 1.25rem;">?“§</span>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.125rem;">Email</div>
                <div style="color: #1e293b; font-size: 0.9rem; word-break: break-all;">${user.email}</div>
              </div>
            </div>

            ${user.managedProjects.length > 0 ? `
            <div style="display: flex; align-items: start; gap: 0.75rem; padding: 0.75rem; background: white; border-radius: 8px;">
              <span style="font-size: 1.25rem;">??ï¸?/span>
              <div style="flex: 1;">
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">ç®¡ç?å·¥ç?</div>
                <div style="color: #1e293b; line-height: 1.6;">${managedProjectsText}</div>
              </div>
            </div>
            ` : ''}

            ${user.supervisorEmail ? `
            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: white; border-radius: 8px;">
              <span style="font-size: 1.25rem;">??</span>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.125rem;">ä¸»ç®¡ Email</div>
                <div style="color: #1e293b; font-size: 0.9rem; word-break: break-all;">${user.supervisorEmail}</div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>

        <div style="padding: 1rem 1.5rem; background: white; border-top: 2px solid #f1f5f9; display: flex; gap: 0.75rem;">
          <button
            onclick="editUser(${user.rowIndex})"
            style="
              flex: 1;
              padding: 0.75rem 1.5rem;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              border: none;
              border-radius: 10px;
              font-weight: 600;
              font-size: 0.95rem;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            "
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(59, 130, 246, 0.3)'"
          >
            ?ï? ç·¨è¼¯
          </button>
          <button
            onclick="deleteUserConfirm(${user.rowIndex}, '${user.name}')"
            style="
              flex: 1;
              padding: 0.75rem 1.5rem;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              border: none;
              border-radius: 10px;
              font-weight: 600;
              font-size: 0.95rem;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
            "
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(239, 68, 68, 0.3)'"
          >
            ??ï¸??ªé™¤
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openAddUserModal() {
  document.getElementById('addUserModalTitle').textContent = '?°å?ä½¿ç”¨??;
  document.getElementById('editUserRowIndex').value = '';
  document.getElementById('userDept').value = '';
  document.getElementById('userName').value = '';
  document.getElementById('userAccount').value = '';
  document.getElementById('userEmail').value = '';
  document.getElementById('userRole').value = 'å¡«è¡¨äº?;
  document.getElementById('userPassword').value = '';
  document.getElementById('userSupervisorEmail').value = '';

  document.getElementById('passwordRequired').style.display = '';
  document.getElementById('passwordHint').style.display = 'none';

  // ?¹æ??¶å?ä½¿ç”¨?…è??²è¨­å®šå¯?¸èº«??  const roleSelect = document.getElementById('userRole');
  if (currentUserInfo.role === '?¯çµ¡??) {
    roleSelect.innerHTML = '<option value="å¡«è¡¨äº?>å¡«è¡¨äº?/option>';
    roleSelect.value = 'å¡«è¡¨äº?;
    roleSelect.disabled = true;
  } else {
    roleSelect.innerHTML = `
      <option value="å¡«è¡¨äº?>å¡«è¡¨äº?/option>
      <option value="?¯çµ¡??>?¯çµ¡??/option>
      <option value="è¶…ç?ç®¡ç???>è¶…ç?ç®¡ç???/option>
    `;
    roleSelect.disabled = false;
  }

  // è¼‰å…¥?¨é??—è¡¨
  loadDepartmentsForUser();

  // è¼‰å…¥å·¥ç??—è¡¨
  loadProjectsForUser();

  handleRoleChange();
  document.getElementById('addUserModal').style.display = 'flex';
}

function loadDepartmentsForUser() {
  google.script.run
    .withSuccessHandler(function (departments) {
      const deptSelect = document.getElementById('userDept');
      deptSelect.innerHTML = '<option value="">è«‹é¸?‡éƒ¨?€</option>';

      // ?¯çµ¡?¡æ??é?æ¿?      let filteredDepts = departments;
      if (currentUserInfo.role === '?¯çµ¡??) {
        filteredDepts = departments.filter(dept => {
          // ?¯çµ¡?¡å¯ä»¥ç??°è‡ªå·±ç??¨é? + ?…å«?Œå?å¤–ç›£? ã€ç??¨é?
          return dept === currentUserInfo.dept || dept.includes('å§”å???€?);
        });
      }

      // ?è¨­?¸æ??¯çµ¡?¡è‡ªå·±ç??¨é?
      const defaultDept = currentUserInfo.role === '?¯çµ¡?? ? currentUserInfo.dept : '';

      filteredDepts.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        deptSelect.appendChild(option);
      });

      // è¨­å??è¨­??      if (defaultDept) {
        deptSelect.value = defaultDept;
      }
    })
    .withFailureHandler(function (error) {
      showToast('è¼‰å…¥?¨é??—è¡¨å¤±æ?ï¼? + error.message, true);
    })
    .getDepartmentsList();
}

function closeAddUserModal() {
  document.getElementById('addUserModal').style.display = 'none';
}

function handleRoleChange() {
  const role = document.getElementById('userRole').value;
  const managedProjectsGroup = document.getElementById('managedProjectsGroup');

  // ?ªæ?å¡«è¡¨äººé?è¦é¸?‡ç®¡?†å·¥ç¨?  if (role === 'å¡«è¡¨äº?) {
    managedProjectsGroup.style.display = 'block';
  } else {
    managedProjectsGroup.style.display = 'none';
  }
}

function loadProjectsForUser() {
  google.script.run
    .withSuccessHandler(function (projects) {
      const container = document.getElementById('managedProjectsCheckboxes');
      container.innerHTML = '';

      // ?‰ä¸»è¾¦éƒ¨?€?†ç?
      const projectsByDept = {};
      projects.forEach(project => {
        const dept = project.dept || '?ªå?é¡?;
        if (!projectsByDept[dept]) {
          projectsByDept[dept] = [];
        }
        projectsByDept[dept].push(project);
      });

      // æ¸²æ??†ç?
      Object.keys(projectsByDept).sort().forEach(dept => {
        const deptDiv = document.createElement('div');
        deptDiv.style.cssText = 'background: white; padding: 1rem; border-radius: 8px; border: 1px solid #e5e7eb;';

        const deptHeader = document.createElement('div');
        deptHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e5e7eb;';
        deptHeader.innerHTML = `
          <strong style="font-size: 1rem; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">?¢</span>
            ${dept} <span style="color: #6b7280; font-weight: normal; font-size: 0.875rem;">(${projectsByDept[dept].length})</span>
          </strong>
          <button
            type="button"
            class="btn-select-all"
            data-dept="${dept}"
            onclick="toggleSelectAllInDept('${dept}')"
            style="padding: 0.375rem 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;"
            onmouseover="this.style.background='#2563eb'"
            onmouseout="this.style.background='#3b82f6'"
          >
            ?¨é¸
          </button>
        `;

        const deptProjects = document.createElement('div');
        deptProjects.id = `dept_${dept.replace(/\s+/g, '_')}`;
        deptProjects.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.5rem;';

        projectsByDept[dept].forEach(project => {
          const checkboxDiv = document.createElement('div');
          checkboxDiv.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 6px; transition: background 0.2s;';
          checkboxDiv.onmouseover = function () { this.style.background = '#f3f4f6'; };
          checkboxDiv.onmouseout = function () { this.style.background = 'transparent'; };

          checkboxDiv.innerHTML = `
            <input
              type="checkbox"
              id="project_${project.seqNo}"
              value="${project.seqNo}"
              data-dept="${dept}"
              style="width: 18px; height: 18px; cursor: pointer;"
            >
            <label for="project_${project.seqNo}" style="cursor: pointer; font-size: 0.9rem; color: #374151; flex: 1;">
              <strong>${project.seqNo}</strong> - ${project.shortName}
            </label>
          `;
          deptProjects.appendChild(checkboxDiv);
        });

        deptDiv.appendChild(deptHeader);
        deptDiv.appendChild(deptProjects);
        container.appendChild(deptDiv);
      });
    })
    .withFailureHandler(function (error) {
      showToast('è¼‰å…¥å·¥ç??—è¡¨å¤±æ?ï¼? + error.message, true);
    })
    .getAllProjects();
}

function toggleSelectAllInDept(dept) {
  const checkboxes = document.querySelectorAll(`#managedProjectsCheckboxes input[data-dept="${dept}"]`);
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);

  // ?‡æ??¨é¸/?–æ??¨é¸
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
  });

  // ?´æ–°?‰é??‡å?
  const btn = document.querySelector(`.btn-select-all[data-dept="${dept}"]`);
  if (btn) {
    btn.textContent = allChecked ? '?¨é¸' : '?–æ??¨é¸';
  }
}

function editUser(rowIndex) {
  const user = allUsersData.find(u => u.rowIndex === rowIndex);
  if (!user) {
    showToast('?¾ä??°ä½¿?¨è€…è???, true);
    return;
  }

  document.getElementById('addUserModalTitle').textContent = 'ç·¨è¼¯ä½¿ç”¨??;
  document.getElementById('editUserRowIndex').value = user.rowIndex;
  document.getElementById('userDept').value = user.dept;
  document.getElementById('userName').value = user.name;
  document.getElementById('userAccount').value = user.account;
  document.getElementById('userEmail').value = user.email;
  document.getElementById('userRole').value = user.role;
  document.getElementById('userPassword').value = '';
  document.getElementById('userSupervisorEmail').value = user.supervisorEmail;

  document.getElementById('passwordRequired').style.display = 'none';
  document.getElementById('passwordHint').style.display = 'block';

  // ?¹æ??¶å?ä½¿ç”¨?…è??²è¨­å®šå¯?¸èº«??  const roleSelect = document.getElementById('userRole');
  if (currentUserInfo.role === '?¯çµ¡??) {
    roleSelect.innerHTML = '<option value="å¡«è¡¨äº?>å¡«è¡¨äº?/option>';
    roleSelect.disabled = true;
  } else {
    roleSelect.innerHTML = `
      <option value="å¡«è¡¨äº?>å¡«è¡¨äº?/option>
      <option value="?¯çµ¡??>?¯çµ¡??/option>
      <option value="è¶…ç?ç®¡ç???>è¶…ç?ç®¡ç???/option>
    `;
    roleSelect.disabled = false;
  }

  // è¼‰å…¥å·¥ç??—è¡¨ä¸¦å‹¾?¸å·²?¸å·¥ç¨?  google.script.run
    .withSuccessHandler(function (projects) {
      const container = document.getElementById('managedProjectsCheckboxes');
      container.innerHTML = '';

      // ?‰ä¸»è¾¦éƒ¨?€?†ç? (ç·¨è¼¯æ¨¡å?ä¸‹ä??€?†ç?æ¸²æ?ä»¥ä??ä??´æ€?
      const projectsByDept = {};
      projects.forEach(project => {
        const dept = project.dept || '?ªå?é¡?;
        if (!projectsByDept[dept]) {
          projectsByDept[dept] = [];
        }
        projectsByDept[dept].push(project);
      });

      Object.keys(projectsByDept).sort().forEach(dept => {
        const deptDiv = document.createElement('div');
        deptDiv.style.cssText = 'background: white; padding: 1rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 0.5rem;';

        const deptHeader = document.createElement('div');
        deptHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e5e7eb;';
        deptHeader.innerHTML = `
          <strong style="font-size: 1rem; color: #1f2937;">${dept}</strong>
          <button type="button" class="btn-select-all" data-dept="${dept}" onclick="toggleSelectAllInDept('${dept}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: #eee; border: none; border-radius: 4px; cursor: pointer;">?¨é¸</button>
        `;

        const deptProjects = document.createElement('div');
        deptProjects.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.5rem;';

        projectsByDept[dept].forEach(project => {
          const isChecked = user.managedProjects.includes(project.seqNo);
          const checkboxDiv = document.createElement('div');
          checkboxDiv.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 6px;';

          checkboxDiv.innerHTML = `
            <input type="checkbox" id="project_${project.seqNo}" value="${project.seqNo}" data-dept="${dept}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
            <label for="project_${project.seqNo}" style="cursor: pointer; font-size: 0.9rem;">${project.seqNo} - ${project.shortName}</label>
          `;
          deptProjects.appendChild(checkboxDiv);
        });

        deptDiv.appendChild(deptHeader);
        deptDiv.appendChild(deptProjects);
        container.appendChild(deptDiv);
      });
    })
    .getAllProjects();

  handleRoleChange();
  document.getElementById('addUserModal').style.display = 'flex';
}

function confirmAddUser() {
  const rowIndex = document.getElementById('editUserRowIndex').value;
  const dept = document.getElementById('userDept').value.trim();
  const name = document.getElementById('userName').value.trim();
  const account = document.getElementById('userAccount').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const role = document.getElementById('userRole').value;
  const password = document.getElementById('userPassword').value;
  const supervisorEmail = document.getElementById('userSupervisorEmail').value.trim();

  // é©—è?å¿…å¡«æ¬„ä?
  if (!name || !account || !email) {
    showToast('è«‹å¡«å¯«æ??‰å?å¡«æ?ä½?, true);
    return;
  }

  // ?°å??‚å?ç¢¼ç‚ºå¿…å¡«
  if (!rowIndex && !password) {
    showToast('è«‹è¼¸?¥å?ç¢?, true);
    return;
  }

  // ?–å??¸ä¸­?„å·¥ç¨?  let managedProjects = [];
  if (role === 'å¡«è¡¨äº?) {
    const checkboxes = document.querySelectorAll('#managedProjectsCheckboxes input[type="checkbox"]:checked');
    managedProjects = Array.from(checkboxes).map(cb => cb.value);

    if (managedProjects.length === 0) {
      showToast('å¡«è¡¨äººè‡³å°‘é?è¦é¸?‡ä??‹å¯ç®¡ç??„å·¥ç¨?, true);
      return;
    }
  }

  const userData = {
    dept,
    name,
    account,
    email,
    role,
    password,
    managedProjects,
    supervisorEmail
  };

  if (rowIndex) {
    // ç·¨è¼¯ï¼šé¡¯ç¤ºç¢ºèªè?çª?    userData.rowIndex = parseInt(rowIndex);

    // ?¾åˆ°?Ÿå?ä½¿ç”¨?…è???    const originalUser = allUsersData.find(u => u.rowIndex === userData.rowIndex);

    showEditUserConfirmModal(originalUser, userData);
  } else {
    // ?°å?
    showLoading();
    google.script.run
      .withSuccessHandler(function (result) {
        hideLoading();
        if (result.success) {
          showToast('??' + result.message);
          closeAddUserModal();
          loadUserManagement();
        } else {
          showToast('?°å?å¤±æ?ï¼? + result.message, true);
        }
      })
      .withFailureHandler(function (error) {
        hideLoading();
        showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
      })
      .addUser(userData);
  }
}

function deleteUserConfirm(rowIndex, userName) {
  const confirmMessage = `
    <p><strong>??ï¸??ªé™¤ä½¿ç”¨??/strong></p>
    <p><strong>ä½¿ç”¨?…ï?</strong>${userName}</p>
    <p style="margin-top: 1rem; color: var(--danger);">? ï? ç¢ºè??ªé™¤?ï?æ­¤æ?ä½œç„¡æ³•å¾©?Ÿï?</p>
  `;

  showConfirmModal(confirmMessage, function () {
    showLoading();
    google.script.run
      .withSuccessHandler(function (result) {
        hideLoading();
        if (result.success) {
          showToast('??' + result.message);
          loadUserManagement();
        } else {
          showToast('?ªé™¤å¤±æ?ï¼? + result.message, true);
        }
      })
      .withFailureHandler(function (error) {
        hideLoading();
        showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
      })
      .deleteUser(rowIndex);
  });
}

function showEditUserConfirmModal(originalUser, newUserData) {
  // å»ºç?å°æ? HTML
  const changes = [];

  // æ¯”å??¨é?
  if (originalUser.dept !== newUserData.dept) {
    changes.push(`<tr>
      <td>?¨é?</td>
      <td style="color: #9ca3af;">${originalUser.dept || 'ï¼ˆç©º?½ï?'}</td>
      <td style="color: var(--primary); font-weight: 600;">${newUserData.dept || 'ï¼ˆç©º?½ï?'}</td>
    </tr>`);
  } else {
    changes.push(`<tr>
      <td>?¨é?</td>
      <td colspan="2">${newUserData.dept}</td>
    </tr>`);
  }

  // æ¯”å?å§“å?
  if (originalUser.name !== newUserData.name) {
    changes.push(`<tr>
      <td>å§“å?</td>
      <td style="color: #9ca3af;">${originalUser.name}</td>
      <td style="color: var(--primary); font-weight: 600;">${newUserData.name}</td>
    </tr>`);
  } else {
    changes.push(`<tr>
      <td>å§“å?</td>
      <td colspan="2">${newUserData.name}</td>
    </tr>`);
  }

  // æ¯”å?å¸³è?
  if (originalUser.account !== newUserData.account) {
    changes.push(`<tr>
      <td>å¸³è?</td>
      <td style="color: #9ca3af;">${originalUser.account}</td>
      <td style="color: var(--primary); font-weight: 600;">${newUserData.account}</td>
    </tr>`);
  } else {
    changes.push(`<tr>
      <td>å¸³è?</td>
      <td colspan="2">${newUserData.account}</td>
    </tr>`);
  }

  // æ¯”å?ä¿¡ç®±
  if (originalUser.email !== newUserData.email) {
    changes.push(`<tr>
      <td>ä¿¡ç®±</td>
      <td style="color: #9ca3af;">${originalUser.email}</td>
      <td style="color: var(--primary); font-weight: 600;">${newUserData.email}</td>
    </tr>`);
  } else {
    changes.push(`<tr>
      <td>ä¿¡ç®±</td>
      <td colspan="2">${newUserData.email}</td>
    </tr>`);
  }

  // æ¯”å?èº«å?
  if (originalUser.role !== newUserData.role) {
    changes.push(`<tr>
      <td>èº«å?</td>
      <td style="color: #9ca3af;">${originalUser.role}</td>
      <td style="color: var(--primary); font-weight: 600;">${newUserData.role}</td>
    </tr>`);
  } else {
    changes.push(`<tr>
      <td>èº«å?</td>
      <td colspan="2">${newUserData.role}</td>
    </tr>`);
  }

  // æ¯”å?ç®¡ç?å·¥ç?ï¼ˆå?å¡«è¡¨äººï?
  if (newUserData.role === 'å¡«è¡¨äº?) {
    const originalProjects = originalUser.managedProjects ? originalUser.managedProjects.join(', ') : '';
    const newProjects = newUserData.managedProjects ? newUserData.managedProjects.join(', ') : '';

    if (originalProjects !== newProjects) {
      changes.push(`<tr>
        <td>ç®¡ç?å·¥ç?</td>
        <td style="color: #9ca3af;">${originalProjects || 'ï¼ˆç„¡ï¼?}</td>
        <td style="color: var(--primary); font-weight: 600;">${newProjects || 'ï¼ˆç„¡ï¼?}</td>
      </tr>`);
    } else {
      changes.push(`<tr>
        <td>ç®¡ç?å·¥ç?</td>
        <td colspan="2">${newProjects || 'ï¼ˆç„¡ï¼?}</td>
      </tr>`);
    }
  }

  const confirmMessage = `
    <div style="max-width: 600px;">
      <h3 style="margin-top: 0; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 1.5rem;">??</span>
        <span>ç¢ºè?ä¿®æ”¹ä½¿ç”¨?…è???/span>
      </h3>
      <p style="color: #6b7280; margin-bottom: 1.5rem;">
        è«‹ç¢ºèªä»¥ä¸‹è??™æ˜¯?¦æ­£ç¢ºï?
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e5e7eb; width: 120px;">æ¬„ä?</th>
            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e5e7eb;">ä¿®æ”¹??/th>
            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e5e7eb;">ä¿®æ”¹å¾?/th>
          </tr>
        </thead>
        <tbody>
          ${changes.join('')}
        </tbody>
      </table>
      <p style="color: #6b7280; font-size: 0.875rem; background: #fef3c7; padding: 1rem; border-radius: 8px; margin: 0;">
        ?’¡ ?ç¤ºï¼šä¿®?¹å??„å…§å®¹æ?ä»?span style="color: var(--primary); font-weight: 600;">?è‰²</span>é¡¯ç¤º
      </p>
    </div>
  `;

  showConfirmModal(confirmMessage, function () {
    // ç¢ºè?å¾ŒåŸ·è¡Œæ›´??    showLoading();
    google.script.run
      .withSuccessHandler(function (result) {
        hideLoading();
        closeConfirmModal();
        if (result.success) {
          showToast('??' + result.message);
          closeAddUserModal();
          loadUserManagement();
        } else {
          showToast('?´æ–°å¤±æ?ï¼? + result.message, true);
        }
      })
      .withFailureHandler(function (error) {
        hideLoading();
        closeConfirmModal();
        showToast('ä¼ºæ??¨éŒ¯èª¤ï?' + error.message, true);
      })
      .updateUser(newUserData);
  });
}

// ============================================
console.log('%cç¶œå??½å·¥??æ¯æ—¥å·¥ç??¥è?ç³»çµ± v2.1', 'color: #2563eb; font-size: 16px; font-weight: bold;');
console.log('%cä¿®æ­£?¥æ?ï¼?025-01-18', 'color: #64748b; font-size: 12px;');
console.log('%c?€??2?…ä¿®æ­?·²å®Œæ?å¯¦ä?', 'color: #10b981; font-size: 12px;');

// ============================================
// ?å??–å???// ============================================
console.log('%c??JavaScript è¼‰å…¥å®Œæ?', 'color: #10b981; font-weight: bold;');


