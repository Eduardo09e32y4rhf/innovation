'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import api, { ApiError, type FaturasCompanyRow, type InvoiceAdjustment, type PlanQuote, type PlatformInvoice, type SeatsQuote } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission, type Permission } from '@/app/lib/permissions';
import CompanyInvoicesView from './_company-view';
import { money } from './_format';

type Dialog =
  | { kind: 'charge' } | { kind: 'recurring' } | { kind: 'freeDays' } | { kind: 'seats' } | { kind: 'plan' } | { kind: 'coupon' } | { kind: 'cancelSub' } | { kind: 'activate' } | { kind: 'release' }
  | { kind: 'discount' | 'refundPartial' | 'refundFull' | 'fiscal' | 'cancel'; invoice: PlatformInvoice };

const TITLES: Record<Dialog['kind'], string> = {
  charge: 'Nova cobrança avulsa', recurring: 'Desconto recorrente', freeDays: 'Dias grátis', seats: 'Upgrade / downgrade de usuários', plan: 'Trocar de plano', coupon: 'Aplicar cupom', cancelSub: 'Cancelar assinatura', activate: 'Ativar assinatura', release: 'Liberar acesso da empresa',
  discount: 'Desconto nesta fatura', refundPartial: 'Reembolso parcial', refundFull: 'Reembolso total', fiscal: 'Nota fiscal e comprovante', cancel: 'Cancelar fatura',
};

const TYPE_LABEL: Record<InvoiceAdjustment['type'], string> = {
  DISCOUNT: 'Desconto', RECURRING_DISCOUNT: 'Desconto recorrente', FREE_DAYS: 'Dias grátis', PARTIAL_REFUND: 'Reembolso parcial', PRORATION: 'Rateio / usuários', FISCAL_ATTACHED: 'NF / comprovante',
};

const brl = money;
const field = 'h-10 w-full rounded-xl border border-line bg-transparent px-3 text-sm text-fg';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-fg-mut">{label}</span>{children}</label>;
}

