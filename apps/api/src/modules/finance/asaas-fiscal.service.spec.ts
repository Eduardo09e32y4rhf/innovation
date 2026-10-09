import { describe, expect, it, vi } from 'vitest';
import { AsaasFiscalService } from './asaas-fiscal.service';
import { AsaasRejectedException, AsaasService } from './asaas.service';

const ON = { ASAAS_NFSE_ENABLED: 'true', ASAAS_NFSE_SERVICE_ID: 'svc-1', ASAAS_NFSE_ISS: '2' };

function setup(env: Record<string, string>, invoice: Record<string, unknown>, existing: unknown[] = []) {
  const prisma = {
    platformInvoice: {
      findUnique: vi.fn().mockResolvedValue({ id: 'inv-1', status: 'PAID', provider: 'ASAAS', asaasPaymentId: 'pay_1', asaasInvoiceId: null, invoiceStatus: null, amount: 199.9, description: 'Mensalidade', deletedAt: null, ...invoice }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const asaas = {
    isConfigured: () => true,
    listInvoicesByPayment: vi.fn().mockResolvedValue({ data: existing }),
    scheduleFiscalInvoice: vi.fn().mockResolvedValue({ id: 'nf_1', status: 'SCHEDULED' }),
    getFiscalInvoice: vi.fn().mockResolvedValue({ id: 'nf_1', status: 'AUTHORIZED', number: '42', pdfUrl: 'https://x/nf.pdf' }),
  };
  const config = { get: (key: string) => env[key] };
  const service = new AsaasFiscalService(prisma as never, asaas as never, config as never);
  return { service, prisma, asaas };
}

describe('AsaasFiscalService', () => {
  it('agenda a NFS-e de fatura paga com o servico e as aliquotas do ambiente', async () => {
    const { service, asaas, prisma } = setup(ON, {});
    const out = await service.ensureForInvoice('inv-1');
    expect(out.result).toBe('SCHEDULED');
    const sent = asaas.scheduleFiscalInvoice.mock.calls[0][0];
    expect(sent).toMatchObject({ payment: 'pay_1', value: 199.9, municipalServiceId: 'svc-1', externalReference: 'inv:inv-1' });
    expect(sent.taxes.iss).toBe(2);
    expect(prisma.platformInvoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ asaasInvoiceId: 'nf_1', invoiceStatus: 'SCHEDULED' }) }));
  });

  it('reaproveita a nota que ja existe no Asaas em vez de duplicar', async () => {
    const { service, asaas } = setup(ON, {}, [{ id: 'nf_old', status: 'AUTHORIZED', number: '7' }]);
    const out = await service.ensureForInvoice('inv-1');
    expect(out.result).toBe('PULLED');
    expect(asaas.scheduleFiscalInvoice).not.toHaveBeenCalled();
  });

  it('nao agenda quando a emissao esta desligada, mas ainda puxa nota existente', async () => {
    const { service, asaas } = setup({}, {});
    const out = await service.ensureForInvoice('inv-1');
    expect(out.result).toBe('SKIPPED');
    expect(out.message).toContain('ASAAS_NFSE_ENABLED');
    expect(asaas.listInvoicesByPayment).toHaveBeenCalled();
    expect(asaas.scheduleFiscalInvoice).not.toHaveBeenCalled();
  });

  it('puxa numero e PDF de nota ja agendada', async () => {
    const { service, prisma } = setup(ON, { asaasInvoiceId: 'nf_1', invoiceStatus: 'SCHEDULED' });
    await service.ensureForInvoice('inv-1');
    expect(prisma.platformInvoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ invoiceNumber: '42', fiscalPdfUrl: 'https://x/nf.pdf', invoiceStatus: 'AUTHORIZED' }) }));
  });

  it('ignora cobranca do Mercado Pago', async () => {
    const { service, asaas } = setup(ON, { provider: 'MERCADOPAGO' });
    expect((await service.ensureForInvoice('inv-1')).result).toBe('SKIPPED');
    expect(asaas.listInvoicesByPayment).not.toHaveBeenCalled();
  });

  it('falha no Asaas nao lanca: marca ERROR para a rotina/botao refazer', async () => {
    const { service, asaas, prisma } = setup(ON, {});
    asaas.scheduleFiscalInvoice.mockRejectedValue(new Error('Asaas: servico municipal invalido'));
    const out = await service.ensureForInvoice('inv-1');
    expect(out).toMatchObject({ result: 'FAILED', message: 'Asaas: servico municipal invalido' });
    expect(prisma.platformInvoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: { invoiceStatus: 'ERROR', nfeStatus: 'ERROR' } }));
  });
});

