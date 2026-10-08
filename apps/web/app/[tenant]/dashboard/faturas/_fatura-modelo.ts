import type { PlatformInvoice } from '@/app/lib/api';

/** Regras de apresentação da fatura (sem React): situação "de banco", filtros e linha do tempo. */
export type SituacaoChave = 'OPEN' | 'OVERDUE' | 'CONFIRMING' | 'LINK_PENDING' | 'PAID' | 'REFUND_PENDING' | 'PARTIAL_REFUND' | 'REFUNDED' | 'CANCELED';
export interface Situacao { chave: SituacaoChave; label: string; cls: string }

const SITUACOES: Record<SituacaoChave, Omit<Situacao, 'chave'>> = {
  OPEN: { label: 'Em aberto', cls: 'bg-amber-100 text-amber-800' },
  OVERDUE: { label: 'Vencida', cls: 'bg-rose-100 text-rose-800' },
  CONFIRMING: { label: 'Pagamento em confirmação', cls: 'bg-sky-100 text-sky-800' },
  LINK_PENDING: { label: 'Gerando link de pagamento', cls: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Paga', cls: 'bg-emerald-100 text-emerald-800' },
  REFUND_PENDING: { label: 'Reembolso em andamento', cls: 'bg-sky-100 text-sky-800' },
  PARTIAL_REFUND: { label: 'Paga · reembolso parcial', cls: 'bg-violet-100 text-violet-800' },
  REFUNDED: { label: 'Reembolsada', cls: 'bg-violet-100 text-violet-800' },
  CANCELED: { label: 'Cancelada', cls: 'bg-slate-200 text-slate-700' },
};

const numero = (v: unknown) => { const n = Number(String(v ?? 0).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const EM_ANDAMENTO = ['PROCESSING', 'PENDING', 'UNKNOWN'];

type Base = Pick<PlatformInvoice, 'status' | 'amount' | 'refundedAmount' | 'refundStatus' | 'paymentProcessingStatus' | 'refunds'> & Partial<Pick<PlatformInvoice, 'asaasPaymentId' | 'mpPaymentId'>>;

/** Situação única que o cliente entende, juntando status, processamento do pagamento e reembolsos. */
export function situacaoDaFatura(f: Base): Situacao {
  const pronta = (chave: SituacaoChave): Situacao => ({ chave, ...SITUACOES[chave] });
  if (f.status === 'CANCELED') return pronta('CANCELED');
  const reembolsado = numero(f.refundedAmount);
  const pendente = EM_ANDAMENTO.includes(String(f.refundStatus ?? '')) || (f.refunds ?? []).some((r) => EM_ANDAMENTO.includes(r.status));
  if (f.status === 'PAID') {
    if (pendente) return pronta('REFUND_PENDING');
    if (reembolsado > 0) return pronta(reembolsado + 0.005 >= numero(f.amount) ? 'REFUNDED' : 'PARTIAL_REFUND');
    return pronta('PAID');
  }
  if (['PROCESSING', 'UNKNOWN'].includes(String(f.paymentProcessingStatus ?? ''))) {
    // Só dá para falar em "confirmação" se a cobrança existe no provedor. Sem ela, o link ainda não foi gerado (ou falhou):
    // dizer "recebemos o seu pagamento" aqui seria falso.
    return pronta(f.asaasPaymentId || f.mpPaymentId ? 'CONFIRMING' : 'LINK_PENDING');
  }
  return pronta(f.status === 'OVERDUE' ? 'OVERDUE' : 'OPEN');
}

export type FiltroFatura = 'todas' | 'abertas' | 'pagas' | 'encerradas';
export const FILTROS: Array<{ id: FiltroFatura; label: string }> = [
  { id: 'todas', label: 'Todas' }, { id: 'abertas', label: 'Em aberto' }, { id: 'pagas', label: 'Pagas' }, { id: 'encerradas', label: 'Canceladas e reembolsadas' },
];

export function filtroAceita(filtro: FiltroFatura, f: Base): boolean {
  const { chave } = situacaoDaFatura(f);
  if (filtro === 'todas') return true;
  if (filtro === 'abertas') return ['OPEN', 'OVERDUE', 'CONFIRMING', 'LINK_PENDING'].includes(chave);
  if (filtro === 'pagas') return ['PAID', 'PARTIAL_REFUND', 'REFUND_PENDING'].includes(chave);
  return ['CANCELED', 'REFUNDED'].includes(chave);
}

export function buscaAceita(f: Pick<PlatformInvoice, 'description' | 'invoiceNumber'> & { id: string; amount: number | string }, termo: string): boolean {
  const q = termo.trim().toLowerCase();
  if (!q) return true;
  return [f.description, f.invoiceNumber, f.id.slice(0, 8), String(numero(f.amount)).replace('.', ',')].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
}

export interface EventoLinha { quando: string; titulo: string; detalhe?: string; tom: 'neutro' | 'ok' | 'alerta' | 'erro' }

type ParaLinha = Base & Pick<PlatformInvoice, 'createdAt' | 'dueDate' | 'paidAt' | 'invoiceAuthorizedAt' | 'invoiceNumber'>;

/** Linha do tempo em ordem cronológica: emitida, vencimento, pagamento, nota fiscal e reembolsos. */
export function linhaDoTempo(f: ParaLinha): EventoLinha[] {
  const eventos: EventoLinha[] = [{ quando: f.createdAt, titulo: 'Fatura emitida', tom: 'neutro' }];
  if (f.status !== 'PAID' && f.status !== 'CANCELED') eventos.push({ quando: f.dueDate, titulo: f.status === 'OVERDUE' ? 'Venceu' : 'Vencimento', tom: f.status === 'OVERDUE' ? 'erro' : 'alerta' });
  if (f.paidAt) eventos.push({ quando: f.paidAt, titulo: 'Pagamento confirmado', tom: 'ok' });
  if (f.invoiceAuthorizedAt) eventos.push({ quando: f.invoiceAuthorizedAt, titulo: `Nota fiscal emitida${f.invoiceNumber ? ` nº ${f.invoiceNumber}` : ''}`, tom: 'ok' });
  for (const r of f.refunds ?? []) {
    const parcial = r.kind && /PART/i.test(r.kind);
    const valor = numero(r.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (r.status === 'CONFIRMED') eventos.push({ quando: r.confirmedAt ?? r.createdAt, titulo: `Reembolso ${parcial ? 'parcial ' : ''}confirmado`, detalhe: valor, tom: 'ok' });
    else if (r.status === 'FAILED') eventos.push({ quando: r.createdAt, titulo: 'Reembolso não concluído', detalhe: valor, tom: 'erro' });
    else eventos.push({ quando: r.createdAt, titulo: 'Reembolso em andamento', detalhe: valor, tom: 'alerta' });
  }
  if (f.status === 'CANCELED') eventos.push({ quando: f.dueDate, titulo: 'Fatura cancelada', tom: 'neutro' });
  return eventos.sort((a, b) => new Date(a.quando).getTime() - new Date(b.quando).getTime());
}
