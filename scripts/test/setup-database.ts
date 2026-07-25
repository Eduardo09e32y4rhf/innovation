import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const rootDir = path.resolve(__dirname, '../../');
const envTestPath = path.join(rootDir, '.env.test');
const envExamplePath = path.join(rootDir, '.env.test.example');

if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true });
} else if (fs.existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath, override: true });
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('5436')) {
  console.error('❌ ERRO FATAL: DATABASE_URL não aponta para o banco de teste na porta 5436. Abortando setup por segurança.');
  process.exit(1);
}

console.log('🔄 Executando migrações reais no banco de teste (prisma migrate deploy)...');
try {
  execSync('npx prisma migrate deploy --schema apps/api/prisma/schema.prisma', {
    stdio: 'inherit',
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DATABASE_URL }
  });
  console.log('✅ Banco de dados de teste atualizado e sincronizado com as migrations reais!');
} catch (error) {
  console.error('❌ Falha ao aplicar migrações no banco de teste:', error);
  process.exit(1);
}
