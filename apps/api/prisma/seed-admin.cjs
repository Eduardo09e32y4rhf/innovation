const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://innovation_rh_user:innovation_rh_pass@localhost:5432/innovation_rh_connect';

const prisma = new PrismaClient();

const companyDocument = '00000000000191';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@innovationrhconnect.local';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

function dateOnly(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const company = await prisma.company.upsert({
    where: { document: companyDocument },
    update: {
      name: process.env.ADMIN_COMPANY_NAME || 'Innovation RH Connect Demo',
    },
    create: {
      name: process.env.ADMIN_COMPANY_NAME || 'Innovation RH Connect Demo',
      document: companyDocument,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      companyId: company.id,
      name: process.env.ADMIN_NAME || 'Administrador',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      companyId: company.id,
      name: process.env.ADMIN_NAME || 'Administrador',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { cpf: '11122233344' },
      update: { companyId: company.id, status: 'ACTIVE' },
      create: {
        companyId: company.id,
        name: 'Ana Lima',
        cpf: '11122233344',
        email: 'ana.lima@innovationrhconnect.local',
        phone: '+5511999990001',
        position: 'Analista de RH',
        department: 'RH',
        admissionDate: dateOnly('2025-01-10'),
        salary: '4500.00',
      },
    }),
    prisma.employee.upsert({
      where: { cpf: '22233344455' },
      update: { companyId: company.id, status: 'ACTIVE' },
      create: {
        companyId: company.id,
        name: 'Bruno Rocha',
        cpf: '22233344455',
        email: 'bruno.rocha@innovationrhconnect.local',
        phone: '+5511999990002',
        position: 'Supervisor Operacional',
        department: 'Operacoes',
        admissionDate: dateOnly('2024-08-15'),
        salary: '5200.00',
      },
    }),
    prisma.employee.upsert({
      where: { cpf: '33344455566' },
      update: { companyId: company.id, status: 'ACTIVE' },
      create: {
        companyId: company.id,
        name: 'Carla Mendes',
        cpf: '33344455566',
        email: 'carla.mendes@innovationrhconnect.local',
        phone: '+5511999990003',
        position: 'Assistente Administrativo',
        department: 'Administrativo',
        admissionDate: dateOnly('2023-03-20'),
        salary: '3800.00',
      },
    }),
  ]);

  await prisma.timeTrack.upsert({
    where: { employeeId_date: { employeeId: employees[0].id, date: dateOnly('2026-06-17') } },
    update: {},
    create: {
      employeeId: employees[0].id,
      date: dateOnly('2026-06-17'),
      entry: new Date('2026-06-17T08:00:00.000Z'),
      lunchStart: new Date('2026-06-17T12:00:00.000Z'),
      lunchReturn: new Date('2026-06-17T13:00:00.000Z'),
      exit: new Date('2026-06-17T17:00:00.000Z'),
      totalWorked: 480,
      dailyBalance: 0,
      observation: 'Seed MVP',
    },
  });

  await prisma.timeTrack.upsert({
    where: { employeeId_date: { employeeId: employees[1].id, date: dateOnly('2026-06-17') } },
    update: {},
    create: {
      employeeId: employees[1].id,
      date: dateOnly('2026-06-17'),
      entry: new Date('2026-06-17T08:15:00.000Z'),
      lunchStart: new Date('2026-06-17T12:10:00.000Z'),
      lunchReturn: new Date('2026-06-17T13:05:00.000Z'),
      exit: new Date('2026-06-17T17:20:00.000Z'),
      totalWorked: 490,
      dailyBalance: 10,
      observation: 'Seed MVP',
    },
  });

  await prisma.vacation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {
      employeeId: employees[2].id,
      status: 'PENDING',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      employeeId: employees[2].id,
      acquisitionPeriod: '2025/2026',
      startDate: dateOnly('2026-07-01'),
      endDate: dateOnly('2026-07-15'),
      daysUsed: 15,
      status: 'PENDING',
      observation: 'Solicitacao seed MVP',
    },
  });

  console.log(JSON.stringify({
    company: { id: company.id, name: company.name },
    admin: { id: admin.id, email: admin.email, password: adminPassword },
    employees: employees.map((employee) => ({ id: employee.id, name: employee.name, cpf: employee.cpf })),
    timeTracks: 2,
    vacations: 1,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
