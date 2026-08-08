const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

const regex = /function MetricCard\(\{[^\}]+\}\:\s*\{[\s\S]*?\}\)\s*\{\s*return\s*\(\s*<GlassCard[\s\S]*?<\/GlassCard>\s*\);\s*\}/;
txt = txt.replace(regex, '');

fs.writeFileSync(file, txt, 'utf8');
console.log('Removed MetricCard function');
