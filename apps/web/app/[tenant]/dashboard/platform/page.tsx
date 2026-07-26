'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Activity,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  FileSignature,
  FileText,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import api, { ApiError, type PlatformCompany, type PlatformInvoice } from '@/app/lib/api';
import { formatCurrency } from '@/app/lib/format';

type QuickAction = { label: string; description: string; href: string; icon: typeof Building2; tone: string };

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? formatCurrency(amount) : formatCurrency(0);
}

function companyStatus(company: PlatformCompany) {
  if (company.status === 'CANCELLED') return { label: 'Cancelada', className: 'border-rose-200 bg-rose-50 text-rose-700' };
  if (company.status === 'SUSPENDED') return { label: 'Suspensa', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  return { label: 'Ativa', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
}

export default function PlatformDashboardPage() {
  const params = useParams();
  const tenant = String(params?.tenant || '');
  const { user } = useAuth();
  const isDev = String(user?.role || user?.profile || '').toUpperCase() === 'DEV';
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [workingCompany, setWorkingCompany] = useState<string>();
  const [invoiceForm, setInvoiceForm] = useState({ companyId: '', amount: '', dueDate: '', description: '', sendToAsaas: true });

  const stats = useQuery(() => api.platform.stats(), []);
  const summary = useQuery(() => api.platform.finance.summary(), []);
  const invoices = useQuery(() => api.platform.finance.list({ limit: 6 }), []);
  const companies = useQuery(() => api.platform.listCompanies(), []);

  const refresh = () => { stats.refetch(); summary.refetch(); invoices.refetch(); companies.refetch(); };

  async function activateAutomaticBilling(company: PlatformCompany) {
    if (!isDev) return toast.error('Somente DEV pode ativar cobranca automatica.');
    setWorkingCompany(company.id);
    try {
      const result = await api.platform.finance.checkoutCompany(company.id);
      refresh();
      if (result.paymentUrl) window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
      toast.success(result.active ? 'Cobranca automatica ativada.' : 'Checkout Asaas preparado.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Nao foi possivel ativar o Asaas.');
    } finally {
      setWorkingCompany(undefined);
    }
  }

  async function createManualInvoice(event: React.FormEvent) {
    event.preventDefault();
    if (!isDev) return toast.error('Somente DEV pode emitir cobrancas.');
    try {
      setWorkingCompany('invoice');
      await api.platform.finance.create({
        companyId: invoiceForm.companyId,
        amount: Number(invoiceForm.amount),
        dueDate: new Date(`${invoiceForm.dueDate}T12:00:00`).toISOString(),
        description: invoiceForm.description,
        billingType: 'UNDEFINED',
        sendToAsaas: invoiceForm.sendToAsaas,
      });
      toast.success(invoiceForm.sendToAsaas ? 'Cobranca enviada ao Asaas.' : 'Cobranca local registrada.');
      setShowInvoiceModal(false);
      setInvoiceForm({ companyId: '', amount: '', dueDate: '', description: '', sendToAsaas: true });
      invoices.refetch();
      summary.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Nao foi possivel criar a cobranca.');
    } finally {
      setWorkingCompany(undefined);
    }
  }

  if (stats.loading || summary.loading || companies.loading) return <LoadingState label="Carregando central da plataforma..." />;
  if (stats.error || summary.error || companies.error) return <ErrorState message={stats.error || summary.error || companies.error || 'Falha ao carregar a plataforma.'} onRetry={refresh} />;

  const companyItems = companies.data ?? [];
  const overdue = companyItems.filter((company) => company.billingStatus === 'PAST_DUE' || company.status === 'SUSPENDED');
  const withoutAsaas = companyItems.filter((company) => company.status === 'ACTIVE' && company.plan !== 'FREE' && !company.asaasCustomerId);
  const recentInvoices = invoices.data?.items ?? [];
  const quickActions: QuickAction[] = [
    { label: 'Nova empresa', description: 'Cadastrar cliente e administrador', href: `/${tenant}/dashboard/platform/companies`, icon: Building2, tone: 'bg-sky-50 text-sky-700' },
    { label: 'Nova proposta', description: 'Montar oferta comercial', href: `/${tenant}/dashboard/platform/proposals/new`, icon: FileText, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Novo contrato', description: 'Registrar contrato manual', href: `/${tenant}/dashboard/platform/contracts`, icon: FileSignature, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Permissoes', description: 'Revisar acesso por perfil', href: `/${tenant}/dashboard/platform/permissions`, icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="mx-auto w-full space-y-5 pb-10">
      <header className="rounded-2xl bg-slate-950 p-5 text-white shadow-xl md:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">Console central</p><h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Operacao da Plataforma</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Empresas, vendas, contratos e recebimentos em um unico lugar. Acoes financeiras ficam separadas entre automaticas e manuais.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowInvoiceModal(true)} disabled={!isDev} className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-500 px-4 text-xs font-black text-slate-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"><Banknote size={15} /> Emitir cobranca</button><button type="button" onClick={refresh} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 px-3 text-xs font-bold text-white hover:bg-white/10"><RefreshCw size={14} /> Atualizar</button></div></div></header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: 'MRR ativo', value: money(summary.data?.mrr), icon: Activity, tone: 'border-violet-200 bg-violet-50 text-violet-700' },
        { label: 'Recebido', value: money(summary.data?.totals.received), icon: CheckCircle2, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
        { label: 'Em aberto', value: money(summary.data?.totals.open), icon: Banknote, tone: 'border-sky-200 bg-sky-50 text-sky-700' },
        { label: 'Em atraso', value: money(summary.data?.totals.overdue), icon: CreditCard, tone: 'border-rose-200 bg-rose-50 text-rose-700' },
      ].map((card) => <article key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider">{card.label}</p><card.icon size={17} /></div><p className="mt-3 text-2xl font-black text-slate-950">{card.value}</p></article>)}</section>

      <section><div className="mb-3 flex items-end justify-between"><div><h3 className="text-base font-black text-slate-950">Acesso rapido</h3><p className="mt-1 text-xs text-slate-500">As tarefas mais comuns ficam a um clique.</p></div><Link href={`/${tenant}/dashboard/platform/finance`} className="text-xs font-black text-violet-700 hover:underline">Abrir financeiro completo <ArrowRight size={13} className="inline" /></Link></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{quickActions.map((action) => <Link key={action.href} href={action.href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"><div className="flex items-start justify-between"><span className={`rounded-xl p-2.5 ${action.tone}`}><action.icon size={18} /></span><ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" /></div><p className="mt-4 text-sm font-black text-slate-950">{action.label}</p><p className="mt-1 text-xs text-slate-500">{action.description}</p></Link>)}</div></section>

      {(overdue.length || withoutAsaas.length) > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-500 p-2 text-white"><Settings2 size={17} /></div><div><h3 className="text-sm font-black text-amber-950">Pendencias que precisam de acao</h3><p className="mt-1 text-xs text-amber-800">{overdue.length} empresa(s) com risco financeiro e {withoutAsaas.length} sem Customer ID Asaas.</p></div></div></section>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-base font-black text-slate-950">Empresas clientes</h3><p className="mt-1 text-xs text-slate-500">Acoes financeiras e operacionais no mesmo lugar.</p></div><Link href={`/${tenant}/dashboard/platform/companies`} className="inline-flex items-center gap-1 text-xs font-black text-violet-700 hover:underline">Ver todas <ArrowRight size={13} /></Link></div>{companyItems.length === 0 ? <div className="p-8"><EmptyState message="Nenhuma empresa cadastrada." /></div> : <div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Plano</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Asaas</th><th className="px-4 py-3 text-right">Acoes</th></tr></thead><tbody className="divide-y divide-slate-100">{companyItems.slice(0, 8).map((company) => { const status = companyStatus(company); const automatic = Boolean(company.asaasSubscriptionId); return <tr key={company.id} className="hover:bg-slate-50/70"><td className="px-4 py-4"><p className="font-black text-slate-950">{company.name}</p><p className="mt-1 text-[10px] text-slate-400">{company.document || 'Sem documento'}</p></td><td className="px-4 py-4 font-bold text-slate-700">{company.plan || 'FREE'}</td><td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${status.className}`}>{status.label}</span></td><td className="px-4 py-4"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${automatic ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{automatic ? 'Automatico ativo' : company.asaasCustomerId ? 'Cliente vinculado' : 'Nao configurado'}</span></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><Link href={`/${tenant}/dashboard/platform/${company.id}?tab=general`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"><ArrowRight size={13} /> Abrir</Link>{isDev && !automatic && company.status === 'ACTIVE' && <button type="button" onClick={() => activateAutomaticBilling(company)} disabled={workingCompany === company.id} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-2 text-[11px] font-black text-white hover:bg-violet-700 disabled:opacity-60">{workingCompany === company.id ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />} Ativar Asaas</button>}</div></td></tr>; })}</tbody></table></div>}</section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h3 className="text-base font-black text-slate-950">Ultimas cobrancas</h3><p className="mt-1 text-xs text-slate-500">Sincronizacao via webhook e consulta manual ao Asaas.</p></div><Link href={`/${tenant}/dashboard/platform/finance`} className="text-xs font-black text-violet-700 hover:underline">Abrir lista</Link></div>{recentInvoices.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhuma cobranca registrada.</p> : <div className="divide-y divide-slate-100">{recentInvoices.map((invoice: PlatformInvoice) => <div key={invoice.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-slate-900">{invoice.company.name}</p><p className="mt-1 text-xs text-slate-500">{invoice.description || 'Mensalidade'} · vencimento {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</p></div><div className="flex items-center gap-3"><span className="text-sm font-black text-slate-900">{money(invoice.amount)}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">{invoice.status}</span></div></div>)}</div>}</section>

      {showInvoiceModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-base font-black text-slate-950">Emitir cobranca</h2><p className="mt-1 text-xs text-slate-500">Automatica via Asaas ou somente local.</p></div><button type="button" onClick={() => setShowInvoiceModal(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={17} /></button></header><form onSubmit={createManualInvoice} className="space-y-4 p-5"><label className="block text-xs font-bold text-slate-600">Empresa<select required value={invoiceForm.companyId} onChange={(event) => setInvoiceForm({ ...invoiceForm, companyId: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"><option value="">Selecione</option>{companyItems.filter((company) => company.status === 'ACTIVE').map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Valor<input required min="0.01" step="0.01" type="number" value={invoiceForm.amount} onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" /></label><label className="block text-xs font-bold text-slate-600">Vencimento<input required type="date" value={invoiceForm.dueDate} onChange={(event) => setInvoiceForm({ ...invoiceForm, dueDate: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" /></label></div><label className="block text-xs font-bold text-slate-600">Descricao<input required minLength={3} value={invoiceForm.description} onChange={(event) => setInvoiceForm({ ...invoiceForm, description: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" placeholder="Mensalidade, taxa extra..." /></label><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3"><input type="checkbox" checked={invoiceForm.sendToAsaas} onChange={(event) => setInvoiceForm({ ...invoiceForm, sendToAsaas: event.target.checked })} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600" /><span><span className="block text-sm font-black text-slate-900">Enviar automaticamente ao Asaas</span><span className="mt-1 block text-xs text-slate-600">Cria a cobranca no Asaas e salva o ID para sincronizacao por webhook.</span></span></label><button disabled={workingCompany === 'invoice'} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">{workingCompany === 'invoice' && <Loader2 size={15} className="animate-spin" />} Criar cobranca</button></form></div></div>}
    </div>
  );
}
