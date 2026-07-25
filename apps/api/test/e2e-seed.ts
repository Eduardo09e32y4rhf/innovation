import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function run() {
  const passwordHash = await bcrypt.hash('Senha123!', 10);
  
  // 1. Criar Empresa
  const company = await prisma.company.upsert({
    where: { slug: 'acme-e2e' },
    update: {},
    create: {
      name: 'Acme E2E Test',
      slug: 'acme-e2e',
      document: '00.000.000/0001-99',
      status: 'ACTIVE',
    }
  });

  // 2. Criar Personas
  const personas = [
    { email: 'dev@innovation.com', role: 'DEV', name: 'Dev Master' },
    { email: 'comercial@innovation.com', role: 'COMERCIAL', name: 'Comercial Sales' },
    { email: 'admin@acme.com', role: 'ADMIN', name: 'Admin Acme', companyId: company.id },
    { email: 'rh@acme.com', role: 'RH', name: 'RH Acme', companyId: company.id },
    { email: 'gestor@acme.com', role: 'GESTOR', name: 'Gestor Acme', companyId: company.id },
    { email: 'funcionario@acme.com', role: 'FUNCIONARIO', name: 'Funcionario Acme', companyId: company.id },
  ];

  for (const p of personas) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: { passwordHash, role: p.role as any },
      create: {
        email: p.email,
        name: p.name,
        role: p.role as any,
        passwordHash,
        companyId: p.companyId || company.id,
      }
    });
  }

  console.log('E2E Seed completed!');
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
