import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AsaasFiscalService, EMISSION_BACKOFF_MINUTES, findNumberingGaps } from './asaas-fiscal.service';
import { AsaasRejectedException } from './asaas.service';

const ON = { ASAAS_NFSE_ENABLED: 'true', ASAAS_NFSE_SERVICE_ID: 'svc-1', ASAAS_NFSE_ISS: '2' };
const RETRYABLE = ['ERROR', 'CANCELED', 'RETRY'];

/** Banco em memória com a mesma regra de reserva atômica do updateMany real. */
function setup(env: Record<string, string> = ON, invoice: Record<string, unknown> = {}, charge: Record<string, unknown> = {}) {
  const state: any = {
    id: 'inv-1', companyId: 'co-1', status: 'PAID', provider: 'ASAAS', asaasPaymentId: 'pay_1', asaasInvoiceId: null, invoiceStatus: null,
    amount: 199.9, description: 'Mensalidade', deletedAt: null, refundStatus: null, company: { document: '12345678000199' }, ...invoice,
  };
  const audit: any[] = [];
  const prisma: any = {
    platformInvoice: {
      findUnique: vi.fn(async () => ({ ...state })),
      update: vi.fn(async ({ data }: any) => { Object.assign(state, data); return state; }),
      updateMany: vi.fn(async ({ data }: any) => {
        const free = (state.invoiceStatus == null && !state.asaasInvoiceId) || RETRYABLE.includes(state.invoiceStatus);
        if (!free) return { count: 0 };
        Object.assign(state, data);
        return { count: 1 };
      }),
      findMany: vi.fn(async () => []),
    },
    auditLog: {
      findFirst: vi.fn(async ({ where }: any) => [...audit].reverse().find((row) => row.action === where.action) ?? null),
      count: vi.fn(async ({ where }: any) => audit.filter((row) => row.action === where.action).length),
      create: vi.fn(async ({ data }: any) => { audit.push(data); return data; }),
    },
  };
  const asaas: any = {
    isConfigured: () => true,
    getCharge: vi.fn(async () => ({ id: 'pay_1', status: 'RECEIVED', value: 199.9, ...charge })),
    listInvoicesByPayment: vi.fn(async () => ({ data: [] })),
    scheduleFiscalInvoice: vi.fn(async () => ({ id: 'nf_1', status: 'SCHEDULED' })),
    getFiscalInvoice: vi.fn(async () => ({ id: 'nf_1', status: 'AUTHORIZED', number: '42' })),
  };
  const service = new AsaasFiscalService(prisma, asaas, { get: (key: string) => env[key] } as never);
  return { service, prisma, asaas, state, audit };
}

describe('NFS-e: nunca duas notas para a mesma fatura', () => {
  it('duas chamadas simultâneas (webhook + rotina) agendam uma nota só', async () => {
    const { service, asaas } = setup();
    const [a, b] = await Promise.all([service.ensureForInvoice('inv-1'), service.ensureForInvoice('inv-1')]);
    expect(asaas.scheduleFiscalInvoice).toHaveBeenCalledTimes(1);
    expect([a.result, b.result].sort()).toEqual(['SCHEDULED', 'SKIPPED']);
  });

  it('chamar de novo depois de agendada não agenda outra', async () => {
    const { service, asaas } = setup();
    await service.ensureForInvoice('inv-1');
    const again = await service.ensureForInvoice('inv-1');
    expect(again.result).toBe('PULLED');
    expect(asaas.scheduleFiscalInvoice).toHaveBeenCalledTimes(1);
  });

  it('recupera a nota órfã quando a tentativa anterior caiu entre agendar e gravar', async () => {
    const { service, asaas, state } = setup(ON, { invoiceStatus: 'SCHEDULING' });
    asaas.listInvoicesByPayment.mockResolvedValue({ data: [{ id: 'nf_orphan', status: 'SCHEDULED' }] });
    const out = await service.ensureForInvoice('inv-1');
    expect(out.result).toBe('PULLED');
    expect(asaas.scheduleFiscalInvoice).not.toHaveBeenCalled();
    expect(state.asaasInvoiceId).toBe('nf_orphan');
  });

  it('fatura estornada não emite nota', async () => {
    const { service, asaas } = setup(ON, { refundStatus: 'REFUNDED' });
    expect((await service.ensureForInvoice('inv-1')).result).toBe('SKIPPED');
    expect(asaas.scheduleFiscalInvoice).not.toHaveBeenCalled();
  });

  it('cancelamento negado pela prefeitura: a nota segue válida e nunca é reemitida', async () => {
    const { service, asaas } = setup(ON, { asaasInvoiceId: 'nf_1', invoiceStatus: 'CANCELLATION_DENIED' });
    const out = await service.ensureForInvoice('inv-1', { force: true });
    expect(out.result).toBe('PULLED');
    expect(asaas.scheduleFiscalInvoice).not.toHaveBeenCalled();
  });

  it('INVOICE_CANCELLATION_DENIED abre item na fila de ajustes fiscais uma vez só', async () => {
    const { service, audit } = setup(ON, { asaasInvoiceId: 'nf_1', invoiceStatus: 'AUTHORIZED' });
    await service.persist('inv-1', { id: 'nf_1', status: 'CANCELLATION_DENIED' });
    await service.persist('inv-1', { id: 'nf_1', status: 'CANCELLATION_DENIED' });
    const manual = audit.filter((row) => row.action === 'NFSE_MANUAL_ADJUSTMENT');
    expect(manual).toHaveLength(1);
    expect(manual[0].metadata.reason).toBe('cancelamento_negado');
  });
});

