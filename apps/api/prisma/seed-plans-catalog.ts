import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALL = ['employees', 'time-track', 'vacations', 'management', 'recruitment'];

// price = valor base mensal; includedUnits = colaboradores (ou vagas/mes no So RH) inclusos; extra = adicional por unidade alem do incluso.
const plans = [
  { code: 'RS', name: 'Só RH', description: 'Apenas Recrutamento e Seleção', base: 99.99, included: 50, extra: 2.49, modules: ['recruitment'], order: 1, recommended: false },
  { code: 'BASICO', name: 'Básico', description: 'RH completo para a sua equipe', base: 99.99, included: 10, extra: 2.5, modules: ALL.filter((m) => m !== 'recruitment'), order: 2, recommended: false },
  { code: 'PREMIUM', name: 'Completo', description: 'RH completo + Recrutamento e Seleção', base: 199.99, included: 20, extra: 1.99, modules: ALL, order: 3, recommended: true },
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
      userMonthlyPrice: p.extra,
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
  console.log('Catalogo Só RH / Básico / Completo atualizado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


