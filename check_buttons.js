const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const uiDir = path.join(__dirname, 'apps/frontend/components');
walkDir(uiDir, function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        // A very basic check: find `<button` that doesn't have `aria-label` inside its tag attributes
        const buttons = content.match(/<button[\s\S]*?>/g);
        if (buttons) {
            buttons.forEach(btn => {
                if (!btn.includes('aria-label') && !btn.includes('{...props}')) {
                    console.log(`Found unlabelled button in: ${filePath}`);
                    console.log(btn);
                    console.log('---');
                }
            });
        }
    }
});
