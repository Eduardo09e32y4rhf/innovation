'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import api, { ApiError, type FaturasCompanyRow, type InvoiceAdjustment, type PlanQuote, type PlatformInvoice, type SeatsQuote } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission, type Permission } from '@/app/lib/permissions';
import CompanyInvoicesView from './_company-view';

type Dialog =
  | { kind: 'charge' } | { kind: 'recurring' } | { kind: 'freeDays' } | { kind: 'seats' } | { kind: 'plan' }
  | { kind: 'discount' | 'refundPartial' | 'refundFull' | 'fiscal' | 'cancel'; invoice: PlatformInvoice };

const TITLES: Record<Dialog['kind'], string> = {
  charge: 'Nova cobrança avulsa', recurring: 'Desconto recorrente', freeDays: 'Dias grátis', seats: 'Upgrade / downgrade de usuários', plan: 'Trocar de plano',
  discount: 'Desconto nesta fatura', refundPartial: 'Reembolso parcial', refundFull: 'Reembolso total', fiscal: 'Nota fiscal e comprovante', cancel: 'Cancelar fatura',
};

const TYPE_LABEL: Record<InvoiceAdjustment['type'], string> = {
  DISCOUNT: 'Desconto', RECURRING_DISCOUNT: 'Desconto recorrente', FREE_DAYS: 'Dias grátis', PARTIAL_REFUND: 'Reembolso parcial', PRORATION: 'Rateio / usuários', FISCAL_ATTACHED: 'NF / comprovante',
};

const brl = (v: number | string | null | undefined) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const field = 'h-10 w-full rounded-xl border border-line bg-transparent px-3 text-sm text-fg';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-fg-mut">{label}</span>{children}</label>;
}

