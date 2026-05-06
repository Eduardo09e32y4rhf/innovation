const fs = require('fs');
const path = require('path');

function cleanFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            cleanFiles(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            // Remove BOM and replacement characters from the very beginning
            if (content.charCodeAt(0) === 0xFEFF || content.charCodeAt(0) === 0xFFFD || content.startsWith('ï»¿') || content.startsWith('')) {
                content = content.replace(/^(?:\uFEFF|\uFFFD|ï»¿|)+/, '');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Cleaned: ${fullPath}`);
            }
        }
    }
}

const dirs = [
    'c:\\Users\\eduar\\Desktop\\innovation.ia\\legacy\\FRONTEND\\app\\dashboard',
    'c:\\Users\\eduar\\Desktop\\innovation.ia\\apps\\web\\app\\dashboard'
];

dirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        cleanFiles(dir);
    }
});
