const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const companyName = process.env.ADMIN_COMPANY_NAME || 'Innovation IA';
  const name = process.env.ADMIN_NAME || 'Administrador';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this seed.');
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must have at least 8 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const company = await prisma.company.create({
    data: {
      name: companyName,
      users: {
        create: {
          name,
          email,
          passwordHash,
          role: 'ADMIN',
        },
      },
    },
    include: { users: true },
  });

  console.log(`Admin created: ${company.users[0].email}`);
  console.log(`Company created: ${company.name}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
