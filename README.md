# 每日工程日誌系統 (GitHub Pages + Apps Script API)

這是一個純前端設計的網頁應用程式，後端使用 Google Apps Script 作為 API 伺服器。

## 部署方式
1. 將 `code.js` 與 `appsscript.json` 透過 clasp 推送到 Google Apps Script
2. 在 GAS 部署為「網頁應用程式 (Web App)」，設定為「所有人 (Anyone) 可存取」
3. 將部署後的網址貼到前端 `app.js` 裡的 `API_URL`
4. 將所有前端檔案 Push 到 GitHub，並開啟 GitHub Pages
