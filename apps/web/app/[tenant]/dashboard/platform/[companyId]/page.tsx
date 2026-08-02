'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Users,
  X,
  Settings,
  FolderOpen,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import api, { ApiError, type PlatformInvoice } from '@/app/lib/api';

const statusLabel: Record<string, string> = { ACTIVE: 'Ativa', SUSPENDED: 'Suspensa', CANCELLED: 'Cancelada', OPEN: 'Em aberto', PAID: 'Paga', OVERDUE: 'Vencida', CANCELED: 'Cancelada' };

function parseMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function money(value: number | string | null | undefined) {
  return parseMoney(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function date(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';
}

export default function CompanyDetailPage({ params }: { params: { tenant: string; companyId: string } }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as any) || 'general';
  const role = user?.profile?.toUpperCase();
  const [tab, setTab] = useState<'general' | 'subscription' | 'finance' | 'users' | 'documents' | 'support' | 'logs'>(initialTab);
  
  useEffect(() => {
    const paramTab = searchParams?.get('tab') as any;
    if (paramTab) setTab(paramTab);
  }, [searchParams]);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ amount: '', description: '', dueDate: '' });
  const [creatingManualInvoice, setCreatingManualInvoice] = useState(false);

  const company = useQuery(() => api.platform.getCompany(params.companyId), [params.companyId]);
  const users = useQuery(() => api.platform.listCompanyUsers(params.companyId), [params.companyId]);
  const invoices = useQuery(() => api.platform.finance.listCompany(params.companyId), [params.companyId]);
  const logs = useQuery(() => api.platform.getCompanyAuditLogs(params.companyId), [params.companyId]);
  const contracts = useQuery(() => api.platform.listManualContracts({ companyId: params.companyId }), [params.companyId]);
  const tickets = useQuery(() => api.platformSupport.list({ companyId: params.companyId }), [params.companyId]);

  if (role !== 'DEV' && role !== 'COMERCIAL') {
    return <div className="flex h-[50vh] items-center justify-center text-sm font-bold text-slate-500">Acesso restrito a Plataforma.</div>;
  }
  if (company.loading) return <LoadingState label="Carregando empresa..." />;
  if (company.error || !company.data) return <ErrorState message={company.error || 'Empresa nao encontrada.'} onRetry={company.refetch} />;

  const item = company.data;
  const billingClass = item.billingStatus === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : item.billingStatus === 'TRIAL' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700';

  async function checkout() {
    setCreatingCheckout(true);
    try {
      const result = await api.platform.finance.checkoutCompany(params.companyId);
      invoices.refetch();
      company.refetch();
      if (result.paymentUrl) {
        await navigator.clipboard.writeText(result.paymentUrl).catch(() => undefined);
        window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
        toast.success('Checkout aberto e link copiado.');
      } else if (result.active) {
        toast.success('Plano gratuito ativado.');
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível gerar o checkout.');
    } finally {
      setCreatingCheckout(false);
    }
  }

  async function createManualInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceForm.amount || !invoiceForm.description || !invoiceForm.dueDate) {
      return toast.error('Preencha todos os campos.');
    }
    setCreatingManualInvoice(true);
    try {
      await api.platform.finance.create({
        companyId: params.companyId,
        amount: Number(invoiceForm.amount),
        description: invoiceForm.description,
        dueDate: new Date(invoiceForm.dueDate).toISOString(),
        sendToAsaas: true,
      });
      toast.success('Cobrança manual gerada no Asaas com sucesso!');
      setIsInvoiceModalOpen(false);
      setInvoiceForm({ amount: '', description: '', dueDate: '' });
      invoices.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível gerar a cobrança manual.');
    } finally {
      setCreatingManualInvoice(false);
    }
  }

  async function copyLink(invoice: PlatformInvoice) {
    if (!invoice.invoiceUrl) return;
    await navigator.clipboard.writeText(invoice.invoiceUrl);
    toast.success('Link copiado.');
  }

  return (
    <div className="mx-auto w-full space-y-6 pb-12">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href={`/${params.tenant}/dashboard/platform`} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900"><ArrowLeft size={14} /> Voltar para empresas</Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-950">{item.name}</h1>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${item.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{statusLabel[item.status] || item.status}</span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${billingClass}`}>{item.billingStatus || 'TRIAL'}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{item.document || 'Sem documento'} · Plano {item.plan || 'FREE'}</p>
        </div>
        {role === 'DEV' && (
          <div className="flex items-center gap-3">
            <button onClick={() => setIsInvoiceModalOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-white border border-slate-200 px-4 text-xs font-black text-slate-700 hover:bg-slate-50 transition"><Plus size={14} /> Nova Cobrança Manual</button>
            <button onClick={checkout} disabled={creatingCheckout} className="crystal-button inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{creatingCheckout ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} Gerar checkout auto</button>
          </div>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Usuarios', value: `${item.usersCount ?? 0} / ${item.maxUsers ?? 0}`, icon: Users },
          { label: 'Colaboradores', value: `${item.employeesCount ?? 0} / ${item.maxEmployees ?? 0}`, icon: Building2 },
          { label: 'Faturas', value: invoices.data?.length ?? '-', icon: FileText },
          { label: 'Asaas', value: item.asaasCustomerId ? 'Conectado' : 'Pendente', icon: item.asaasCustomerId ? CheckCircle2 : ShieldAlert },
        ].map(card => <article key={card.label} className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</p><card.icon size={15} className="text-teal-600" /></div><p className="mt-3 text-xl font-black text-slate-950">{card.value}</p></article>)}
      </section>

      <nav className="flex gap-5 overflow-x-auto border-b border-slate-200">
        {[
          ['general', 'Resumo', Building2],
          ['subscription', 'Assinatura', Settings],
          ['finance', 'Financeiro', CreditCard],
          ['users', 'Usuários', Users],
          ['documents', 'Documentos', FolderOpen],
          ['support', 'Chamados', HelpCircle],
          ['logs', 'Auditoria', Activity],
        ].map(([id, label, Icon]: any) => <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-xs font-black transition-all ${tab === id ? 'border-violet-600 text-slate-950 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-700'}`}><Icon size={14} aria-hidden="true" className={tab === id ? 'text-violet-600' : ''} /> {label}</button>)}
      </nav>

      {tab === 'general' && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-900">Dados da empresa</h2><dl className="mt-5 grid grid-cols-2 gap-4 text-xs"><Info label="Nome" value={item.name} /><Info label="Documento" value={item.document || '-'} /><Info label="Criada em" value={date(item.createdAt)} /><Info label="Plano" value={item.plan || 'FREE'} /><Info label="Status financeiro" value={item.billingStatus || 'TRIAL'} /><Info label="Motivo bloqueio" value={item.suspensionReason || '-'} /></dl></div>
          <div className="rounded-[14px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black">Integração Asaas (Somente Leitura)</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">Gateway Gerenciado</span>
            </div>
            <dl className="mt-5 space-y-4 text-xs"><InfoDark label="Customer ID (Imutável no console)" value={item.asaasCustomerId || 'Ainda não vinculado'} /><InfoDark label="Subscription ID (Imutável no console)" value={item.asaasSubscriptionId || 'Ainda não gerada'} /></dl>
            <p className="mt-5 text-xs leading-relaxed text-slate-400">Os identificadores financeiros do Asaas são vinculados estritamente via webhook e API pelo servidor. Operações manuais na UI são bloqueadas para garantir consistência financeira e auditoria.</p>
          </div>
        </section>
      )}

      {tab === 'subscription' && (
        <section className="rounded-[14px] border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Gestão de Licenciamento & Assinatura</h3>
            <p className="text-xs text-slate-500 mt-1">Controle de planos, limites de usuários e módulos ativos.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-400 block mb-1">Plano Atual</span>
              <span className="text-lg font-black text-violet-700">{item.plan || 'FREE'}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-400 block mb-1">Limite de Usuários</span>
              <span className="text-lg font-black text-slate-900">{item.maxUsers || 5}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-400 block mb-1">Limite de Funcionários</span>
              <span className="text-lg font-black text-slate-900">{item.maxEmployees || 50}</span>
            </div>
          </div>
          {role === 'DEV' ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <span>Como <b>DEV</b>, você pode alterar os limites de licenciamento via API ou em Configurações de Plano.</span>
              <Link href={`/${params.tenant}/dashboard/platform/plans`} className="font-bold underline hover:text-amber-950">Ver Planos e Preços</Link>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-100 text-xs text-slate-600 font-medium">
              Alterações de plano e limites financeiros são restritas ao perfil de Engenharia/DEV.
            </div>
          )}
        </section>
      )}

      {tab === 'documents' && (
        <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-black text-slate-800">Contratos da Empresa</h3>
            <Link href={`/${params.tenant}/dashboard/platform/contracts?companyId=${params.companyId}`} className="crystal-button rounded-xl px-4 py-2 text-xs font-black text-white">Gerenciar Contratos</Link>
          </div>
          {contracts.loading ? <div className="p-8"><LoadingState label="Carregando contratos..." /></div> : contracts.error ? <div className="p-8"><ErrorState message={contracts.error} onRetry={contracts.refetch} /></div> : !contracts.data?.length ? <div className="p-10 text-center text-sm text-slate-400">Nenhum contrato manual registrado para esta empresa.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Licenças</th><th className="px-5 py-3">Início</th><th className="px-5 py-3">Fim</th><th className="px-5 py-3">Pagamento</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{contracts.data.map((c: any) => <tr key={c.id}><td className="px-5 py-4 font-black">{money(c.agreedAmount)}</td><td className="px-5 py-4 font-bold text-slate-700">{c.seatQuantity}</td><td className="px-5 py-4">{date(c.startsAt)}</td><td className="px-5 py-4">{c.endsAt ? date(c.endsAt) : 'Indeterminado'}</td><td className="px-5 py-4">{c.paymentMethod}</td><td className="px-5 py-4"><span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700">{c.status}</span></td></tr>)}</tbody></table></div>}
        </section>
      )}

      {tab === 'support' && (
        <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-black text-slate-800">Tickets de Suporte da Empresa</h3>
            <Link href={`/${params.tenant}/dashboard/platform/support?companyId=${params.companyId}`} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-black text-white transition">Painel Completo de Suporte</Link>
          </div>
          {tickets.loading ? <div className="p-8"><LoadingState label="Carregando chamados..." /></div> : tickets.error ? <div className="p-8"><ErrorState message={tickets.error} onRetry={tickets.refetch} /></div> : !tickets.data?.length ? <div className="p-10 text-center text-sm text-slate-400">Nenhum chamado aberto para esta empresa.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr><th className="px-5 py-3">Ticket</th><th className="px-5 py-3">Assunto</th><th className="px-5 py-3">Prioridade</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Criado em</th></tr></thead><tbody className="divide-y divide-slate-100">{tickets.data.map((t: any) => <tr key={t.id}><td className="px-5 py-4 font-bold text-indigo-600">#{t.ticketNumber}</td><td className="px-5 py-4 font-bold text-slate-800">{t.subject}</td><td className="px-5 py-4"><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-700">{t.priority}</span></td><td className="px-5 py-4"><span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">{t.status}</span></td><td className="px-5 py-4">{date(t.createdAt)}</td></tr>)}</tbody></table></div>}
        </section>
      )}

      {tab === 'users' && (
        <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm">
          {users.loading ? <div className="p-8"><LoadingState label="Carregando usuarios..." /></div> : users.error ? <div className="p-8"><ErrorState message={users.error} onRetry={users.refetch} /></div> : <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr><th className="px-5 py-3">Nome</th><th className="px-5 py-3">E-mail</th><th className="px-5 py-3">Perfil</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{users.data?.map(account => <tr key={account.id}><td className="px-5 py-4 font-black text-slate-900">{account.name}</td><td className="px-5 py-4 text-slate-600">{account.email}</td><td className="px-5 py-4 font-bold">{account.role}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${account.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{account.isActive ? 'Ativo' : 'Inativo'}</span></td></tr>)}</tbody></table>}
        </section>
      )}

      {tab === 'finance' && (
        <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm">
          {invoices.loading ? <div className="p-8"><LoadingState label="Carregando faturas..." /></div> : invoices.error ? <div className="p-8"><ErrorState message={invoices.error} onRetry={invoices.refetch} /></div> : !invoices.data?.length ? <div className="p-10 text-center text-sm text-slate-400">Nenhuma fatura.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr><th className="px-5 py-3">Descricao</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Acoes</th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.data.map(invoice => <tr key={invoice.id}><td className="px-5 py-4 font-bold text-slate-800">{invoice.description || 'Cobranca'}</td><td className="px-5 py-4 font-black">{money(invoice.amount)}</td><td className="px-5 py-4">{date(invoice.dueDate)}</td><td className="px-5 py-4"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${invoice.status === 'PAID' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : invoice.status === 'OVERDUE' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>{statusLabel[invoice.status] || invoice.status}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1">{invoice.invoiceUrl && <><button onClick={() => copyLink(invoice)} className="rounded p-2 text-slate-500 hover:bg-slate-100" title="Copiar link"><Copy size={14} /></button><a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" className="rounded p-2 text-slate-500 hover:bg-slate-100" title="Abrir"><ExternalLink size={14} /></a></>}</div></td></tr>)}</tbody></table></div>}
        </section>
      )}

      {tab === 'logs' && (
        <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          {logs.loading ? <LoadingState label="Carregando historico..." /> : logs.error ? <ErrorState message={logs.error} onRetry={logs.refetch} /> : <div className="space-y-0">{logs.data?.length ? logs.data.map(log => <div key={log.id} className="flex gap-4 border-b border-slate-100 py-4 last:border-0"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" /><div><p className="text-xs font-black text-slate-800">{log.action}</p><p className="mt-1 text-[10px] text-slate-400">{log.user?.name || 'Sistema'} · {new Date(log.createdAt).toLocaleString('pt-BR')}</p></div></div>) : <p className="py-8 text-center text-sm text-slate-400">Nenhum evento registrado.</p>}</div>}
        </section>
      )}

      {/* Modal Nova Fatura Manual */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[20px] bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-black text-slate-900">Nova Cobrança Avulsa</h2>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
            </header>
            <form onSubmit={createManualInvoice} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Valor (R$)</label>
                  <input type="number" step="0.01" min="1" required placeholder="Ex: 99.90" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Vencimento</label>
                  <input type="date" required value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Descrição da Cobrança</label>
                  <input type="text" required placeholder="Ex: Fatura Negociada - Mensalidade" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
                </div>
              </div>
              <footer className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-600 hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={creatingManualInvoice} className="crystal-button flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black text-white disabled:opacity-60">{creatingManualInvoice ? <Loader2 size={16} className="animate-spin" /> : 'Gerar e Enviar para Asaas'}</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="font-bold text-slate-400">{label}</dt><dd className="mt-1 font-black text-slate-800">{value}</dd></div>; }
function InfoDark({ label, value }: { label: string; value: string }) { return <div><dt className="font-bold text-slate-500">{label}</dt><dd className="mt-1 break-all font-mono text-teal-300">{value}</dd></div>; }