describe('NFS-e: dados da nota (tomador, valor, pagamento)', () => {
  it('só emite com valor igual ao da fatura paga e ao da cobrança no Asaas', async () => {
    const { service, asaas } = setup();
    await service.ensureForInvoice('inv-1');
    expect(asaas.scheduleFiscalInvoice.mock.calls[0][0]).toMatchObject({ payment: 'pay_1', value: 199.9, deductions: 0, externalReference: 'inv:inv-1' });
  });

  it('valor da cobrança no Asaas diferente da fatura: não emite e abre ajuste', async () => {
    const { service, asaas, state, audit } = setup(ON, {}, { value: 250 });
    const out = await service.ensureForInvoice('inv-1');
    expect(out.result).toBe('FAILED');
    expect(out.message).toContain('difere da fatura');
    expect(asaas.scheduleFiscalInvoice).not.toHaveBeenCalled();
    expect(state.invoiceStatus).toBe('ERROR');
    expect(audit.map((row) => row.action)).toEqual(expect.arrayContaining(['NFSE_EMISSION_REJECTED', 'NFSE_MANUAL_ADJUSTMENT']));
  });

  it('tomador sem CPF/CNPJ no cadastro: não emite e não tenta de novo sozinho', async () => {
    const { service, asaas, state } = setup(ON, { company: { document: null } });
    const out = await service.ensureForInvoice('inv-1');
    expect(out.result).toBe('FAILED');
    expect(asaas.scheduleFiscalInvoice).not.toHaveBeenCalled();
    expect(state.invoiceStatus).toBe('ERROR');
  });

  it('pagamento ainda não confirmado no Asaas: adia e devolve a reserva', async () => {
    const { service, asaas, state } = setup(ON, {}, { status: 'PENDING' });
    const out = await service.ensureForInvoice('inv-1');
    expect(out.result).toBe('SKIPPED');
    expect(asaas.scheduleFiscalInvoice).not.toHaveBeenCalled();
    expect(state.invoiceStatus).toBeNull();
  });

  it('Portal Nacional: usa só o código do serviço, nunca o ID da lista municipal', async () => {
    const { service, asaas } = setup({ ...ON, ASAAS_NFSE_NATIONAL: 'true', ASAAS_NFSE_SERVICE_CODE: '1.05' });
    await service.ensureForInvoice('inv-1');
    const sent = asaas.scheduleFiscalInvoice.mock.calls[0][0];
    expect(sent.municipalServiceCode).toBe('1.05');
    expect(sent.municipalServiceId).toBeUndefined();
  });

  it('Portal Nacional sem código do serviço fica desligado e diz o que falta', () => {
    const { service } = setup({ ASAAS_NFSE_ENABLED: 'true', ASAAS_NFSE_NATIONAL: 'true', ASAAS_NFSE_SERVICE_ID: 'svc-1' });
    expect(service.missing().join(' ')).toContain('ASAAS_NFSE_SERVICE_CODE');
  });
});

