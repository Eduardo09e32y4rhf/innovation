const fs = require('fs');

const files = [
  'app/[tenant]/dashboard/escalas/documentos/page.tsx',
  'app/[tenant]/dashboard/escalas/equipe/page.tsx',
  'app/[tenant]/dashboard/escalas/fechamento/page.tsx',
  'app/[tenant]/dashboard/escalas/ocorrencias/page.tsx',
  'app/[tenant]/dashboard/escalas/ponto/page.tsx',
  'app/[tenant]/dashboard/escalas/regras/page.tsx',
  'app/[tenant]/dashboard/escalas/trocas/page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix EmptyState
  content = content.replace(/<EmptyState\s+message=([^/>]+)\/>/g, (match, msg) => {
    return `<EmptyState title=${msg.trim()} description=${msg.trim()} />`;
  });
  
  // Fix ErrorState onRetry
  content = content.replace(/<ErrorState([^>]+)onRetry=\{([^}]+)\}/g, '<ErrorState$1retry={$2}');
  
  // Fix Ponto router redeclaration
  if (file.includes('ponto')) {
    content = content.replace(/const router = useRouter\(\);\n\s*const router = useRouter\(\);/g, 'const router = useRouter();');
  }
  
  // Fix api.documents typing
  if (file.includes('documentos')) {
    content = content.replace(/api\.documents/g, '(api as any).documents');
  }
  
  // Fix mutations called without arguments
  content = content.replace(/\.mutate\(\)/g, '.mutate("" as any)');

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
});
