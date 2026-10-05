'use client';

import { AlertTriangle, CalendarClock, ChevronRight, CreditCard, FileText, Layers, RefreshCw, Users, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api, { ApiError, type EmpresaResumo, type PlatformInvoice } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission } from '@/app/lib/permissions';
import FaturaDrawer, { statusOf } from './_banco-fatura';
import { CancelModal, PlanModal, SeatsModal } from './_banco-plano';
import { money, shortDate } from './_format';

type Filter = 'todas' | 'abertas' | 'pagas';
const COMPANY_STATE: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Em dia', cls: 'bg-emerald-400/20 text-emerald-100' },
  TRIAL: { label: 'Período de teste', cls: 'bg-sky-400/20 text-sky-100' },
  PENDING_PAYMENT: { label: 'Aguardando pagamento', cls: 'bg-amber-400/25 text-amber-100' },
  PAST_DUE: { label: 'Em atraso', cls: 'bg-rose-400/25 text-rose-100' },
  CANCELED: { label: 'Cancelada', cls: 'bg-slate-400/25 text-slate-100' },
};

function Usage({ label, used, max }: { label: string; used: number; max: number | null }) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-white/80"><span>{label}</span><span className="font-semibold text-white">{used}{max ? ` / ${max}` : ''}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15" aria-hidden="true"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/** Faturas da empresa no estilo "banco": situação, plano, uso, faturas, pagamento e documentos. */
export default function BancoView() {
  const { user } = useAuth();
  const canPay = hasPermission(user, 'faturas.pagar');
  const canPlan = hasPermission(user, 'faturas.plano');
  const [resumo, setResumo] = useState<EmpresaResumo | null>(null);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('todas');
  const [open, setOpen] = useState<PlatformInvoice | null>(null);
  const [modal, setModal] = useState<'plan' | 'seats' | 'cancel' | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [r, list] = await Promise.all([api.faturas.empresaResumo(), api.faturas.empresaInvoices()]);
      setResumo(r); setInvoices(list);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Não foi possível carregar suas faturas.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => invoices.filter((i) => filter === 'todas' ? true : filter === 'abertas' ? i.status === 'OPEN' || i.status === 'OVERDUE' : i.status === 'PAID'), [invoices, filter]);
  const counts = { todas: invoices.length, abertas: invoices.filter((i) => i.status === 'OPEN' || i.status === 'OVERDUE').length, pagas: invoices.filter((i) => i.status === 'PAID').length };
  const next = resumo?.invoices.next ? invoices.find((i) => i.id === resumo.invoices.next!.id) ?? null : null;

  async function generate() {
    setGenerating(true);
    try {
      const r = await api.faturas.empresaCheckout();
      toast.success(r.invoice ? 'Fatura gerada.' : 'Sua conta está em dia. Não há nada a pagar agora.');
      await load();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível gerar a fatura. Tente novamente.'); }
    finally { setGenerating(false); }
  }

  if (loading && !resumo) return <p role="status" className="p-6 text-sm text-fg-mut">Carregando suas faturas…</p>;
  if (error && !resumo) return <div className="p-6"><p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</p><button type="button" className="btn btn-outline mt-3" onClick={() => void load()}>Tentar de novo</button></div>;
  if (!resumo) return null;

  const sub = resumo.subscription;
  const state = COMPANY_STATE[resumo.company.billingStatus] ?? { label: resumo.company.billingStatus, cls: 'bg-slate-400/25 text-slate-100' };
  const blocked = resumo.company.status !== 'ACTIVE' || ['PENDING_PAYMENT', 'CANCELED'].includes(resumo.company.billingStatus);
  const actions = [
    canPay && next && { label: 'Pagar fatura', icon: CreditCard, onClick: () => setOpen(next), primary: true },
    canPlan && resumo.plan && { label: 'Alterar plano', icon: Layers, onClick: () => setModal('plan') },
    canPlan && sub && { label: 'Alterar usuários', icon: Users, onClick: () => setModal('seats') },
    canPlan && sub && !sub.cancelAt && { label: 'Cancelar assinatura', icon: XCircle, onClick: () => setModal('cancel'), danger: true },
  ].filter(Boolean) as Array<{ label: string; icon: typeof Layers; onClick: () => void; primary?: boolean; danger?: boolean }>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-3 sm:p-5 lg:p-6">
      {blocked && (
        <p role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {resumo.company.billingStatus === 'CANCELED' ? 'A assinatura está cancelada. Fale com o suporte para reativar.' : 'Existe uma pendência de pagamento. Pague a fatura em aberto para liberar o acesso de toda a equipe.'}
        </p>
      )}
      {!blocked && resumo.invoices.overdueCount > 0 && (
        <p role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> Você tem {resumo.invoices.overdueCount} fatura(s) vencida(s). Regularize para evitar o bloqueio do acesso.</p>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-800 p-6 text-white shadow-lg sm:p-8" aria-label="Minha assinatura">
        <div aria-hidden="true" className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Plano atual</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${state.cls}`}>{state.label}</span>
              {sub?.billingPaused && <span className="rounded-full bg-amber-400/25 px-2.5 py-0.5 text-xs font-bold text-amber-100">Cobrança pausada</span>}
              {sub?.cancelAt && <span className="rounded-full bg-rose-400/25 px-2.5 py-0.5 text-xs font-bold text-rose-100">Cancelamento em {shortDate(sub.cancelAt)}</span>}
            </div>
            <h1 className="mt-2 text-3xl font-black">{resumo.plan?.name ?? 'Sem plano'}</h1>
            <p className="mt-3 text-sm text-white/70">{resumo.plan?.isFree ? 'Plano gratuito' : 'Mensalidade'}</p>
            <p className="text-4xl font-black tabular-nums">{resumo.plan?.isFree ? 'Grátis' : resumo.pricing ? money(resumo.pricing.monthlyTotal) : '—'}</p>
            {resumo.pricing && resumo.pricing.discount > 0 && <p className="mt-1 text-xs font-semibold text-emerald-200">Desconto aplicado: {money(resumo.pricing.discount)} por ciclo{sub?.couponCyclesLeft ? ` · mais ${sub.couponCyclesLeft} ciclo(s)` : ''}</p>}
            <p className="mt-3 flex items-center gap-2 text-sm text-white/80"><CalendarClock size={15} aria-hidden="true" /> {sub?.nextDueDate ? `Próximo vencimento: ${shortDate(sub.nextDueDate)}` : resumo.company.trialEndsAt ? `Teste até ${shortDate(resumo.company.trialEndsAt)}` : 'Sem vencimento definido'}</p>
            {(sub?.pendingPlanName || sub?.pendingSeatQuantity) && <p className="mt-2 rounded-xl bg-white/10 p-2 text-xs text-white/90">Troca agendada para o próximo ciclo: {[sub.pendingPlanName && `plano ${sub.pendingPlanName}`, sub.pendingSeatQuantity && `${sub.pendingSeatQuantity} usuário(s)`].filter(Boolean).join(' e ')}.</p>}
          </div>
          <div className="space-y-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
            <Usage label="Usuários em uso" used={resumo.usage.users} max={resumo.usage.maxUsers} />
            <Usage label="Funcionários cadastrados" used={resumo.usage.employees} max={resumo.usage.maxEmployees} />
            {!!resumo.plan?.activeModules?.length && <p className="pt-1 text-xs text-white/70">Módulos: {resumo.plan.activeModules.join(' · ')}</p>}
          </div>
        </div>
      </section>

      {actions.length > 0 && (
        <section aria-label="Ações" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {actions.map(({ label, icon: Icon, onClick, primary, danger }) => (
            <button key={label} type="button" onClick={onClick}
              className={`flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow ${primary ? 'border-purple-600 bg-purple-600 text-white' : danger ? 'border-rose-200 bg-bg text-rose-700' : 'border-line bg-bg text-fg'}`}>
              <Icon size={22} aria-hidden="true" /> {label}
            </button>
          ))}
        </section>
      )}

      {next && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-bg p-5 shadow-sm" aria-label="Próxima fatura">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-fg-mut">{next.status === 'OVERDUE' ? 'Fatura vencida' : 'Próxima fatura'}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-fg">{money(next.amount)}</p>
            <p className="text-sm text-fg-sub">{next.description || 'Mensalidade'} · vence em {shortDate(next.dueDate)}</p>
          </div>
          {canPay && <button type="button" className="btn btn-primary" onClick={() => setOpen(next)}>Ver como pagar</button>}
        </section>
      )}

      <section aria-label="Minhas faturas" className="rounded-2xl border border-line bg-bg shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <h2 className="text-base font-bold text-fg">Minhas faturas</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(['todas', 'abertas', 'pagas'] as Filter[]).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                className={`min-h-9 rounded-full px-3.5 text-xs font-bold capitalize ${filter === f ? 'bg-slate-900 text-white' : 'border border-line text-fg-sub hover:bg-black/5'}`}>{f} · {counts[f]}</button>
            ))}
            <button type="button" aria-label="Atualizar" onClick={() => void load()} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:bg-black/5"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /></button>
          </div>
        </header>

        {shown.length === 0 ? (
          <div className="p-10 text-center text-sm text-fg-mut">
            <FileText className="mx-auto mb-2" size={28} aria-hidden="true" />
            {filter === 'pagas' ? 'Ainda não há faturas pagas.' : filter === 'abertas' ? 'Nenhuma fatura em aberto. Está tudo em dia.' : 'Você ainda não tem faturas.'}
            {canPay && filter !== 'pagas' && counts.abertas === 0 && <div className="mt-3"><button type="button" className="btn btn-primary text-sm" disabled={generating} onClick={() => void generate()}>{generating ? 'Gerando…' : 'Gerar fatura do mês'}</button></div>}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((invoice) => {
              const st = statusOf(invoice.status);
              return (
                <li key={invoice.id}>
                  <button type="button" onClick={() => setOpen(invoice)} className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-black/[0.03]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/5 text-fg-sub"><FileText size={18} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-fg">{invoice.description || 'Mensalidade Innovation RH'}</span>
                      <span className="block text-xs text-fg-sub">{invoice.status === 'PAID' ? `Paga em ${shortDate(invoice.paidAt ?? invoice.dueDate)}` : `Vence em ${shortDate(invoice.dueDate)}`}</span>
                    </span>
                    <span className="text-right"><span className="block text-sm font-black tabular-nums text-fg">{money(invoice.amount)}</span><span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span></span>
                    <ChevronRight size={16} className="shrink-0 text-fg-mut" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <FaturaDrawer invoice={open} canRefund={canPay} onClose={() => setOpen(null)} onChanged={() => void load()} />
      {modal === 'plan' && <PlanModal onClose={() => setModal(null)} onDone={() => void load()} />}
      {modal === 'seats' && sub && <SeatsModal current={sub.seatQuantity} used={resumo.usage.users} onClose={() => setModal(null)} onDone={() => void load()} />}
      {modal === 'cancel' && <CancelModal endDate={sub?.currentPeriodEnd} onClose={() => setModal(null)} onDone={() => void load()} />}
    </div>
  );
}
