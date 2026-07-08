const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('apps/web/app/[tenant]/dashboard');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('const params = useParams()') && !content.includes('useParams }') && !content.includes('useParams,')) {
        if (content.includes('next/navigation')) {
            content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]next\/navigation['"]/, (m, p1) => {
                return `import { ${p1.trim()}, useParams } from 'next/navigation'`;
            });
        } else {
            content = `import { useParams } from 'next/navigation';\n` + content;
        }
        fs.writeFileSync(f, content);
        console.log('Fixed', f);
    }
});
