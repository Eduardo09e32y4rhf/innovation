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
            if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
        }
    });
    return results;
}

const files = walk('apps/web/app/[tenant]/dashboard');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let changed = false;
    
    if (content.includes("router.push('/dashboard/management?tab=' + next);")) {
        content = content.replace("router.push('/dashboard/management?tab=' + next);", "router.push(`/${tenant}/dashboard/management?tab=` + next);");
        changed = true;
    }
    
    // Check if there are any other hardcoded /dashboard
    if (content.match(/router\.push\(['"`]\/dashboard/)) {
        console.log('Uncaught router.push in', f);
    }
    if (content.match(/href=\{?['"`]\/dashboard/)) {
        if (!f.includes('dashboard-sidebar.tsx')) console.log('Uncaught href in', f);
    }
    
    if (changed) {
        fs.writeFileSync(f, content);
        console.log('Fixed', f);
    }
});