function ActionDialog({ dialog, company, onClose, onDone }: { dialog: Dialog; company: FaturasCompanyRow; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [text, setText] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [quote, setQuote] = useState<SeatsQuote | null>(null);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; isActive?: boolean }>>([]);
  const [planId, setPlanId] = useState('');
  const [planQuote, setPlanQuote] = useState<PlanQuote | null>(null);
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setText((t) => ({ ...t, [key]: e.target.value }));
  const num = (key: string) => Number(String(text[key] ?? '').replace(',', '.'));
  const needsReason = dialog.kind !== 'charge';

  useEffect(() => {
    if (dialog.kind !== 'plan') return;
    api.faturas.plans().then((list) => setPlans(list.filter((p) => p.isActive !== false))).catch(() => setPlans([]));
  }, [dialog.kind]);

  async function calcPlanQuote(id: string) {
    setPlanId(id); setPlanQuote(null);
    if (!id) return;
    try { setPlanQuote(await api.faturas.quotePlan(company.id, id)); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível calcular.'); }
  }

  async function calcQuote() {
    try { setQuote(await api.faturas.quoteSeats(company.id, Math.trunc(num('seats')))); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível calcular.'); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (needsReason && reason.trim().length < 5) { toast.error('Informe o motivo (mínimo 5 caracteres).'); return; }
    setBusy(true);
    try {
      switch (dialog.kind) {
        case 'charge':
          await api.faturas.charge({ companyId: company.id, description: text.description ?? '', amount: num('amount'), dueDate: text.dueDate ?? '', billingType: 'UNDEFINED', sendToAsaas: true });
          toast.success('Cobrança criada.'); break;
        case 'recurring': {
          const r = await api.faturas.recurringDiscount(company.id, { kind, value: num('value'), cycles: Math.trunc(num('cycles')), reason });
          toast.success(`Desconto aplicado. Nova mensalidade: ${brl(r.total)}${r.providerSynced ? '' : ' (valor no provedor não foi atualizado)'}`); break;
        }
        case 'freeDays': {
          const r = await api.faturas.freeDays(company.id, { days: Math.trunc(num('days')), reason });
          toast.success(`Novo vencimento: ${new Date(r.nextDueDate).toLocaleDateString('pt-BR')}`); break;
        }
        case 'seats': {
          const r = await api.faturas.changeSeats(company.id, { seatQuantity: Math.trunc(num('seats')), reason });
          toast.success(r.prorationAmount > 0 ? `Upgrade aplicado. Rateio cobrado: ${brl(r.prorationAmount)}` : r.scheduled ? 'Redução agendada para o próximo ciclo.' : 'Alteração aplicada.'); break;
        }
        case 'plan': {
          const r = await api.faturas.changePlan(company.id, { planId, reason });
          toast.success(r.scheduled ? 'Downgrade agendado para o próximo ciclo.' : r.prorationAmount > 0 ? `Plano alterado. Rateio cobrado: ${brl(r.prorationAmount)}` : 'Plano alterado.'); break;
        }
        case 'discount':
          await api.faturas.discountInvoice(dialog.invoice.id, { kind, value: num('value'), reason }); toast.success('Desconto aplicado.'); break;
        case 'refundPartial':
          await api.faturas.refundPartial(dialog.invoice.id, { amount: num('amount'), reason }); toast.success('Reembolso solicitado ao provedor.'); break;
        case 'refundFull':
          await api.faturas.refundFull(dialog.invoice.id, reason); toast.success('Reembolso total solicitado.'); break;
        case 'cancel':
          await api.faturas.cancelInvoice(dialog.invoice.id, reason); toast.success('Fatura cancelada.'); break;
        case 'fiscal':
          await api.faturas.attachFiscal(dialog.invoice.id, {
            reason, invoiceNumber: text.invoiceNumber || undefined, fiscalPdfUrl: text.pdf || undefined, fiscalXmlUrl: text.xml || undefined, receiptUrl: text.receipt || undefined,
          });
          toast.success('Documentos anexados.'); break;
      }
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  }

  const discountFields = (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Tipo"><select className={field} value={kind} onChange={(e) => setKind(e.target.value as 'PERCENT' | 'FIXED')}><option value="PERCENT">Percentual (%)</option><option value="FIXED">Valor (R$)</option></select></Field>
      <Field label={kind === 'PERCENT' ? 'Percentual' : 'Valor em R$'}><input className={field} inputMode="decimal" required value={text.value ?? ''} onChange={set('value')} /></Field>
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={TITLES[dialog.kind]} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="card-v2 max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto p-5">
        <h2 className="text-lg font-semibold text-fg">{TITLES[dialog.kind]}</h2>
        <p className="text-xs text-fg-mut">{company.name}{'invoice' in dialog ? ` · fatura de ${brl(dialog.invoice.amount)}` : ''}</p>

        {dialog.kind === 'charge' && (<>
          <Field label="Descrição"><input className={field} required minLength={3} value={text.description ?? ''} onChange={set('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor em R$"><input className={field} inputMode="decimal" required value={text.amount ?? ''} onChange={set('amount')} /></Field>
            <Field label="Vencimento"><input type="date" className={field} required value={text.dueDate ?? ''} onChange={set('dueDate')} /></Field>
          </div>
        </>)}
        {dialog.kind === 'recurring' && (<>
          {discountFields}
          <Field label="Quantos ciclos"><input className={field} inputMode="numeric" required value={text.cycles ?? ''} onChange={set('cycles')} /></Field>
        </>)}
        {dialog.kind === 'discount' && discountFields}
        {dialog.kind === 'freeDays' && (
          <Field label="Quantidade de dias (30 = 1 mês)">
            <input className={field} inputMode="numeric" required value={text.days ?? ''} onChange={set('days')} />
            <span className="mt-2 flex gap-2">{[7, 15, 30, 60, 90].map((d) => <button key={d} type="button" className="btn btn-outline text-xs" onClick={() => setText((t) => ({ ...t, days: String(d) }))}>{d}</button>)}</span>
          </Field>
        )}
        {dialog.kind === 'seats' && (<>
          <Field label={`Novo total de usuários (hoje: ${company.subscription?.seatQuantity ?? '-'})`}>
            <input className={field} inputMode="numeric" required value={text.seats ?? ''} onChange={(e) => { set('seats')(e); setQuote(null); }} />
          </Field>
          <button type="button" className="btn btn-outline text-sm" onClick={() => void calcQuote()} disabled={!text.seats}>Calcular rateio</button>
          {quote && (
            <p className="rounded-xl bg-black/5 p-3 text-sm text-fg">
              {quote.kind === 'UPGRADE' && <>Upgrade vale agora. Rateio de {quote.remainingDays}/{quote.cycleDays} dias: <strong>{brl(quote.prorationAmount)}</strong>. Próximo ciclo: {brl(quote.nextTotal)}.</>}
              {quote.kind === 'DOWNGRADE' && <>Downgrade vale no próximo ciclo{quote.downgradeEffectiveAt ? ` (${new Date(quote.downgradeEffectiveAt).toLocaleDateString('pt-BR')})` : ''}, sem crédito. Passa a {brl(quote.nextTotal)}.</>}
              {quote.kind === 'SEM_MUDANCA' && <>Mesma quantidade de usuários.</>}
            </p>
          )}
        </>)}
        {dialog.kind === 'plan' && (<>
          <Field label="Novo plano"><select className={field} value={planId} onChange={(e) => void calcPlanQuote(e.target.value)} required><option value="">Selecione</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          {planQuote && (
            <p className="rounded-xl bg-black/5 p-3 text-sm text-fg">
              {planQuote.kind === 'UPGRADE' ? <>Upgrade vale agora. Rateio de {planQuote.remainingDays}/{planQuote.cycleDays} dias: <strong>{brl(planQuote.prorationAmount)}</strong>. Próximo ciclo: {brl(planQuote.nextTotal)}.</> : <>Downgrade vale no próximo ciclo{planQuote.effectiveAt ? ` (${new Date(planQuote.effectiveAt).toLocaleDateString('pt-BR')})` : ''}, sem crédito. Passa a {brl(planQuote.nextTotal)}.</>}
            </p>
          )}
        </>)}
        {dialog.kind === 'refundPartial' && <Field label="Valor a reembolsar (R$)"><input className={field} inputMode="decimal" required value={text.amount ?? ''} onChange={set('amount')} /></Field>}
        {dialog.kind === 'refundFull' && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-700">Estorno total: até 7 dias após o pagamento a empresa é suspensa; depois disso a assinatura é cancelada.</p>}
        {dialog.kind === 'fiscal' && (<>
          <Field label="Número da nota"><input className={field} value={text.invoiceNumber ?? ''} onChange={set('invoiceNumber')} /></Field>
          <Field label="Link do PDF da nota (https)"><input type="url" className={field} value={text.pdf ?? ''} onChange={set('pdf')} /></Field>
          <Field label="Link do XML (https)"><input type="url" className={field} value={text.xml ?? ''} onChange={set('xml')} /></Field>
          <Field label="Link do comprovante (https)"><input type="url" className={field} value={text.receipt ?? ''} onChange={set('receipt')} /></Field>
        </>)}

        {needsReason && <Field label="Motivo (fica no registro)"><input className={field} required minLength={5} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Voltar</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Aplicando...' : 'Confirmar'}</button>
        </div>
      </form>
    </div>
  );
}

export default function CompanyFicha({ company }: { company: FaturasCompanyRow }) {
  const { user } = useAuth();
  const can = (p: Permission) => hasPermission(user, p);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [history, setHistory] = useState<InvoiceAdjustment[]>([]);
  const paused = Boolean(company.subscription?.billingPaused);
  const [pausedNow, setPausedNow] = useState(paused);

  const loadHistory = useCallback(async () => {
    try { setHistory(await api.faturas.adjustments(company.id)); } catch { setHistory([]); }
  }, [company.id]);
  useEffect(() => { void loadHistory(); }, [loadHistory, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  async function togglePause() {
    try {
      if (pausedNow) await api.faturas.resumeBilling(company.id); else await api.faturas.pauseBilling(company.id);
      setPausedNow(!pausedNow);
      toast.success(pausedNow ? 'Cobrança retomada.' : 'Cobrança pausada.');
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível alterar a cobrança.'); }
  }

  async function syncInvoice(inv: PlatformInvoice) {
    try { await api.faturas.syncInvoice(inv.id); toast.success('Fatura sincronizada com o provedor.'); refresh(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível sincronizar.'); }
  }

  const rowActions = (inv: PlatformInvoice) => {
    const open = inv.status === 'OPEN' || inv.status === 'OVERDUE';
    const btn = 'btn btn-outline text-xs';
    return (
      <span className="inline-flex flex-wrap justify-end gap-1.5">
        {open && can('faturas.desconto') && <button type="button" className={btn} onClick={() => setDialog({ kind: 'discount', invoice: inv })}>Desconto</button>}
        {open && can('faturas.cobrar') && <button type="button" className={btn} onClick={() => setDialog({ kind: 'cancel', invoice: inv })}>Cancelar</button>}
        {inv.status === 'PAID' && can('faturas.reembolsar') && <>
          <button type="button" className={btn} onClick={() => setDialog({ kind: 'refundPartial', invoice: inv })}>Reembolso parcial</button>
          <button type="button" className={btn} onClick={() => setDialog({ kind: 'refundFull', invoice: inv })}>Reembolso total</button>
        </>}
        {inv.status !== 'CANCELED' && can('faturas.cobrar') && (inv.asaasPaymentId || inv.mpPaymentId) && <button type="button" className={btn} onClick={() => void syncInvoice(inv)}>Sincronizar</button>}
        {inv.status !== 'CANCELED' && can('faturas.nf_anexar') && <button type="button" className={btn} onClick={() => setDialog({ kind: 'fiscal', invoice: inv })}>NF / comprovante</button>}
      </span>
    );
  };

  return (
    <div>
      <section className="flex flex-wrap gap-2 px-3 pt-4 sm:px-5 lg:px-6" aria-label="Ações da empresa">
        {can('faturas.cobrar') && <button type="button" className="btn btn-primary text-sm" onClick={() => setDialog({ kind: 'charge' })}>Nova cobrança</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm" onClick={() => setDialog({ kind: 'seats' })}>Usuários</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm" onClick={() => setDialog({ kind: 'plan' })}>Trocar plano</button>}
        {can('faturas.desconto') && <button type="button" className="btn btn-outline text-sm" onClick={() => setDialog({ kind: 'recurring' })}>Desconto recorrente</button>}
        {can('faturas.desconto') && <button type="button" className="btn btn-outline text-sm" onClick={() => setDialog({ kind: 'freeDays' })}>Dias grátis</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm" onClick={() => void togglePause()}>{pausedNow ? 'Retomar cobrança' : 'Pausar cobrança'}</button>}
      </section>

      <CompanyInvoicesView companyId={company.id} rowActions={rowActions} reloadKey={reloadKey} />

      {history.length > 0 && (
        <section className="px-3 pb-6 sm:px-5 lg:px-6">
          <h2 className="mb-2 text-sm font-semibold text-fg">Histórico de ajustes</h2>
          <ul className="card-v2 divide-y divide-line text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span><strong className="text-fg">{TYPE_LABEL[h.type]}</strong> <span className="text-fg-sub">· {h.reason}</span></span>
                <span className="text-xs text-fg-mut">
                  {h.amount ? `${brl(h.amount)} · ` : ''}{h.days ? `${h.days} dias · ` : ''}{new Date(h.createdAt).toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dialog && <ActionDialog dialog={dialog} company={company} onClose={() => setDialog(null)} onDone={refresh} />}
    </div>
  );
}
