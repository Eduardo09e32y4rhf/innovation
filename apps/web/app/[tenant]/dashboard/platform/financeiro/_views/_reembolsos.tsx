'use client';

import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import api, { ApiError, type RefundRequestItem } from '@/app/lib/api';
import { hasPermission } from '@/app/lib/permissions';
import { money, shortDate } from '../../../faturas/_format';

const STATUS: Record<string, string> = { NEW: 'Novo', TRIAGE: 'Em análise', IN_PROGRESS: 'Em análise', WAITING_CUSTOMER: 'Aguardando cliente', WAITING_DEPLOY: 'Em análise', REOPENED: 'Reaberto', RESOLVED: 'Decidido', CLOSED: 'Encerrado' };
const OPEN = ['NEW', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_DEPLOY', 'REOPENED'];

/** Fila de pedidos de reembolso dos clientes: Dev, CEO e Contábil aprovam (total ou parcial) ou recusam com motivo. */
/** `readOnly`: lista os pedidos sem decidir. */
export function ReembolsosView({ readOnly = false }: { readOnly?: boolean }) {
  const { user } = useAuth();
  const canDecide = !readOnly && hasPermission(user, 'faturas.reembolsar');
  const [items, setItems] = useState<RefundRequestItem[]>([]);
  const [filter, setFilter] = useState<'abertos' | 'todos'>('abertos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<{ item: RefundRequestItem; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await api.faturas.refundRequests(filter)); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Não foi possível carregar os pedidos.'); }
    finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  function open(item: RefundRequestItem, action: 'APPROVE' | 'REJECT') { setTarget({ item, action }); setAmount(''); setNote(''); }

  async function confirm() {
    if (!target) return;
    setBusy(true);
    try {
      const value = amount.trim() ? Number(amount.replace(/\./g, '').replace(',', '.')) : undefined;
      await api.faturas.decideRefund(target.item.ticketId, { action: target.action, amount: target.action === 'APPROVE' ? value : undefined, note: note.trim() || undefined });
      toast.success(target.action === 'APPROVE' ? 'Reembolso aprovado e enviado ao provedor de pagamento.' : 'Pedido recusado. O cliente foi respondido.');
      setTarget(null); await load();
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível concluir.'); }
    finally { setBusy(false); }
  }

  const t = target?.item;
  return (
    <div className="space-y-4 p-3 sm:p-5 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-fg">Pedidos de reembolso</h2>
          <p className="text-sm text-fg-mut">Pedidos feitos pelos clientes. Aprovar devolve o dinheiro pelo meio de pagamento original; recusar responde o cliente com o motivo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['abertos', 'todos'] as const).map((f) => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`btn text-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>{f === 'abertos' ? 'Em aberto' : 'Todos'}</button>)}
          <button type="button" onClick={() => void load()} disabled={loading} className="btn btn-outline inline-flex items-center gap-1.5 text-sm"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Atualizar</button>
        </div>
      </header>
      {!canDecide && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Seu perfil só acompanha os pedidos. Quem decide: Dev, CEO e Contábil.</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {!loading && items.length === 0 && !error && <p className="card-v2 p-8 text-center text-sm text-fg-mut">Nenhum pedido {filter === 'abertos' ? 'em aberto' : 'de reembolso'}.</p>}
      <ul className="space-y-3">
        {items.map((item) => {
          const aberto = OPEN.includes(item.status);
          return (
            <li key={item.ticketId} className="card-v2 space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">{item.company?.name ?? 'Empresa'} <span className="text-xs font-normal text-fg-mut">{item.company?.document ?? ''}</span></p>
                  <p className="text-xs text-fg-mut">{item.ticketNumber} · pedido em {shortDate(item.requestedAt)} por {item.requester.name ?? '—'} ({item.requester.email ?? '—'})</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${aberto ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>{STATUS[item.status] ?? item.status}</span>
              </div>
              {item.invoice ? (
                <dl className="grid gap-2 rounded-xl bg-bg-sub p-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-xs text-fg-mut">Fatura</dt><dd className="truncate">{item.invoice.description || 'Mensalidade'}</dd></div>
                  <div><dt className="text-xs text-fg-mut">Valor pago</dt><dd className="font-semibold">{money(item.invoice.amount)}</dd></div>
                  <div><dt className="text-xs text-fg-mut">Pago em</dt><dd>{shortDate(item.invoice.paidAt)}</dd></div>
                  <div><dt className="text-xs text-fg-mut">Já devolvido / a devolver</dt><dd>{money(item.invoice.refundedAmount)} / <strong>{money(item.invoice.refundable)}</strong></dd></div>
                </dl>
              ) : <p className="text-sm text-rose-700">A fatura deste pedido não foi encontrada.</p>}
              <p className="whitespace-pre-wrap rounded-xl border border-border p-3 text-sm"><span className="block text-xs font-semibold text-fg-mut">Motivo do cliente</span>{item.reason}</p>
              {aberto && canDecide && item.invoice && (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => open(item, 'REJECT')}><XCircle size={15} aria-hidden="true" /> Recusar</Button>
                  <Button onClick={() => open(item, 'APPROVE')} disabled={item.invoice.refundable <= 0}><CheckCircle2 size={15} aria-hidden="true" /> Aprovar reembolso</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Modal isOpen={Boolean(target)} onClose={() => !busy && setTarget(null)} title={target?.action === 'APPROVE' ? 'Aprovar reembolso' : 'Recusar pedido'} description={t ? `${t.company?.name ?? ''} · ${t.ticketNumber}` : undefined}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setTarget(null)}>Voltar</Button><Button isLoading={busy} variant={target?.action === 'REJECT' ? 'danger' : 'primary'} disabled={target?.action === 'REJECT' && note.trim().length < 5} onClick={() => void confirm()}>{target?.action === 'APPROVE' ? 'Aprovar e devolver' : 'Recusar e responder'}</Button></div>}>
        <div className="space-y-3 text-sm">
          {target?.action === 'APPROVE' && t?.invoice && (
            <label className="block font-medium">Valor a devolver (R$) <span className="font-normal text-fg-mut">— em branco devolve tudo ({money(t.invoice.refundable)})</span>
              <input className="input-v2 mt-1 w-full" inputMode="decimal" placeholder={String(t.invoice.refundable).replace('.', ',')} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          )}
          <label className="block font-medium">{target?.action === 'APPROVE' ? 'Observação para o cliente (opcional)' : 'Motivo da recusa (o cliente verá) *'}
            <textarea className="input-v2 mt-1 min-h-24 w-full" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <p className="text-xs text-fg-mut">A decisão fica registrada no histórico e o chamado do cliente é encerrado com a sua resposta.</p>
        </div>
      </Modal>
    </div>
  );
}