function ActionDialog({ dialog, company, onClose, onDone }: { dialog: Dialog; company: FaturasCompanyRow; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [refundKey] = useState(() => crypto.randomUUID());
  const [chargeKey] = useState(() => crypto.randomUUID());
  const [reason, setReason] = useState('');
  const [text, setText] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [quote, setQuote] = useState<SeatsQuote | null>(null);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; isActive?: boolean }>>([]);
  const [planId, setPlanId] = useState('');
  const [planQuote, setPlanQuote] = useState<PlanQuote | null>(null);
  const [mode, setMode] = useState<'NOW' | 'END_OF_CYCLE'>('END_OF_CYCLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [chargeNow, setChargeNow] = useState(true);
  const [releaseMethod, setReleaseMethod] = useState<'TRUST' | 'RECEIVED'>('RECEIVED');
  const [billingType, setBillingType] = useState<'UNDEFINED' | 'BOLETO' | 'PIX' | 'CREDIT_CARD'>('UNDEFINED');
  const [sendToAsaas, setSendToAsaas] = useState(true);
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setText((t) => ({ ...t, [key]: e.target.value }));
  const num = (key: string) => Number(String(text[key] ?? '').replace(',', '.'));
  const needsReason = dialog.kind !== 'charge';

  useEffect(() => {
    if (dialog.kind !== 'plan' && dialog.kind !== 'activate') return;
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
    setErrorMsg(null);
    if (needsReason && reason.trim().length < 5) { setErrorMsg('Informe o motivo (mínimo 5 caracteres).'); return; }
    setBusy(true);
    try {
      switch (dialog.kind) {
        case 'charge':
          const invoice = await api.faturas.charge({ companyId: company.id, description: text.description ?? '', amount: num('amount'), dueDate: text.dueDate ?? '', billingType, sendToAsaas, idempotencyKey: chargeKey });
          if (invoice.paymentProcessingStatus === 'UNKNOWN' || invoice.paymentProcessingStatus === 'PROCESSING') toast.info('Cobrança pendente de conciliação. Não emita outra antes de sincronizar.');
          else toast.success(sendToAsaas ? 'Link de cobrança gerado.' : 'Fatura local registrada.'); break;
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
        case 'coupon': {
          const r = await api.faturas.applyCoupon(company.id, { code: text.code ?? '', reason });
          toast.success(r.kind === 'TRIAL_DAYS' ? 'Cupom aplicado: dias grátis concedidos.' : 'Cupom de desconto aplicado.'); break;
        }
        case 'cancelSub': {
          const r = await api.faturas.cancelSubscription(company.id, { mode, reason });
          toast.success(r.canceled ? 'Assinatura cancelada.' : `Cobranças paradas. O acesso termina em ${r.cancelAt ? new Date(r.cancelAt).toLocaleDateString('pt-BR') : 'fim do ciclo'}.`); break;
        }
        case 'activate': {
          const r = await api.faturas.activateSubscription(company.id, { planId, seatQuantity: Math.trunc(num('seats')), chargeNow, reason });
          toast.success(r.invoiceId ? `Assinatura ativada. Primeira fatura: ${brl(r.total)}.` : 'Assinatura ativada.'); break;
        }
        case 'release': {
          const r = await api.faturas.releaseAccess(company.id, { method: releaseMethod, reason });
          toast.success(r.invoicesSettled ? `Acesso liberado. ${r.invoicesSettled} fatura(s) baixada(s) como paga(s).` : 'Acesso liberado. As faturas continuam em aberto.'); break;
        }
        case 'plan': {
          const r = await api.faturas.changePlan(company.id, { planId, reason });
          toast.success(r.scheduled ? 'Downgrade agendado para o próximo ciclo.' : r.prorationAmount > 0 ? `Plano alterado. Rateio cobrado: ${brl(r.prorationAmount)}` : 'Plano alterado.'); break;
        }
        case 'discount':
          await api.faturas.discountInvoice(dialog.invoice.id, { kind, value: num('value'), reason }); toast.success('Desconto aplicado.'); break;
        case 'refundPartial':
          await api.faturas.refundPartial(dialog.invoice.id, { amount: num('amount'), reason, idempotencyKey: refundKey }); toast.info('Solicitação registrada. Acompanhe a confirmação na aba Devoluções.'); break;
        case 'refundFull':
          await api.faturas.refundFull(dialog.invoice.id, reason, refundKey); toast.info('Solicitação registrada. Acompanhe a confirmação na aba Devoluções.'); break;
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
      const message = err instanceof ApiError ? err.message : 'Não foi possível concluir a ação.';
      setErrorMsg(message);
      toast.error(message);
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
          <Field label="Forma de pagamento (Asaas)"><select className={field} value={billingType} onChange={(e) => setBillingType(e.target.value as typeof billingType)}><option value="UNDEFINED">Cliente escolhe</option><option value="BOLETO">Boleto</option><option value="PIX">Pix</option><option value="CREDIT_CARD">Cartão</option></select></Field>
          <label className="flex items-start gap-2 text-sm text-fg"><input type="checkbox" checked={sendToAsaas} onChange={(e) => setSendToAsaas(e.target.checked)} />Enviar automaticamente ao Asaas</label>
          {!sendToAsaas && <p className="text-xs text-fg-mut">Registro local: o pagamento deve ser recebido e conciliado por outro meio.</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor em R$"><input className={field} inputMode="decimal" required value={text.amount ?? ''} onChange={set('amount')} /></Field>
            <Field label="Vencimento"><input type="date" className={field} required value={text.dueDate ?? ''} onChange={set('dueDate')} /></Field>
          </div>
        </>)}
        {dialog.kind === 'activate' && (<>
          <Field label="Plano"><select className={field} value={planId} onChange={(e) => setPlanId(e.target.value)} required><option value="">Selecione</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Quantidade de usuários"><input className={field} inputMode="numeric" required value={text.seats ?? ''} onChange={set('seats')} /></Field>
          <label className="flex items-center gap-2 text-sm text-fg"><input type="checkbox" checked={chargeNow} onChange={(e) => setChargeNow(e.target.checked)} /> Gerar a primeira fatura agora</label>
          <p className="text-xs text-fg-mut">Coloca a empresa como Em dia com este plano. A cobrança recorrente no provedor não é criada aqui: a primeira fatura gera o link de pagamento.</p>
        </>)}
        {dialog.kind === 'release' && (<>
          <Field label="Como você está liberando?"><select className={field} value={releaseMethod} onChange={(e) => setReleaseMethod(e.target.value as 'TRUST' | 'RECEIVED')}><option value="RECEIVED">Recebi o valor por outro meio (baixa as faturas em aberto)</option><option value="TRUST">Liberar por confiança (faturas continuam em aberto)</option></select></Field>
          <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-800">A empresa volta a usar o sistema na hora. {releaseMethod === 'RECEIVED' ? 'As faturas abertas serão marcadas como pagas.' : 'As faturas seguem cobrando normalmente.'} Fica registrado quem liberou e o motivo.</p>
        </>)}
        {dialog.kind === 'coupon' && <Field label="Código do cupom"><input className={field} required value={text.code ?? ''} onChange={set('code')} /></Field>}
        {dialog.kind === 'cancelSub' && (<>
          <Field label="Quando cancelar"><select className={field} value={mode} onChange={(e) => setMode(e.target.value as 'NOW' | 'END_OF_CYCLE')}><option value="END_OF_CYCLE">No fim do ciclo já pago</option><option value="NOW">Agora (bloqueia o acesso)</option></select></Field>
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-700">Para as cobranças recorrentes no Asaas e no Mercado Pago e cancela as faturas em aberto. {mode === 'NOW' ? 'O acesso da empresa é bloqueado imediatamente.' : 'O acesso continua até o fim do ciclo já pago.'}</p>
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
        {dialog.kind === 'refundFull' && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-700">Devolve o saldo restante após confirmação do provedor. O histórico do pagamento é preservado.</p>}
        {dialog.kind === 'fiscal' && (<>
          <Field label="Número da nota"><input className={field} value={text.invoiceNumber ?? ''} onChange={set('invoiceNumber')} /></Field>
          <Field label="Link do PDF da nota (https)"><input type="url" className={field} value={text.pdf ?? ''} onChange={set('pdf')} /></Field>
          <Field label="Link do XML (https)"><input type="url" className={field} value={text.xml ?? ''} onChange={set('xml')} /></Field>
          <Field label="Link do comprovante (https)"><input type="url" className={field} value={text.receipt ?? ''} onChange={set('receipt')} /></Field>
        </>)}

        {needsReason && <Field label="Motivo (fica no registro)"><input className={field} required minLength={5} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}

        {errorMsg && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm font-medium text-rose-700">{errorMsg}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Voltar</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Aplicando...' : 'Confirmar'}</button>
        </div>
      </form>
    </div>
  );
}

export default function CompanyFicha({ company, onChanged }: { company: FaturasCompanyRow; onChanged?: () => void }) {
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

  const hasSub = Boolean(company.subscription);
  const blocked = company.status !== 'ACTIVE' || ['PENDING_PAYMENT', 'PAST_DUE', 'CANCELED'].includes(company.billingStatus);
  const refresh = () => { setReloadKey((k) => k + 1); onChanged?.(); };
  const needSub = hasSub ? undefined : 'Esta empresa ainda não tem assinatura. Ative a assinatura primeiro.';

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

  async function manualMp(inv: PlatformInvoice) {
    try {
      const updated = await api.faturas.manualMercadoPago(inv.id);
      if (updated.invoiceUrl) await navigator.clipboard.writeText(updated.invoiceUrl).catch(() => undefined);
      toast.success('Link do Mercado Pago gerado e copiado. Envie ao cliente.');
      refresh();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível gerar o link do Mercado Pago.'); }
  }

  const rowActions = (inv: PlatformInvoice) => {
    const open = inv.status === 'OPEN' || inv.status === 'OVERDUE';
    const btn = 'btn btn-outline text-xs';
    return (
      <span className="inline-flex flex-wrap justify-end gap-1.5">
        {open && can('faturas.desconto') && <button type="button" className={btn} onClick={() => setDialog({ kind: 'discount', invoice: inv })}>Desconto</button>}
        {open && can('faturas.cobrar') && !inv.asaasPaymentId && !['PROCESSING', 'UNKNOWN'].includes(inv.paymentProcessingStatus ?? '') && <button type="button" className={btn} onClick={() => void manualMp(inv)} title="Gerar link para fatura local sem cobrança ativa no Asaas">Link Mercado Pago</button>}
        {open && can('faturas.cobrar') && <button type="button" className={btn} onClick={() => setDialog({ kind: 'cancel', invoice: inv })}>Cancelar</button>}
        {inv.status === 'PAID' && inv.refundStatus !== 'PROCESSING' && Number(inv.refundedAmount ?? 0) < Number(inv.amount) && can('faturas.reembolsar') && <>
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
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'seats' })}>Usuários</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'plan' })}>Trocar plano</button>}
        {can('faturas.desconto') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'recurring' })}>Desconto recorrente</button>}
        {can('faturas.desconto') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'freeDays' })}>Dias grátis</button>}
        {can('faturas.desconto') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'coupon' })}>Cupom</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm text-rose-700" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'cancelSub' })}>Cancelar assinatura</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => void togglePause()}>{pausedNow ? 'Retomar cobrança' : 'Pausar cobrança'}</button>}
      </section>

      {blocked && can('faturas.cobrar') && (
        <div role="alert" className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-800 sm:mx-5 lg:mx-6">
          <span><strong>Acesso bloqueado por pendência.</strong> Só o administrador consegue entrar, e apenas na área de Faturas. Libere se recebeu por outro meio ou por confiança.</span>
          <button type="button" className="btn btn-primary text-sm" onClick={() => setDialog({ kind: 'release' })}>Liberar acesso</button>
        </div>
      )}

      {!hasSub && (
        <div role="status" className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-800 sm:mx-5 lg:mx-6">
          <span>Esta empresa não tem assinatura ativa. Usuários, plano, descontos, dias grátis, cupom e pausa só funcionam depois de ativar.</span>
          {can('faturas.cobrar') && <button type="button" className="btn btn-primary text-sm" onClick={() => setDialog({ kind: 'activate' })}>Ativar assinatura</button>}
        </div>
      )}

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
