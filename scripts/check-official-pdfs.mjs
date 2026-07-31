import { readFile } from 'node:fs/promises';

const officialPages = [
  'apps/web/app/[tenant]/dashboard/management/page.tsx',
  'apps/web/app/[tenant]/dashboard/vacations/page.tsx',
  'apps/web/app/[tenant]/dashboard/time-track/page.tsx',
  'apps/web/app/[tenant]/dashboard/employees/page.tsx',
  'apps/web/app/[tenant]/dashboard/platform/_components/company-manage-modal.tsx',
];

const violations = [];

for (const file of officialPages) {
  const source = await readFile(file, 'utf8');
  if (/\bprintPdf\b/.test(source)) {
    violations.push(file);
  }
}

if (violations.length > 0) {
  console.error('Documentos oficiais ainda dependem de printPdf no frontend:');
  for (const file of violations) console.error(`- ${file}`);
  process.exit(1);
}

console.log('PDF gate: todos os documentos oficiais sao gerados pelo backend.');
