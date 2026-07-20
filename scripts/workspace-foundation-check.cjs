const fs = require('fs');
const path = require('path');

// Arquivos fundamentais que devem existir na raiz do workspace.
// Este script verifica a integridade da estrutura básica do projeto.
// Não substitui typecheck real do TypeScript nem lint do ESLint.
const required = [
  'package.json',
  'package-lock.json',
  'tsconfig.base.json',
  'tsconfig.json',
  '.npmrc',
  '.gitignore',
  '.env.example',
  'apps/api/package.json',
  'apps/web/package.json',
  'apps/api/prisma/schema.prisma',
  'apps/api/Dockerfile',
  'apps/web/Dockerfile',
  'docker-compose.prod.yml',
  '.github/workflows/ci-cd.yml',
];

let missing = 0;
for (const file of required) {
  if (!fs.existsSync(path.join(process.cwd(), file))) {
    console.error(`[workspace-check] MISSING: ${file}`);
    missing += 1;
  }
}

if (missing > 0) {
  console.error(`\n[workspace-check] ${missing} arquivo(s) obrigatorio(s) ausente(s). Corrija antes de continuar.`);
  process.exit(1);
}

console.log('[workspace-check] OK — estrutura base do workspace verificada.');
