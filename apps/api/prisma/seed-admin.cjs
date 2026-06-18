const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');

const prisma = new PrismaClient();

function randomLocalPassword() {
  return randomBytes(18).toString('base64url');
}

function requiredEnv(name) {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production' && (!value || value.length < 8 || value.startsWith('TROQUE_'))) {
    throw new Error(`Missing secure production environment variable: ${name}`);
  }
  return value;
}

async function main() {
  console.log('Seeding plataforma...');

  // 1) Empresa interna onde fica o usuario DEV / engenharia.
  const platformCompanyDocument = process.env.PLATFORM_COMPANY_DOCUMENT || '00000000000000';
  const platformCompany = await prisma.company.upsert({
    where: { document: platformCompanyDocument },
    update: {
      name: 'Innovation Plataforma',
      maxUsers: 99,
      maxEmployees: 999,
      isActive: true,
    },
    create: {
      name: 'Innovation Plataforma',
      document: platformCompanyDocument,
      maxUsers: 99,
      maxEmployees: 999,
      isActive: true,
    },
  });

  // 2) Usuario DEV: acesso global a todas as empresas.
  const devEmail = requiredEnv('DEV_EMAIL') || 'dev@innovation.local';
  const devPassword = requiredEnv('DEV_PASSWORD') || randomLocalPassword();
  await prisma.user.upsert({
    where: { email: devEmail },
    update: { role: 'DEV' },
    create: {
      companyId: platformCompany.id,
      name: 'Engenharia',
      email: devEmail,
      passwordHash: await bcrypt.hash(devPassword, 12),
      role: 'DEV',
    },
  });

  // 3) Empresa demo com admin. Limite 6 = 1 admin + 5 usuarios.
  const demoCompanyDocument = process.env.DEMO_COMPANY_DOCUMENT || '00000000000191';
  const demoCompany = await prisma.company.upsert({
    where: { document: demoCompanyDocument },
    update: {
      name: 'Empresa Demo',
      maxUsers: 6,
      maxEmployees: 50,
      isActive: true,
    },
    create: {
      name: 'Empresa Demo',
      document: demoCompanyDocument,
      maxUsers: 6,
      maxEmployees: 50,
      isActive: true,
    },
  });

  const adminPassword = requiredEnv('ADMIN_PASSWORD') || randomLocalPassword();
  await prisma.user.upsert({
    where: { email: 'admin@innovation.local' },
    update: {},
    create: {
      companyId: demoCompany.id,
      name: 'Admin Demo',
      email: 'admin@innovation.local',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
    },
  });

  console.log('Seed finalizado.');
  console.log('  DEV   ->', devEmail);
  console.log('  ADMIN -> admin@innovation.local');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });