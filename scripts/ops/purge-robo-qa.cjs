'use strict';
/**
 * Lista e desativa os dados criados pelo robô de QA (empresas e usuários "ROBO-QA").
 * Por padrão só LISTA (dry-run). Nada é apagado de verdade: empresas viram CANCELLED/inativas e
 * usuários ficam inativos com e-mail anonimizado — reversível e sem quebrar histórico/auditoria.
 *
 *   node scripts/ops/purge-robo-qa.cjs                       # só lista
 *   node scripts/ops/purge-robo-qa.cjs --apply --confirm=PURGE-ROBO-QA
 *
 * Na VPS (dentro do container da API):
 *   docker compose -f docker-compose.prod.yml exec api node scripts/ops/purge-robo-qa.cjs
 *
 * Faça backup antes de usar --apply. Critério: nome que começa com "ROBO-QA", slug "robo-qa*"
 * ou e-mail robo-qa.*@example.com. Empresas reais nunca casam com esse critério.
 */
const path = require('node:path');
const { PrismaClient } = require(require.resolve('@prisma/client', { paths: [path.join(__dirname, '../../apps/api')] }));

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes('--confirm=PURGE-ROBO-QA');

async function main() {
  const prisma = new PrismaClient();
  try {
    const companies = await prisma.company.findMany({
      where: { OR: [{ name: { startsWith: 'ROBO-QA', mode: 'insensitive' } }, { slug: { startsWith: 'robo-qa' } }] },
      select: { id: true, name: true, slug: true, status: true, _count: { select: { users: true, employees: true } } },
    });
    const users = await prisma.user.findMany({
      where: { OR: [{ email: { startsWith: 'robo-qa.', mode: 'insensitive' } }, { name: { startsWith: 'ROBO-QA', mode: 'insensitive' } }, { companyId: { in: companies.map((c) => c.id) } }], isActive: true },
      select: { id: true, email: true, name: true, role: true, companyId: true },
    });

    console.log(`Empresas ROBO-QA: ${companies.length}`);
    for (const c of companies) console.log(`  - ${c.name} (${c.slug ?? 'sem slug'}) status=${c.status} usuarios=${c._count.users} funcionarios=${c._count.employees}`);
    console.log(`Usuários ROBO-QA ativos: ${users.length}`);
    for (const u of users) console.log(`  - ${u.email} ${u.role} ${u.name}`);

    if (!apply) { console.log('\nDry-run: nada foi alterado. Para aplicar: --apply --confirm=PURGE-ROBO-QA (depois de um backup).'); return; }
    if (!confirmed) { console.error('Recusado: falta --confirm=PURGE-ROBO-QA.'); process.exitCode = 1; return; }

    await prisma.$transaction(async (tx) => {
      for (const u of users) {
        await tx.user.update({ where: { id: u.id }, data: { isActive: false, email: `purged+${u.id}@robo-qa.invalid` } });
      }
      if (companies.length) {
        await tx.company.updateMany({ where: { id: { in: companies.map((c) => c.id) } }, data: { status: 'CANCELLED', isActive: false, billingStatus: 'CANCELED', suspensionReason: 'robo_qa_purge' } });
      }
    });
    console.log(`\nAplicado: ${users.length} usuário(s) desativado(s), ${companies.length} empresa(s) canceladas.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
