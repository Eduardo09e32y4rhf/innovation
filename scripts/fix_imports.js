const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'frontend', 'app');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let replaced = 0;
walkDir(appDir, function (filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Replace ../../.../components/Path with @/components/Path
        content = content.replace(/['"](\.\.\/)+(components|services|hooks|lib|utils|contexts)(\/[^'"]*)?['"]/g, "'@/$2$3'");

        if (original !== content) {
            fs.writeFileSync(filePath, content, 'utf8');
            replaced++;
            console.log('Fixed imports in', filePath);
        }
    }
});
console.log('Total files updated:', replaced);
