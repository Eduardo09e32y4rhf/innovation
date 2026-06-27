const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando migração de compatibilidade de banco de dados na VPS...');
  
  try {
    // 1. Altera type de notifications para texto puro
    await prisma.$executeRawUnsafe('ALTER TABLE "notifications" ALTER COLUMN "type" TYPE text;');
    console.log('✅ 1. Coluna "type" de "notifications" alterada temporariamente para texto.');
  } catch (err) {
    console.log('ℹ️ Passo 1 já aplicado ou ignorado:', err.message);
  }

  try {
    // 2. Atualiza os valores antigos
    await prisma.$executeRawUnsafe("UPDATE \"notifications\" SET \"type\" = 'SYSTEM_NOTICE' WHERE \"type\" = 'SYSTEM';");
    await prisma.$executeRawUnsafe("UPDATE \"notifications\" SET \"type\" = 'SIMPLE_NOTICE' WHERE \"type\" = 'ADMIN_USER';");
    console.log('✅ 2. Valores antigos de notificações migrados para o novo padrão.');
  } catch (err) {
    console.log('ℹ️ Passo 2 já aplicado ou ignorado:', err.message);
  }

  try {
    // 3. Altera userId de AuditLog de text para uuid
    await prisma.$executeRawUnsafe('ALTER TABLE "AuditLog" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;');
    console.log('✅ 3. Coluna "userId" de "AuditLog" alterada de text para uuid com sucesso.');
  } catch (err) {
    console.log('ℹ️ Passo 3 já aplicado ou ignorado:', err.message);
  }

  try {
    // 4. Remove o tipo antigo
    await prisma.$executeRawUnsafe('DROP TYPE IF EXISTS "NotificationType_old" CASCADE;');
    console.log('✅ 4. Enum antigo "NotificationType_old" removido com sucesso.');
  } catch (err) {
    console.log('ℹ️ Passo 4 já aplicado ou ignorado:', err.message);
  }

  console.log('🎉 Migração manual de dados concluída!');
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
