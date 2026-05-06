const fs = require('fs');
const path = require('path');

function fixEncoding(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixEncoding(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Check if it contains broken characters
            if (content.includes('Ã')) {
                // Convert back from mangled UTF-8
                const fixedContent = Buffer.from(content, 'latin1').toString('utf8');
                fs.writeFileSync(fullPath, fixedContent, 'utf8');
                console.log(`Fixed: ${fullPath}`);
            }
        }
    }
}

const dirs = [
    'c:\\Users\\eduar\\Desktop\\innovation.ia\\FRONTEND\\app\\dashboard',
    'c:\\Users\\eduar\\Desktop\\innovation.ia\\apps\\web\\app\\dashboard'
];

dirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        fixEncoding(dir);
    }
});