describe('AsaasService: recusa definitiva x indisponibilidade', () => {
  const make = () => new AsaasService({ get: (k: string) => (k === 'ASAAS_API_KEY' ? '$aact_hmlg_x' : undefined) } as never);
  const reply = (status: number, body: unknown) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, statusText: 'x', json: async () => body }));

  it('400 com lista de erros vira AsaasRejectedException com o motivo', async () => {
    reply(400, { errors: [{ code: 'invalid_object', description: 'O CPF/CNPJ informado é inválido.' }] });
    const error = await make().createCustomer({ name: 'X', cpfCnpj: '1' }).catch((e) => e);
    expect(error).toBeInstanceOf(AsaasRejectedException);
    expect(error.message).toBe('Asaas recusou: O CPF/CNPJ informado é inválido.');
    vi.unstubAllGlobals();
  });

  it('401 (chave errada) e 500 continuam como indisponibilidade, nunca como recusa', async () => {
    for (const status of [401, 500]) {
      reply(status, { errors: [{ description: 'falha' }] });
      const error = await make().getCharge('pay_1').catch((e) => e);
      expect(error).not.toBeInstanceOf(AsaasRejectedException);
      expect(error.getStatus()).toBe(503);
    }
    vi.unstubAllGlobals();
  });
});

describe('AsaasService.createCharge: conta sem site cadastrado', () => {
  const domainError = { ok: false, status: 400, statusText: 'x', json: async () => ({ errors: [{ description: 'Não há nenhum domínio configurado em sua conta. Cadastre um site em Minha Conta na aba Informações.' }] }) };
  const ok = { ok: true, status: 200, json: async () => ({ id: 'pay_1', customer: 'cus_1', value: 20, dueDate: '2026-10-09' }) };
  const make = () => new AsaasService({ get: (k: string) => ({ ASAAS_API_KEY: '$aact_hmlg_x', APP_URL: 'https://innovationia.com.br' } as Record<string, string>)[k] } as never);
  const charge = { value: 20, dueDate: '2026-10-09', description: 'x' };

  it('repete sem redirecionamento quando o Asaas reclama do domínio, e a cobrança nasce', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(domainError).mockResolvedValueOnce(ok);
    vi.stubGlobal('fetch', fetchMock);
    const payment = await make().createCharge('cus_1', charge);
    expect(payment.id).toBe('pay_1');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).callback).toBeDefined();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).callback).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it('outras recusas (ex.: CPF/CNPJ) não são repetidas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: 'x', json: async () => ({ errors: [{ description: 'O CPF/CNPJ informado é inválido.' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(make().createCharge('cus_1', charge)).rejects.toBeInstanceOf(AsaasRejectedException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe('AsaasService.updateSubscription', () => {
  it('mudanca de valor tambem atualiza a cobranca ja gerada (updatePendingPayments)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'sub_1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const service = new AsaasService({ get: (k: string) => (k === 'ASAAS_API_KEY' ? '$aact_hmlg_x' : undefined) } as never);
    await service.updateSubscription('sub_1', { value: 150 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ value: 150, updatePendingPayments: true });
    await service.updateSubscription('sub_1', { nextDueDate: '2026-11-10' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ nextDueDate: '2026-11-10' });
    vi.unstubAllGlobals();
  });
});
