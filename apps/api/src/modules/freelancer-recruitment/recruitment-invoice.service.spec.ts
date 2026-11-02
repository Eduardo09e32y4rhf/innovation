import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecruitmentInvoiceService } from './recruitment-invoice.service';

const freelancer = { sub: 'u-free', role: 'ADMIN', companyId: 'freela-co' } as any;
const client = { sub: 'u-client', role: 'GESTOR', companyId: 'client-co' } as any;

const ENGAGEMENT = { id: 'eng-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'ACTIVE' };

function build(overrides: any = {}) {
  const prisma: any = {
    freelancerEngagement: { findFirst: vi.fn(async () => ENGAGEMENT) },
    jobDelegation: { findFirst: vi.fn(async () => ({ id: 'del-1' })) },
    recruitmentInvoice: {
      count: vi.fn(async () => 0),
      create: vi.fn(async (args: any) => ({ id: 'inv-1', status: 'DRAFT', ...args.data })),
      findUnique: vi.fn(async () => ({ id: 'inv-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'DRAFT' })),
      findFirst: vi.fn(async () => ({ id: 'inv-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'ISSUED' })),
      findMany: vi.fn(async () => []),
      update: vi.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
    },
    ...overrides,
  };
  return { svc: new RecruitmentInvoiceService(prisma), prisma };
}

const dto = { engagementId: 'eng-1', dueDate: '2026-12-01', items: [{ description: 'Vaga Dev Pleno preenchida', jobId: 'job-1', quantity: 1, unitPrice: 3000 }] } as any;

describe('RecruitmentInvoiceService: faturamento freelancer -> cliente', () => {
  it('cria fatura so se o contrato pertence ao freelancer do ator e esta ACTIVE', async () => {
    const { svc, prisma } = build();
    const invoice = await svc.create(freelancer, dto);
    expect(prisma.freelancerEngagement.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'eng-1', freelancerCompanyId: 'freela-co' });
    expect((invoice as any).amount).toBe(3000);

    const { svc: svc2 } = build({ freelancerEngagement: { findFirst: vi.fn(async () => null) } });
    await expect(svc2.create(freelancer, dto)).rejects.toThrow(NotFoundException);

    const { svc: svc3 } = build({ freelancerEngagement: { findFirst: vi.fn(async () => ({ ...ENGAGEMENT, status: 'NEGOTIATION' })) } });
    await expect(svc3.create(freelancer, dto)).rejects.toThrow(BadRequestException);
  });

  it('rejeita item com vaga que nao pertence ao contrato (nao foi delegada nele)', async () => {
    const { svc } = build({ jobDelegation: { findFirst: vi.fn(async () => null) } });
    await expect(svc.create(freelancer, dto)).rejects.toThrow(BadRequestException);
  });

  it('calcula amount somando quantity*unitPrice de todos os itens', async () => {
    const { svc } = build();
    const multi = { ...dto, items: [...dto.items, { description: 'Outra vaga', quantity: 2, unitPrice: 1000 }] };
    const invoice = await svc.create(freelancer, multi);
    expect((invoice as any).amount).toBe(5000);
  });

  it('so o freelancer emite/cancela; so o cliente paga/contesta; 404 para o lado errado', async () => {
    const { svc } = build();
    await expect(svc.issue('inv-1', client)).rejects.toThrow(NotFoundException);
    const issued = await svc.issue('inv-1', freelancer);
    expect((issued as any).status).toBe('ISSUED');

    const { svc: svc2 } = build({
      recruitmentInvoice: {
        findUnique: vi.fn(async () => ({ id: 'inv-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'ISSUED' })),
        update: vi.fn(async (a: any) => ({ id: a.where.id, ...a.data })),
      },
    });
    await expect(svc2.registerPayment('inv-1', freelancer)).rejects.toThrow(NotFoundException);
    const paid = await svc2.registerPayment('inv-1', client);
    expect((paid as any).status).toBe('PAID');
  });

  it('nao permite pagar fatura em DRAFT, nem contestar/cancelar fatura ja PAGA', async () => {
    const { svc } = build({
      recruitmentInvoice: { findUnique: vi.fn(async () => ({ id: 'inv-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'DRAFT' })), update: vi.fn() },
    });
    await expect(svc.registerPayment('inv-1', client)).rejects.toThrow(BadRequestException);

    const { svc: svc2 } = build({
      recruitmentInvoice: { findUnique: vi.fn(async () => ({ id: 'inv-1', freelancerCompanyId: 'freela-co', clientCompanyId: 'client-co', status: 'PAID' })), update: vi.fn() },
    });
    await expect(svc2.dispute('inv-1', client, 'motivo')).rejects.toThrow(BadRequestException);
    await expect(svc2.cancel('inv-1', freelancer)).rejects.toThrow(BadRequestException);
  });

  it('numeracao automatica da fatura usa o ano e a contagem do freelancer', async () => {
    const { svc, prisma } = build({ recruitmentInvoice: { count: vi.fn(async () => 4), create: vi.fn(async (a: any) => ({ id: 'inv-5', ...a.data })) } });
    const invoice = await svc.create(freelancer, dto);
    expect((invoice as any).invoiceNumber).toMatch(/^REC-\d{4}-00005$/);
  });
});
