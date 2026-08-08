const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/<StatCard=\"/g, '<StatCard title=\"');
fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed StatCard syntax');
