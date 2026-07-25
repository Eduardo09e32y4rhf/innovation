import { PrismaClient } from '@prisma/client';
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
  console.error('❌ ERRO FATAL: DATABASE_URL não aponta para o banco de teste na porta 5436. Abortando reset por segurança.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  console.log('🧹 Limpando tabelas do banco de teste (TRUNCATE CASCADE)...');
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';
  `;

  for (const { tablename } of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
    } catch (err) {
      console.error(`Erro ao limpar tabela ${tablename}:`, err);
    }
  }
  console.log('✨ Banco de dados de teste limpo com sucesso!');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
