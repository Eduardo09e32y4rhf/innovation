const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/<MetricCard/g, '<StatCard');
txt = txt.replace(/<\/MetricCard>/g, '</StatCard>');
txt = txt.replace(/<StatCard([^>]+)label=/g, '<StatCard=');

if (!txt.includes('import { StatCard')) {
   txt = txt.replace(/import \{ PageHeader/, 'import { StatCard, PageHeader');
}

const lines = txt.split('\n');
let start = -1;
let end = -1;
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('function MetricCard({ label, value, icon: Icon, detail, trend, trendColor')) {
    start = i;
  }
  // MetricCard ends with </GlassCard> then ); then }
  if (start !== -1 && lines[i].includes('  }')) {
     if (i > start + 5 && lines[i-1].includes(');')) {
       end = i;
       break;
     }
  }
}

if (start !== -1 && end !== -1) {
  lines.splice(start, end - start + 1);
  txt = lines.join('\n');
}

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed dashboard usages safely');
