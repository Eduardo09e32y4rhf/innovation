const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/<MetricCard/g, '<StatCard');
txt = txt.replace(/<\/MetricCard>/g, '</StatCard>');
txt = txt.replace(/<StatCard([^>]+)label=/g, '<StatCard=');

if (!txt.includes('import { StatCard')) {
   txt = txt.replace(/import \{ PageHeader/, 'import { StatCard, PageHeader');
}

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed dashboard usages');
