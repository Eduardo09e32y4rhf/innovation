import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding new pricing plans...');

  // Deactivate old plans
  await prisma.platformPlan.updateMany({
    data: {
      isActive: false,
      isHidden: true,
    },
  });

  const plans = [
    {
      code: '2026.1-MONTHLY',
      name: 'Mensal',
      description: 'Flexibilidade total sem compromisso',
      price: 249.99,
      cycle: 'MONTHLY' as const,
      commitmentMonths: 1,
      discountPercent: 0,
      baseMonthlyPrice: 249.99,
      userMonthlyPrice: 3.00,
      asaasCycle: 'MONTHLY',
      displayOrder: 1,
      isRecommended: false,
      pricingVersion: '2026.1',
      isActive: true,
      isHidden: false,
    },
    {
      code: '2026.1-QUARTERLY',
      name: 'Trimestral',
      description: 'Economia sem compromisso longo',
      price: 712.47,
      cycle: 'QUARTERLY' as const,
      commitmentMonths: 3,
      discountPercent: 5.00,
      baseMonthlyPrice: 249.99,
      userMonthlyPrice: 3.00,
      asaasCycle: 'QUARTERLY',
      displayOrder: 2,
      isRecommended: false,
      pricingVersion: '2026.1',
      isActive: true,
      isHidden: false,
    },
    {
      code: '2026.1-SEMIANNUALLY',
      name: 'Semestral',
      description: 'Mais economia para empresas em crescimento',
      price: 1379.94,
      cycle: 'SEMIANNUALLY' as const,
      commitmentMonths: 6,
      discountPercent: 8.00,
      baseMonthlyPrice: 249.99,
      userMonthlyPrice: 3.00,
      asaasCycle: 'SEMIANNUALLY',
      displayOrder: 3,
      isRecommended: false,
      pricingVersion: '2026.1',
      isActive: true,
      isHidden: false,
    },
    {
      code: '2026.1-YEARLY',
      name: 'Anual',
      description: 'O melhor custo-benefício para a sua empresa',
      price: 2699.89,
      cycle: 'YEARLY' as const,
      commitmentMonths: 12,
      discountPercent: 10.00,
      baseMonthlyPrice: 249.99,
      userMonthlyPrice: 3.00,
      asaasCycle: 'YEARLY',
      displayOrder: 4,
      isRecommended: true,
      pricingVersion: '2026.1',
      isActive: true,
      isHidden: false,
    }
  ];

  for (const plan of plans) {
    await prisma.platformPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
