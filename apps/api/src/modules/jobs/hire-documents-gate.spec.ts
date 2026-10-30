import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JobsService } from './jobs.service';

const payload = { department: 'RH', contractType: 'CLT', admissionDate: '2026-11-10' };

function setup(kit: { required: string[]; approved: string[]; missing: string[] }) {
  const repository = {
    hire: vi.fn().mockResolvedValue({ employee: { id: 'e1' }, alreadyHired: false }),
    fillJobAfterHire: vi.fn().mockResolvedValue(null),
    audit: vi.fn().mockResolvedValue({}),
  } as any;
  repository.offerStatuses = vi.fn().mockResolvedValue([]);
  const documents = { hiringKitStatus: vi.fn().mockResolvedValue(kit), sendHireWelcome: vi.fn() } as any;
  const service = new JobsService(repository, {} as any, { completeWorkflow: vi.fn() } as any, {} as any, {} as any, documents);
  return { service, repository, documents };
}

describe('RS-D-03: contratar exige documentos obrigatórios aprovados', () => {
  it('bloqueia e lista o que falta', async () => {
    const { service, repository } = setup({ required: ['RG', 'CPF'], approved: ['RG'], missing: ['CPF'] });
    const error: any = await service.hire('c1', 'a1', 'u1', payload).catch((e) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify(error.getResponse())).toContain('CPF');
    expect(repository.hire).not.toHaveBeenCalled();
  });

  it('libera quando está tudo aprovado ou nada é exigido', async () => {
    for (const kit of [{ required: ['RG'], approved: ['RG'], missing: [] }, { required: [], approved: [], missing: [] }]) {
      const { service, repository } = setup(kit);
      await service.hire('c1', 'a1', 'u1', payload);
      expect(repository.hire).toHaveBeenCalled();
    }
  });

  it('exceção exige justificativa e fica auditada', async () => {
    const { service, repository } = setup({ required: ['CPF'], approved: [], missing: ['CPF'] });
    await expect(service.hire('c1', 'a1', 'u1', { ...payload, skipDocumentCheck: true } as any)).rejects.toBeInstanceOf(BadRequestException);
    await service.hire('c1', 'a1', 'u1', { ...payload, skipDocumentCheck: true, skipDocumentReason: 'Entrega presencial no primeiro dia' } as any);
    expect(repository.hire).toHaveBeenCalledTimes(1);
    expect(repository.audit).toHaveBeenCalledWith('c1', 'u1', 'HIRE_DOCUMENTS_OVERRIDE', 'a1', expect.objectContaining({ missing: ['CPF'], reason: 'Entrega presencial no primeiro dia' }));
  });
});

describe('RS-C-13: proposta aceita e e-mail de contratação com retentativa', () => {
  const ok = { required: [], approved: [], missing: [] };
  it('bloqueia quando há proposta mas nenhuma aceita; libera com justificativa auditada', async () => {
    const { service, repository } = setup(ok);
    repository.offerStatuses.mockResolvedValue(['SENT', 'DECLINED']);
    await expect(service.hire('c1', 'a1', 'u1', payload)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.hire).not.toHaveBeenCalled();
    await service.hire('c1', 'a1', 'u1', { ...payload, skipOfferCheck: true, skipOfferReason: 'Aceite verbal registrado em ata' } as any);
    expect(repository.audit).toHaveBeenCalledWith('c1', 'u1', 'HIRE_OFFER_OVERRIDE', 'a1', expect.objectContaining({ statuses: ['SENT', 'DECLINED'] }));
  });
  it('libera com proposta aceita ou sem nenhuma proposta', async () => {
    for (const statuses of [['ACCEPTED'], ['SENT', 'ACCEPTED'], []]) {
      const { service, repository } = setup(ok);
      repository.offerStatuses.mockResolvedValue(statuses);
      await service.hire('c1', 'a1', 'u1', payload);
      expect(repository.hire).toHaveBeenCalled();
    }
  });
  it('tenta de novo o e-mail de boas-vindas quando o primeiro envio falha', async () => {
    const { service, documents } = setup(ok);
    documents.sendHireWelcome.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await service.hire('c1', 'a1', 'u1', payload);
    await vi.waitFor(() => expect(documents.sendHireWelcome).toHaveBeenCalledTimes(2), { timeout: 5000 });
  });
});
