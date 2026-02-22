const fs = require('fs');
const path = require('path');

function copyAndFixEncoding(src, dest) {
    let content = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, content, 'utf8');
}

// 1. Generate style.css
let cssContent = fs.readFileSync('ref/CSS.html', 'utf8');
cssContent = cssContent.replace(/^<style>/i, '').replace(/<\/style>$/i, '');
fs.writeFileSync('style.css', cssContent, 'utf8');

// 2. Generate app.js
const jsFiles = [
    'ref/JS_Utils.html',
    'ref/JS_Controller.html',
    'ref/JS_Dashboard.html',
    'ref/JS_LogEntry.html',
    'ref/JS_Summary.html',
    'ref/JS_Admin.html'
];
let appContent = fs.readFileSync('app.js', 'utf8');
// Keep only the mock google.script.run at the top, from line 1 to 60.
// Let's just read the current app.js, find the first }})(); and use that mock part.
let mockEndIndex = appContent.indexOf('})();');
let mockPart = '';
if (mockEndIndex !== -1) {
    let hostCloseIndex = appContent.indexOf('host: {', mockEndIndex);
    if (hostCloseIndex !== -1) {
        let hostCloseEnd = appContent.indexOf('}', hostCloseIndex);
        mockPart = appContent.substring(0, hostCloseEnd + 2) + "\n};\n";
    }
}

let combinedJs = mockPart + "\n";
for (const file of jsFiles) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/^<script>/i, '').replace(/<\/script>$/i, '');
    combinedJs += content + "\n";
}
fs.writeFileSync('app.js', combinedJs, 'utf8');

// 3. Generate index.html
let htmlContent = fs.readFileSync('ref/Index.html', 'utf8');
htmlContent = htmlContent.replace(/<\?\!\=\s*include\('CSS'\);\s*\?>/g, '<link rel="stylesheet" href="./style.css?v=6">');
htmlContent = htmlContent.replace(/<\?\!\=\s*include\('JS_Utils'\);\s*\?>[\s\S]*<\?\!\=\s*include\('JS_Admin'\);\s*\?>/g, '<script src="./app.js?v=6"></script>');
fs.writeFileSync('index.html', htmlContent, 'utf8');

console.log('Files generated successfully with UTF-8 encoding.');
