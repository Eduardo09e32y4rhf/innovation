import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SupportAuthorizationService } from './support-authorization.service';
import { SupportService } from './support.service';

function setup(role: string) {
  const prisma = { user: { findFirst: vi.fn().mockResolvedValue(null) }, employee: { findFirst: vi.fn().mockResolvedValue(null) } };
  const authorization = new SupportAuthorizationService(prisma as never);
  const repository = { generateTicketNumber: vi.fn(), createTicket: vi.fn(), createEvent: vi.fn() };
  const service = new SupportService(repository as never, authorization, {} as never);
  return { prisma, authorization, repository, service, actor: { sub: 'actor-a', companyId: 'company-a', role } as any };
}

describe('Chamados: referências de outras empresas', () => {
  for (const role of ['ADMIN', 'RH', 'CEO', 'CONTABIL']) {
    for (const field of ['affectedUserId', 'affectedEmployeeId']) {
      it(`${role} não abre chamado referenciando ${field} de B dentro de A`, async () => {
        const ctx = setup(role);
        await expect(ctx.service.createTicket(ctx.actor, { title: 'Acesso', description: 'Pedido de suporte', category: 'ACCESS', [field]: 'target-b' })).rejects.toBeInstanceOf(ForbiddenException);
        const query = field === 'affectedUserId' ? ctx.prisma.user.findFirst : ctx.prisma.employee.findFirst;
        expect(query).toHaveBeenCalledWith({ where: { id: 'target-b', companyId: 'company-a' } });
        expect(ctx.repository.generateTicketNumber).not.toHaveBeenCalled();
        expect(ctx.repository.createTicket).not.toHaveBeenCalled();
        expect(ctx.repository.createEvent).not.toHaveBeenCalled();
      });
    }
    it(`${role} continua autorizado a referenciar usuário/funcionário da própria empresa`, async () => {
      const ctx = setup(role);
      ctx.prisma.user.findFirst.mockResolvedValue({ id: 'user-a' } as never);
      ctx.prisma.employee.findFirst.mockResolvedValue({ id: 'employee-a' } as never);
      await expect(ctx.authorization.assertCanCreateTicket(ctx.actor, 'user-a', 'employee-a')).resolves.toBe(true);
    });
  }

  it('consulta da equipe do gestor inclui empresa na decisão de acesso', async () => {
    const ctx = setup('GESTOR');
    ctx.prisma.employee.findFirst.mockResolvedValueOnce({ id: 'manager-a' } as never).mockResolvedValueOnce(null);
    await expect(ctx.authorization.assertCanViewTicket(ctx.actor, { companyId: 'company-a', affectedEmployeeId: 'target-b' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.prisma.employee.findFirst).toHaveBeenLastCalledWith({ where: { id: 'target-b', managerId: 'manager-a', companyId: 'company-a' } });
  });
});
