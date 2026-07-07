const fs = require('fs');
const path = require('path');

const files = [
    'notifications/page.tsx',
    'ponto/page.tsx',
    'rh/page.tsx',
    'time-track/closing/page.tsx',
    'chat/page.tsx',
    'colaboradores/page.tsx',
    'finance/page.tsx',
    'jobs/page.tsx',
    'media/page.tsx'
];

files.forEach(f => {
    const fullPath = path.join('apps', 'web', 'app', '[tenant]', 'dashboard', f);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        // Match redirect(//anything)
        content = content.replace(/redirect\(\/\/([^\)]+)\)/g, 'redirect(`/${params.tenant}/$1`)');
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
    }
});
