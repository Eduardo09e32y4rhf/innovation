import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../apps/api/src/database/prisma.service';
import { SupportRepository } from '../../../apps/api/src/modules/support/support.repository';
import { SupportAuthorizationService } from '../../../apps/api/src/modules/support/support-authorization.service';
import { SupportService } from '../../../apps/api/src/modules/support/support.service';

describe('Suporte: referências com PostgreSQL real', () => {
  const prisma = new PrismaService();
  const service = new SupportService(new SupportRepository(prisma), new SupportAuthorizationService(prisma), {
    calculateDueDates: () => ({ firstResponseDueAt: new Date(), resolutionDueAt: new Date() }),
  } as never);
  const companies: string[] = [];
  let actorId: string;
  let userB: string;
  let employeeB: string;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !target.pathname.includes('test')) throw new Error('Banco local de testes obrigatório.');
    await prisma.$connect();
    for (const label of ['A', 'B']) companies.push((await prisma.company.create({ data: { name: `support-${label}-${randomUUID()}` } })).id);
    actorId = (await prisma.user.create({ data: { companyId: companies[0], name: 'Ator A', email: `${randomUUID()}@example.test`, passwordHash: 'fixture-only', role: 'CEO' } })).id;
    userB = (await prisma.user.create({ data: { companyId: companies[1], name: 'Usuário B', email: `${randomUUID()}@example.test`, passwordHash: 'fixture-only' } })).id;
    employeeB = (await prisma.employee.create({ data: { companyId: companies[1], name: 'Funcionário B', position: 'Analista', department: 'Equipe', admissionDate: new Date() } })).id;
  });
  afterAll(async () => {
    if (companies.length) await prisma.company.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });
  for (const role of ['CEO', 'CONTABIL'] as const) {
    for (const field of ['affectedUserId', 'affectedEmployeeId']) {
      it(`${role} não grava chamado de A com ${field} de B`, async () => {
        const actor = { sub: actorId, companyId: companies[0], role, name: 'Ator A', email: 'actor@example.test' };
        await expect(service.createTicket(actor, { title: 'Pedido de suporte', description: 'Referência de outra empresa', category: 'ACCESS', [field]: field === 'affectedUserId' ? userB : employeeB })).rejects.toMatchObject({ status: 403 });
        expect(await prisma.supportTicket.count({ where: { companyId: companies[0] } })).toBe(0);
      });
    }
  }
});
