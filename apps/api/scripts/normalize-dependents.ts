/**
 * Normaliza Employee.dependents para array JSON (formato canonico usado pelo cadastro).
 * Dry-run por padrao:  npx tsx scripts/normalize-dependents.ts
 * Aplicar:             npx tsx scripts/normalize-dependents.ts --apply
 * Idempotente: registros que ja sao array nao sao tocados.
 */
import { PrismaClient } from '@prisma/client';
import { countDependents } from '../src/common/utils/dependents';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.employee.findMany({ where: { NOT: { dependents: { equals: null as never } } }, select: { id: true, companyId: true, dependents: true } });
  let changed = 0;
  for (const row of rows) {
    if (Array.isArray(row.dependents)) continue;
    const count = countDependents(row.dependents);
    const next = Array.from({ length: count }, (_, i) => ({ nome: `Dependente ${i + 1} (migrado)` }));
    changed += 1;
    console.log(`${apply ? 'UPDATE' : 'DRY-RUN'} ${row.id} ${JSON.stringify(row.dependents)} -> ${count} dependente(s)`);
    if (apply) await prisma.employee.updateMany({ where: { id: row.id, companyId: row.companyId }, data: { dependents: next } });
  }
  console.log(`${rows.length} verificados, ${changed} ${apply ? 'normalizados' : 'a normalizar (use --apply)'}.`);
}

main().finally(() => prisma.$disconnect());
