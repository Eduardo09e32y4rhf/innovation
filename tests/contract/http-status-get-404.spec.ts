import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { PromotionsService } from '../../apps/api/src/modules/promotions/promotions.service';
import { PromotionsController } from '../../apps/api/src/modules/promotions/promotions.controller';
import { PrivacyService } from '../../apps/api/src/modules/privacy/privacy.service';
import { DocumentService } from '../../apps/api/src/modules/documents/document.service';
import { SupportAttachmentService } from '../../apps/api/src/modules/support/support-attachment.service';
import { PlatformService } from '../../apps/api/src/modules/platform/platform.service';
import { ManagementEventsService } from '../../apps/api/src/modules/management/management-events.service';

// API-05: GET nao grava estado de negocio; recurso inexistente = 404; 400 so para entrada invalida.
// RFC 9110 9.2.1 (GET e metodo seguro) e 15.5.5 (404) / 15.5.1 (400) / 15.5.4 (403).
const statusOf = async (fn: () => Promise<unknown>) => {
  try { await fn(); } catch (e: any) { return typeof e?.getStatus === 'function' ? e.getStatus() : `Error:${e?.message}`; }
  return 'no-throw';
};
const make = (Cls: any, props: object) => Object.assign(Object.create(Cls.prototype), props);

describe('API-05 GET /promotions nao aplica promocao (salario/cargo)', () => {
  it('list() so le: nao chama applyDue nem grava employee/employeePromotion', async () => {
    const prisma: any = {
      employeePromotion: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn(), updateMany: vi.fn() },
      employee: { update: vi.fn() },
      $transaction: vi.fn(),
    };
    const svc = make(PromotionsService, { prisma, logger: { error: vi.fn(), log: vi.fn() } });
    const spy = vi.spyOn(svc, 'applyDue');
    await svc.list('c1');
    expect(spy).not.toHaveBeenCalled();
    expect(prisma.employee.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.employeePromotion.update).not.toHaveBeenCalled();
  });
  it('a aplicacao por demanda e POST /promotions/apply-due', () => {
    const route = Reflect.getMetadata('path', PromotionsController.prototype.applyDueNow);
    const method = Reflect.getMetadata('method', PromotionsController.prototype.applyDueNow);
    expect(route).toBe('apply-due');
    expect(method).toBe(1); // RequestMethod.POST
  });
});

describe('API-05 404 onde o recurso nao existe', () => {
  it('GET /legal/job/:jobId/status de job inexistente ou de outra empresa: 404', async () => {
    const svc = make(PrivacyService, { pdfQueue: { getJob: async () => null } });
    expect(await statusOf(() => svc.getJobStatus('j1', 'c1'))).toBe(404);
    const other = make(PrivacyService, { pdfQueue: { getJob: async () => ({ id: 'j1', data: { companyId: 'outra' } }) } });
    expect(await statusOf(() => other.getJobStatus('j1', 'c1'))).toBe(404);
  });
  it('download de documento gerado inexistente: 404; de outra empresa: 403', async () => {
    const prisma: any = { generatedDocument: { findUnique: async () => null, findFirst: async () => null } };
    const svc = make(DocumentService, { prisma });
    expect(await statusOf(() => svc.getDocumentStream({ role: 'RH', companyId: 'c1' }, 'd1'))).toBe(404);
    expect(await statusOf(() => svc.readBuffer('c1', 'd1'))).toBe(404);
    const foreign = make(DocumentService, { prisma: { generatedDocument: { findUnique: async () => ({ id: 'd1', companyId: 'c2' }) } } });
    expect(await statusOf(() => foreign.getDocumentStream({ role: 'RH', companyId: 'c1' }, 'd1'))).toBe(403);
  });
  it('anexo de suporte em chamado inexistente: 404', async () => {
    const svc = make(SupportAttachmentService, { repository: { findPlatformTicketById: async () => null } });
    expect(await statusOf(() => svc.uploadAttachment({ role: 'DEV' }, 't1', {}))).toBe(404);
  });
  it('evento de gestao com funcionario de outra empresa: 404', async () => {
    const svc = make(ManagementEventsService, { prisma: { employee: { findFirst: async () => null } } });
    expect(await statusOf(() => (svc as any).assertEmployee('c1', 'e1'))).toBe(404);
  });
});

describe('API-05 400 so para entrada invalida', () => {
  it('GET /platform/receita/:cnpj com CNPJ de tamanho errado: 400 (nao 409)', async () => {
    const svc = make(PlatformService, {});
    expect(await statusOf(() => svc.lookupCnpj('123'))).toBe(400);
  });
});
