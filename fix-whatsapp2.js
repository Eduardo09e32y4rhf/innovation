const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/whatsapp/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/mutaté/g, 'mutate');
fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed mutaté typo');
