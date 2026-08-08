const fs = require('fs');
let file = 'apps/web/app/[tenant]/dashboard/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/import \{ StatCard, PageHeader, GlassCard \} from '@\/app\/components\/platform-ui';/g, 'import { PageHeader, GlassCard } from \"@/app/components/platform-ui\";\nimport { StatCard } from \"@/app/components/ui/stat-card\";');

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed StatCard import');