describe('NFS-e: provedor fora do ar (retry com espera e alerta)', () => {
  it('falha do provedor vira RETRY com próxima tentativa agendada, sem nota duplicada', async () => {
    const { service, asaas, state, audit } = setup();
    asaas.scheduleFiscalInvoice.mockRejectedValueOnce(new ServiceUnavailableException('Asaas: fora do ar'));
    const out = await service.ensureForInvoice('inv-1');
    expect(out.result).toBe('FAILED');
    expect(state.invoiceStatus).toBe('RETRY');
    const retry = audit.find((row) => row.action === 'NFSE_EMISSION_RETRY');
    expect(retry.metadata.attempt).toBe(1);
    expect(new Date(retry.metadata.nextRetryAt).getTime() - Date.now()).toBeGreaterThan((EMISSION_BACKOFF_MINUTES[0] - 1) * 60_000);
  });

  it('antes do prazo não chama o Asaas; depois do prazo tenta e agenda uma nota só', async () => {
    const { service, asaas, state, audit } = setup();
    asaas.scheduleFiscalInvoice.mockRejectedValueOnce(new ServiceUnavailableException('Asaas: fora do ar'));
    await service.ensureForInvoice('inv-1');
    const calls = asaas.scheduleFiscalInvoice.mock.calls.length;
    expect((await service.ensureForInvoice('inv-1')).result).toBe('SKIPPED');
    expect(asaas.scheduleFiscalInvoice.mock.calls.length).toBe(calls);

    audit.find((row) => row.action === 'NFSE_EMISSION_RETRY').metadata.nextRetryAt = new Date(Date.now() - 1000).toISOString();
    expect((await service.ensureForInvoice('inv-1')).result).toBe('SCHEDULED');
    expect(asaas.scheduleFiscalInvoice).toHaveBeenCalledTimes(2);
    expect(state.asaasInvoiceId).toBe('nf_1');
  });

  it('esgotadas as tentativas vira ERROR, alerta e item na fila de ajustes', async () => {
    const { service, asaas, state, audit } = setup();
    for (let i = 0; i < EMISSION_BACKOFF_MINUTES.length; i += 1) audit.push({ action: 'NFSE_EMISSION_RETRY', metadata: { attempt: i + 1 } });
    asaas.scheduleFiscalInvoice.mockRejectedValue(new ServiceUnavailableException('Asaas: fora do ar'));
    await service.ensureForInvoice('inv-1', { force: true });
    expect(state.invoiceStatus).toBe('ERROR');
    expect(audit.map((row) => row.action)).toEqual(expect.arrayContaining(['NFSE_EMISSION_EXHAUSTED', 'NFSE_MANUAL_ADJUSTMENT']));
  });

  it('recusa definitiva do Asaas (422) não entra em laço de tentativas', async () => {
    const { service, asaas, state, audit } = setup();
    asaas.scheduleFiscalInvoice.mockRejectedValue(new AsaasRejectedException('Asaas recusou: município sem serviço'));
    await service.ensureForInvoice('inv-1');
    expect(state.invoiceStatus).toBe('ERROR');
    expect(audit.some((row) => row.action === 'NFSE_EMISSION_RETRY')).toBe(false);
  });

  it('falha ao consultar nota já ligada não rebaixa o estado da nota para ERROR', async () => {
    const { service, asaas, prisma } = setup(ON, { asaasInvoiceId: 'nf_1', invoiceStatus: 'SCHEDULED' });
    asaas.getFiscalInvoice.mockRejectedValue(new ServiceUnavailableException('Asaas: fora do ar'));
    const out = await service.ensureForInvoice('inv-1');
    expect(out.result).toBe('FAILED');
    expect(prisma.platformInvoice.update).not.toHaveBeenCalled();
  });

  it('a rotina diária não relê faturas em ERROR nem com cancelamento pendente ou negado', async () => {
    const { service, prisma } = setup();
    await service.reconcileRecent();
    const where = prisma.platformInvoice.findMany.mock.calls[0][0].where;
    const excluded = JSON.stringify(where.AND);
    for (const status of ['ERROR', 'CANCEL_PENDING', 'CANCELLATION_DENIED']) expect(excluded).toContain(status);
  });
});

describe('NFS-e: numeração', () => {
  it('detecta saltos na sequência e ignora identificadores não numéricos', () => {
    expect(findNumberingGaps(['1', '2', '5', '6', '9', 'ABC-1'])).toEqual([{ from: 3, to: 4 }, { from: 7, to: 8 }]);
    expect(findNumberingGaps(['10', '11', '12'])).toEqual([]);
  });

  it('relatório agrupa por série', async () => {
    const { service, prisma } = setup();
    prisma.platformInvoice.findMany.mockResolvedValueOnce([
      { invoiceNumber: '1', invoiceSeries: 'A' }, { invoiceNumber: '3', invoiceSeries: 'A' }, { invoiceNumber: '1', invoiceSeries: 'B' }, { invoiceNumber: '2', invoiceSeries: 'B' },
    ]);
    expect(await service.numberingReport()).toEqual([{ series: 'A', gaps: [{ from: 2, to: 2 }] }]);
  });
});
