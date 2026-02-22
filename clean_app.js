const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

// Remove literal \n
appJs = appJs.replace(/\\n/g, '');

// Strip BOM if present
if (appJs.charCodeAt(0) === 0xFEFF) {
    appJs = appJs.slice(1);
}

// Strip BOM anywhere else just in case
appJs = appJs.replace(/\uFEFF/g, '');

fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Fixed literal \\n and BOMs');
