const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/jobs/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/descriçãon/g, 'description');
fs.writeFileSync(file, txt, 'utf8');

let file2 = 'apps/web/app/[tenant]/dashboard/jobs/[jobId]/page.tsx';
let txt2 = fs.readFileSync(file2, 'utf8');
txt2 = txt2.replace(/descriçãon/g, 'description');
fs.writeFileSync(file2, txt2, 'utf8');

console.log('Fixed description typo');
