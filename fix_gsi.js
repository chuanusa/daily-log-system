const fs = require('fs');

let appjs = fs.readFileSync('app.js', 'utf8');

// The collision happens because Google Sign-In script overwrites window.google.
// To bypass this, we rename our mock from window.google.script.run to window.GAS_API
// and replace all google.script.run calls in app.js with GAS_API.

// Replace the mock definition.
appjs = appjs.replace('window.google = window.google || {};\nwindow.google.script = {\n  run: (function () {', 'window.GAS_API = (function () {');
appjs = appjs.replace('  })(),\n  host: {\n    close: function () {\n      console.log("google.script.host.close() called");\n    }\n  }\n};', '  })();');

// Replace all usages of google.script.run with GAS_API
appjs = appjs.replace(/google\.script\.run/g, 'window.GAS_API');

fs.writeFileSync('app.js', appjs, 'utf8');
console.log('Successfully refactored google.script.run to window.GAS_API');
