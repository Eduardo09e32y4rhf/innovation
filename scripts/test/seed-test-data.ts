import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
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
  console.error('❌ ERRO FATAL: DATABASE_URL não aponta para o banco de teste na porta 5436. Abortando seed por segurança.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  console.log('🌱 Semeando dados determinísticos para o ambiente de testes...');

  const passwordHash = await bcrypt.hash('TestPassword123!', 10);

  // 1. Empresa da Plataforma (SaaS Console)
  const platformCompany = await prisma.company.upsert({
    where: { document: '00000000000000' },
    update: { name: 'Innovation Plataforma', isActive: true },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Innovation Plataforma',
      document: '00000000000000',
      isActive: true,
      maxUsers: 999,
      maxEmployees: 9999,
    },
  });

  // 2. Empresas Clientes de Teste
  const companyA = await prisma.company.upsert({
    where: { document: '11111111000111' },
    update: { name: 'Innovation Tech S.A.', isActive: true },
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Innovation Tech S.A.',
      document: '11111111000111',
      isActive: true,
      maxUsers: 50,
      maxEmployees: 200,
    },
  });

  const companyB = await prisma.company.upsert({
    where: { document: '22222222000122' },
    update: { name: 'Global Corp Ltda.', isActive: true },
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Global Corp Ltda.',
      document: '22222222000122',
      isActive: true,
      maxUsers: 20,
      maxEmployees: 100,
    },
  });

  // 3. Usuários da Plataforma (DEV e COMERCIAL)
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@test.local' },
    update: { role: 'DEV', passwordHash, isActive: true },
    create: {
      companyId: platformCompany.id,
      name: 'Desenvolvedor Plataforma',
      email: 'dev@test.local',
      passwordHash,
      role: 'DEV',
      isActive: true,
    },
  });

  const commercialA = await prisma.user.upsert({
    where: { email: 'comercial.a@test.local' },
    update: { role: 'COMERCIAL', passwordHash, isActive: true },
    create: {
      companyId: platformCompany.id,
      name: 'Comercial Tech S.A.',
      email: 'comercial.a@test.local',
      passwordHash,
      role: 'COMERCIAL',
      isActive: true,
    },
  });

  const commercialB = await prisma.user.upsert({
    where: { email: 'comercial.b@test.local' },
    update: { role: 'COMERCIAL', passwordHash, isActive: true },
    create: {
      companyId: platformCompany.id,
      name: 'Comercial Global Corp',
      email: 'comercial.b@test.local',
      passwordHash,
      role: 'COMERCIAL',
      isActive: true,
    },
  });

  // Associa comercial como dono das respectivas empresas
  await prisma.company.update({
    where: { id: companyA.id },
    data: { commercialOwnerId: commercialA.id },
  });

  await prisma.company.update({
    where: { id: companyB.id },
    data: { commercialOwnerId: commercialB.id },
  });

  // 4. Usuários e Funcionários da Empresa A
  const adminA = await prisma.user.upsert({
    where: { email: 'admin@test.local' },
    update: { role: 'ADMIN', passwordHash, isActive: true },
    create: {
      companyId: companyA.id,
      name: 'Admin Empresa A',
      email: 'admin@test.local',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const rhA = await prisma.user.upsert({
    where: { email: 'rh@test.local' },
    update: { role: 'RH', passwordHash, isActive: true },
    create: {
      companyId: companyA.id,
      name: 'RH Empresa A',
      email: 'rh@test.local',
      passwordHash,
      role: 'RH',
      isActive: true,
    },
  });

  const gestorA = await prisma.user.upsert({
    where: { email: 'gestor@test.local' },
    update: { role: 'GESTOR', passwordHash, isActive: true },
    create: {
      companyId: companyA.id,
      name: 'Gestor Empresa A',
      email: 'gestor@test.local',
      passwordHash,
      role: 'GESTOR',
      isActive: true,
    },
  });

  const func1A = await prisma.user.upsert({
    where: { email: 'func1@test.local' },
    update: { role: 'FUNCIONARIO', passwordHash, isActive: true },
    create: {
      companyId: companyA.id,
      name: 'Funcionario 1 Empresa A',
      email: 'func1@test.local',
      passwordHash,
      role: 'FUNCIONARIO',
      isActive: true,
    },
  });

  const func2A = await prisma.user.upsert({
    where: { email: 'func2@test.local' },
    update: { role: 'FUNCIONARIO', passwordHash, isActive: true },
    create: {
      companyId: companyA.id,
      name: 'Funcionario 2 Empresa A',
      email: 'func2@test.local',
      passwordHash,
      role: 'FUNCIONARIO',
      isActive: true,
    },
  });

  // Criação de Employee records em Company A
  const gestorEmpA = await prisma.employee.upsert({
    where: { cpf: '10000000001' },
    update: { userId: gestorA.id },
    create: {
      companyId: companyA.id,
      name: 'Gestor Empresa A',
      cpf: '10000000001',
      email: 'gestor@test.local',
      department: 'Tecnologia',
      position: 'Coordenador',
      admissionDate: new Date('2025-01-01'),
      birthDate: new Date('1990-01-01'),
      workScale: '5x2',
      status: 'ACTIVE',
      userId: gestorA.id,
    },
  });

  await prisma.employee.upsert({
    where: { cpf: '10000000002' },
    update: { userId: func1A.id, managerId: gestorEmpA.id },
    create: {
      companyId: companyA.id,
      name: 'Funcionario 1 Empresa A',
      cpf: '10000000002',
      email: 'func1@test.local',
      department: 'Tecnologia',
      position: 'Desenvolvedor Junior',
      admissionDate: new Date('2025-02-01'),
      birthDate: new Date('1998-05-15'),
      workScale: '5x2',
      status: 'ACTIVE',
      userId: func1A.id,
      managerId: gestorEmpA.id,
    },
  });

  await prisma.employee.upsert({
    where: { cpf: '10000000003' },
    update: { userId: func2A.id, managerId: gestorEmpA.id },
    create: {
      companyId: companyA.id,
      name: 'Funcionario 2 Empresa A',
      cpf: '10000000003',
      email: 'func2@test.local',
      department: 'Tecnologia',
      position: 'Analista de QA',
      admissionDate: new Date('2025-03-01'),
      birthDate: new Date('1997-10-20'),
      workScale: '5x2',
      status: 'ACTIVE',
      userId: func2A.id,
      managerId: gestorEmpA.id,
    },
  });

  // 5. Usuários na Empresa B (para testes de isolamento entre tenants)
  await prisma.user.upsert({
    where: { email: 'admin.b@test.local' },
    update: { role: 'ADMIN', passwordHash, isActive: true },
    create: {
      companyId: companyB.id,
      name: 'Admin Empresa B',
      email: 'admin.b@test.local',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'func.b@test.local' },
    update: { role: 'FUNCIONARIO', passwordHash, isActive: true },
    create: {
      companyId: companyB.id,
      name: 'Funcionario Empresa B',
      email: 'func.b@test.local',
      passwordHash,
      role: 'FUNCIONARIO',
      isActive: true,
    },
  });

  // 6. Planos de Assinatura Básicos para Teste
  const plans = [
    { code: 'TEST-MONTHLY', name: 'Plano Teste Mensal', price: 100.0, cycle: 'MONTHLY' as const, commitmentMonths: 1, discountPercent: 0, baseMonthlyPrice: 100.0, userMonthlyPrice: 5.0, asaasCycle: 'MONTHLY', displayOrder: 1, isActive: true, isHidden: false, pricingVersion: 'test' },
    { code: 'TEST-YEARLY', name: 'Plano Teste Anual', price: 1000.0, cycle: 'YEARLY' as const, commitmentMonths: 12, discountPercent: 10, baseMonthlyPrice: 100.0, userMonthlyPrice: 5.0, asaasCycle: 'YEARLY', displayOrder: 2, isActive: true, isHidden: false, pricingVersion: 'test' },
  ];

  for (const p of plans) {
    await prisma.platformPlan.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }

  console.log('✅ Semeador de testes finalizado com sucesso!');
  console.log('🧑 DEV: dev@test.local | 💼 COMERCIAL A: comercial.a@test.local | 🏢 ADMIN A: admin@test.local');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
