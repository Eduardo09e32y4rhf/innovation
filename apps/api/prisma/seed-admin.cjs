const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MVP admin user...');

  const company = await prisma.company.upsert({
    where: { name: 'Default Company' },
    update: {},
    create: { name: 'Default Company', document: null },
  });

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@innovation.local' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Admin',
      email: 'admin@innovation.local',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Seed finished');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
