const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('<<<<<<< HEAD')) return;

    // Matches <<<<<<< HEAD ... ======= ... >>>>>>> 73e3b8a...
    // keeps only the group after =======
    const regex = /<<<<<<< HEAD[\s\S]*?=======\r?\n([\s\S]*?)>>>>>>> [a-f0-9]+/g;

    const newContent = content.replace(regex, '$1');
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log('Fixed', filePath);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === '.git' || file === '.next') continue;
            walkDir(fullPath);
        } else {
            if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
                fixFile(fullPath);
            }
        }
    }
}

console.log("Starting to fix conflicts...");
walkDir(path.join(__dirname, 'frontend/app'));
console.log("Done!");
