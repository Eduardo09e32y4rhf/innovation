const fs = require('fs');

const f1 = 'app/[tenant]/dashboard/escalas/documentos/page.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/isLoading/g, 'loading');
c1 = c1.replace(/useQuery\('documents',\s*/g, 'useQuery(');
c1 = c1.replace(/documents\?\.filter/g, '(documents as any[])?.filter');
c1 = c1.replace(/text=/g, 'label='); // For LoadingState
c1 = c1.replace(/<ErrorState label=/g, '<ErrorState message='); // Fix ErrorState back
c1 = c1.replace(/icon=\{<FileText \/>\}/g, '');
fs.writeFileSync(f1, c1);

const f2 = 'app/[tenant]/dashboard/escalas/equipe/page.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/\.mutate\(\)/g, '.mutate("" as any)');
fs.writeFileSync(f2, c2);

const f3 = 'app/[tenant]/dashboard/escalas/fechamento/page.tsx';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/\.mutate\(\)/g, '.mutate("" as any)');
c3 = c3.replace(/month: parseInt\(month\), year: parseInt\(year\)/g, 'month: month, year: year');
fs.writeFileSync(f3, c3);

const f4 = 'app/[tenant]/dashboard/escalas/ocorrencias/page.tsx';
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/\.mutate\(\)/g, '.mutate("" as any)');
fs.writeFileSync(f4, c4);

console.log('Done script 2');
