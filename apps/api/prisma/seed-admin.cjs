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
    update: { 
      role: 'DEV',
      passwordHash: await bcrypt.hash(devPassword, 12),
      isActive: true,
    },
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
      maxUsers: 10,
      maxEmployees: 50,
      isActive: true,
    },
    create: {
      name: 'Empresa Demo',
      document: demoCompanyDocument,
      maxUsers: 10,
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

  // 4) RH user for the demo company.
  const testPassword = adminPassword;
  const rhUser = await prisma.user.upsert({
    where: { email: 'rh@innovation.local' },
    update: {},
    create: {
      companyId: demoCompany.id,
      name: 'RH Demo',
      email: 'rh@innovation.local',
      passwordHash: await bcrypt.hash(testPassword, 12),
      role: 'RH',
    },
  });

  // 5) GESTOR user for the demo company.
  const gestorUser = await prisma.user.upsert({
    where: { email: 'gestor@innovation.local' },
    update: {},
    create: {
      companyId: demoCompany.id,
      name: 'Gestor Demo',
      email: 'gestor@innovation.local',
      passwordHash: await bcrypt.hash(testPassword, 12),
      role: 'GESTOR',
    },
  });

  // 6) FUNCIONARIO user for the demo company.
  const funcUser = await prisma.user.upsert({
    where: { email: 'funcionario@innovation.local' },
    update: {},
    create: {
      companyId: demoCompany.id,
      name: 'Funcionario Demo',
      email: 'funcionario@innovation.local',
      passwordHash: await bcrypt.hash(testPassword, 12),
      role: 'FUNCIONARIO',
    },
  });

  // 7) Create employee records linked to RH, GESTOR, and FUNCIONARIO users.
  const gestorEmployee = await prisma.employee.upsert({
    where: { cpf: '00000000001' },
    update: { userId: gestorUser.id },
    create: {
      companyId: demoCompany.id,
      name: 'Gestor Demo',
      cpf: '00000000001',
      email: 'gestor@innovation.local',
      department: 'Gerencia',
      position: 'Gestor',
      admissionDate: new Date('2024-01-15'),
      birthDate: new Date('1990-05-10'),
      workScale: '5x2',
      status: 'ACTIVE',
      userId: gestorUser.id,
    },
  });

  await prisma.employee.upsert({
    where: { cpf: '00000000002' },
    update: { userId: funcUser.id, managerId: gestorEmployee.id },
    create: {
      companyId: demoCompany.id,
      name: 'Funcionario Demo',
      cpf: '00000000002',
      email: 'funcionario@innovation.local',
      department: 'Operacoes',
      position: 'Analista',
      admissionDate: new Date('2024-03-01'),
      birthDate: new Date('1995-08-20'),
      workScale: '5x2',
      status: 'ACTIVE',
      userId: funcUser.id,
      managerId: gestorEmployee.id,
    },
  });

  await prisma.employee.upsert({
    where: { cpf: '00000000003' },
    update: { userId: rhUser.id },
    create: {
      companyId: demoCompany.id,
      name: 'RH Demo',
      cpf: '00000000003',
      email: 'rh@innovation.local',
      department: 'Recursos Humanos',
      position: 'Analista RH',
      admissionDate: new Date('2024-01-10'),
      birthDate: new Date('1988-12-15'),
      workScale: '5x2',
      status: 'ACTIVE',
      userId: rhUser.id,
    },
  });

  console.log('Seed finalizado.');
  console.log('  DEV          ->', devEmail);
  console.log('  ADMIN        -> admin@innovation.local');
  console.log('  RH           -> rh@innovation.local');
  console.log('  GESTOR       -> gestor@innovation.local');
  console.log('  FUNCIONARIO  -> funcionario@innovation.local');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });