const fs = require('fs');

let logJsContent = fs.readFileSync('ref/LogJavaScript.html', 'utf8');

// remove <script>
logJsContent = logJsContent.replace(/^<script>/i, '').replace(/<\/script>$/i, '');

const mockCode = `
// ==========================================
// 替身 mock GAS_API
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbwDuDK2BYwykf0Z-u2FNFwxqyu0NZbE4emYceSMAIa3oD5JRUB9zIzRHfbVxtHdEzfnlg/exec"; // 請替換為部署後的網址

window.GAS_API = (function () {
  function createRunner(successHandler, failureHandler) {
    const handlerObj = {
      withSuccessHandler: function (callback) {
        return createRunner(callback, failureHandler);
      },
      withFailureHandler: function (callback) {
        return createRunner(successHandler, callback);
      }
    };

    return new Proxy(handlerObj, {
      get: function (target, prop) {
        if (prop in target) {
          return target[prop];
        }

        return function (...args) {
          console.log(\`發送 API 請求：\${prop.toString()}\`, args);
          fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: prop,
              args: args
            })
          })
            .then(res => res.json())
            .then(result => {
              console.log(\`收到 API 回應：\${prop.toString()}\`, result);
              if (result.status === 'success') {
                if (successHandler) successHandler(result.data);
              } else {
                if (failureHandler) failureHandler(new Error(result.message));
                else console.error("API Error:", result.message);
              }
            })
            .catch(error => {
              if (failureHandler) failureHandler(error);
              else console.error("Fetch Error:", error);
            });
        };
      }
    });
  }

  return createRunner(null, null);
})();
`;

logJsContent = logJsContent.replace(/google\.script\.run/g, 'window.GAS_API');

let combinedJs = mockCode + "\\n" + logJsContent;
fs.writeFileSync('app.js', combinedJs, 'utf8');
console.log('Successfully rebuilt app.js with full LogJavaScript.html and GAS_API mock');
