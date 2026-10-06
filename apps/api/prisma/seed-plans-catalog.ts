import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALL = ['employees', 'time-track', 'vacations', 'management', 'recruitment'];

// price = valor base mensal; includedUnits = usuarios (ou vagas/mes no R&S) cobertos; userMonthlyPrice = adicional por unidade extra.
const plans = [
  { code: 'PREMIUM', name: 'Premium', description: 'Completo: todas as abas, 10 usuarios inclusos', base: 199.99, included: 10, modules: ALL, order: 1, recommended: true },
  { code: 'RS', name: 'R&S', description: 'Recrutamento e Selecao: aba Vagas, ate 50 vagas/mes', base: 99.99, included: 50, modules: ['recruitment'], order: 2, recommended: false },
  { code: 'BASICO', name: 'Basico', description: 'Todas as abas, exceto Vagas', base: 99.99, included: 10, modules: ALL.filter((m) => m !== 'recruitment'), order: 3, recommended: false },
];

async function main() {
  for (const p of plans) {
    const data = {
      code: p.code,
      name: p.name,
      description: p.description,
      price: p.base,
      cycle: 'MONTHLY' as const,
      commitmentMonths: 1,
      discountPercent: 0,
      baseMonthlyPrice: p.base,
      userMonthlyPrice: 2,
      includedUnits: p.included,
      asaasCycle: 'MONTHLY',
      displayOrder: p.order,
      isRecommended: p.recommended,
      pricingVersion: '2026.2',
      activeModules: p.modules,
      isActive: true,
      isHidden: false,
    };
    await prisma.platformPlan.upsert({ where: { code: p.code }, update: data, create: data });
  }
  console.log('Catalogo Premium / R&S / Basico atualizado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
