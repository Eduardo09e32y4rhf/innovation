import { describe, expect, it } from 'vitest';
import { buscaAceita, filtroAceita, linhaDoTempo, situacaoDaFatura } from '../../../apps/web/app/[tenant]/dashboard/faturas/_fatura-modelo';

const base = { status: 'OPEN', amount: 100, refundedAmount: 0, refundStatus: null, paymentProcessingStatus: 'LOCAL', refunds: [] } as never;
const com = (extra: object) => ({ ...(base as object), ...extra }) as never;

describe('situacaoDaFatura', () => {
  it('estados simples', () => {
    expect(situacaoDaFatura(base).chave).toBe('OPEN');
    expect(situacaoDaFatura(com({ status: 'OVERDUE' })).chave).toBe('OVERDUE');
    expect(situacaoDaFatura(com({ status: 'PAID' })).chave).toBe('PAID');
    expect(situacaoDaFatura(com({ status: 'CANCELED' })).chave).toBe('CANCELED');
  });
  it('pagamento aceito mas ainda não confirmado aparece como "em confirmação", nunca como em aberto', () => {
    expect(situacaoDaFatura(com({ paymentProcessingStatus: 'PROCESSING', asaasPaymentId: 'pay_1' })).chave).toBe('CONFIRMING');
    expect(situacaoDaFatura(com({ status: 'OVERDUE', paymentProcessingStatus: 'UNKNOWN', mpPaymentId: 'mp_1' })).chave).toBe('CONFIRMING');
  });
  it('cobrança que não chegou a existir no provedor nunca diz que o pagamento foi recebido', () => {
    expect(situacaoDaFatura(com({ paymentProcessingStatus: 'UNKNOWN' })).chave).toBe('LINK_PENDING');
    expect(situacaoDaFatura(com({ paymentProcessingStatus: 'PROCESSING', asaasPaymentId: null })).chave).toBe('LINK_PENDING');
  });
  it('reembolso parcial, total e em andamento (valores como texto do Decimal)', () => {
    expect(situacaoDaFatura(com({ status: 'PAID', refundedAmount: '40.00' })).chave).toBe('PARTIAL_REFUND');
    expect(situacaoDaFatura(com({ status: 'PAID', refundedAmount: '100.00' })).chave).toBe('REFUNDED');
    expect(situacaoDaFatura(com({ status: 'PAID', refunds: [{ status: 'PENDING', amount: 10 }] })).chave).toBe('REFUND_PENDING');
  });
  it('nunca quebra com campos ausentes ou lixo', () => {
    expect(situacaoDaFatura({ status: 'PAID', amount: 'abc' } as never).chave).toBe('PAID');
  });
});

describe('filtros e busca', () => {
  it('cada fatura cai em exatamente um filtro além de "todas"', () => {
    const casos = [base, com({ status: 'OVERDUE' }), com({ status: 'PAID' }), com({ status: 'CANCELED' }), com({ status: 'PAID', refundedAmount: 100 }), com({ paymentProcessingStatus: 'PROCESSING' })];
    for (const f of casos) {
      const n = (['abertas', 'pagas', 'encerradas'] as const).filter((x) => filtroAceita(x, f)).length;
      expect(n).toBe(1);
      expect(filtroAceita('todas', f)).toBe(f.status !== 'CANCELED');
    }
  });
  it('cancelada fica fora de "Todas" mas aparece em "Canceladas e reembolsadas"', () => {
    const cancelada = com({ status: 'CANCELED' });
    expect(filtroAceita('todas', cancelada)).toBe(false);
    expect(filtroAceita('encerradas', cancelada)).toBe(true);
  });
  it('busca por descrição, número da nota, id curto e valor', () => {
    const f = { id: 'abcdef12-0000', amount: '1234.50', description: 'Mensalidade Outubro', invoiceNumber: 'NF-77' } as never;
    for (const q of ['outubro', 'nf-77', 'abcdef12', '1234,5', '']) expect(buscaAceita(f, q)).toBe(true);
    expect(buscaAceita(f, 'novembro')).toBe(false);
  });
});

describe('linhaDoTempo', () => {
  it('fatura paga com nota e reembolso parcial sai em ordem cronológica', () => {
    const t = linhaDoTempo({
      ...(base as object), status: 'PAID', createdAt: '2026-10-01T10:00:00Z', dueDate: '2026-10-10T00:00:00Z', paidAt: '2026-10-05T12:00:00Z',
      invoiceAuthorizedAt: '2026-10-06T09:00:00Z', invoiceNumber: '123',
      refunds: [{ id: 'r', kind: 'PARTIAL', amount: 30, status: 'CONFIRMED', reason: 'x', createdAt: '2026-10-07T09:00:00Z', confirmedAt: '2026-10-07T10:00:00Z' }],
    } as never);
    expect(t.map((e) => e.titulo)).toEqual(['Fatura emitida', 'Pagamento confirmado', 'Nota fiscal emitida nº 123', 'Reembolso parcial confirmado']);
    expect(t.at(-1)?.detalhe).toContain('30');
  });
  it('fatura vencida mostra "Venceu" em vermelho', () => {
    const t = linhaDoTempo({ ...(base as object), status: 'OVERDUE', createdAt: '2026-09-01T00:00:00Z', dueDate: '2026-09-10T00:00:00Z' } as never);
    expect(t.at(-1)).toMatchObject({ titulo: 'Venceu', tom: 'erro' });
  });
});
