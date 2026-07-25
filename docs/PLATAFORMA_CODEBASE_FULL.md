# 🏢 Innovation RH - Código Integral do Módulo Plataforma (Aba Plataforma)

**Gerado em:** 25/07/2026
**Total de Arquivos:** 36 (24 Frontend + 12 Backend)

Este documento reúne **100% do código-fonte na íntegra (linha por linha, sem cortes ou omissões)** de todas as páginas, componentes, controllers e services que formam a aba **Plataforma** (`/dashboard/platform`) do Innovation RH, pronto para auditoria ou ajustes manuais.

---

## 📑 Índice de Arquivos

### 🖥️ Frontend (Next.js / Web App)
1. `apps/web/app/[tenant]/dashboard/platform/[companyId]/page.tsx`
2. `apps/web/app/[tenant]/dashboard/platform/_components/company-action-menu.tsx`
3. `apps/web/app/[tenant]/dashboard/platform/_components/company-manage-modal.tsx`
4. `apps/web/app/[tenant]/dashboard/platform/_components/company-users-modal.tsx`
5. `apps/web/app/[tenant]/dashboard/platform/_components/new-company-modal.tsx`
6. `apps/web/app/[tenant]/dashboard/platform/_components/platform-nav-config.ts`
7. `apps/web/app/[tenant]/dashboard/platform/_components/platform-nav.tsx`
8. `apps/web/app/[tenant]/dashboard/platform/_components/platform-stats.tsx`
9. `apps/web/app/[tenant]/dashboard/platform/access/page.tsx`
10. `apps/web/app/[tenant]/dashboard/platform/audit/page.tsx`
11. `apps/web/app/[tenant]/dashboard/platform/companies/page.tsx`
12. `apps/web/app/[tenant]/dashboard/platform/contracts/page.tsx`
13. `apps/web/app/[tenant]/dashboard/platform/coupons/page.tsx`
14. `apps/web/app/[tenant]/dashboard/platform/finance/page.tsx`
15. `apps/web/app/[tenant]/dashboard/platform/layout.tsx`
16. `apps/web/app/[tenant]/dashboard/platform/page.tsx`
17. `apps/web/app/[tenant]/dashboard/platform/permissions/page.tsx`
18. `apps/web/app/[tenant]/dashboard/platform/plans/page.tsx`
19. `apps/web/app/[tenant]/dashboard/platform/proposals/[id]/page.tsx`
20. `apps/web/app/[tenant]/dashboard/platform/proposals/new/page.tsx`
21. `apps/web/app/[tenant]/dashboard/platform/proposals/page.tsx`
22. `apps/web/app/[tenant]/dashboard/platform/subscriptions/page.tsx`
23. `apps/web/app/[tenant]/dashboard/platform/support/page.tsx`
24. `apps/web/app/[tenant]/dashboard/platform/whatsapp/page.tsx`

### ⚙️ Backend (NestJS / API)
1. `apps/api/src/modules/platform/dto/create-platform-company-user.dto.ts`
2. `apps/api/src/modules/platform/dto/create-platform-company.dto.ts`
3. `apps/api/src/modules/platform/dto/update-platform-company-user.dto.ts`
4. `apps/api/src/modules/platform/dto/update-platform-company.dto.ts`
5. `apps/api/src/modules/platform/global-permissions.controller.ts`
6. `apps/api/src/modules/platform/global-permissions.service.ts`
7. `apps/api/src/modules/platform/plans.controller.ts`
8. `apps/api/src/modules/platform/plans.service.ts`
9. `apps/api/src/modules/platform/platform.controller.ts`
10. `apps/api/src/modules/platform/platform.module.ts`
11. `apps/api/src/modules/platform/platform.repository.ts`
12. `apps/api/src/modules/platform/platform.service.ts`

---

## 🖥️ CÓDIGO-FONTE: FRONTEND

### 📄 `apps/web/app/[tenant]/dashboard/platform/[companyId]/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  const role = user?.profile?.toUpperCase();
  const [tab, setTab] = useState<'general' | 'users' | 'finance' | 'logs'>('general');
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ amount: '', description: '', dueDate: '' });
  const [creatingManualInvoice, setCreatingManualInvoice] = useState(false);

  const company = useQuery(() => api.platform.getCompany(params.companyId), [params.companyId]);
  const users = useQuery(() => api.platform.listCompanyUsers(params.companyId), [params.companyId]);
  const invoices = useQuery(() => api.platform.finance.listCompany(params.companyId), [params.companyId]);
  const logs = useQuery(() => api.platform.getCompanyAuditLogs(params.companyId), [params.companyId]);

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
        <div className="flex items-center gap-3">
          <button onClick={() => setIsInvoiceModalOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-white border border-slate-200 px-4 text-xs font-black text-slate-700 hover:bg-slate-50 transition"><Plus size={14} /> Nova Cobrança Manual</button>
          <button onClick={checkout} disabled={creatingCheckout} className="crystal-button inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{creatingCheckout ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} Gerar checkout auto</button>
        </div>
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
          ['general', 'Visao geral', Building2],
          ['users', 'Usuarios', Users],
          ['finance', 'Financeiro', CreditCard],
          ['logs', 'Historico', Activity],
        ].map(([id, label, Icon]: any) => <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-xs font-black ${tab === id ? 'border-teal-600 text-slate-950' : 'border-transparent text-slate-400 hover:text-slate-700'}`}><Icon size={14} /> {label}</button>)}
      </nav>

      {tab === 'general' && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-900">Dados da empresa</h2><dl className="mt-5 grid grid-cols-2 gap-4 text-xs"><Info label="Nome" value={item.name} /><Info label="Documento" value={item.document || '-'} /><Info label="Criada em" value={date(item.createdAt)} /><Info label="Plano" value={item.plan || 'FREE'} /><Info label="Status financeiro" value={item.billingStatus || 'TRIAL'} /><Info label="Motivo bloqueio" value={item.suspensionReason || '-'} /></dl></div>
          <div className="rounded-[14px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><h2 className="text-sm font-black">Integração Asaas</h2><dl className="mt-5 space-y-4 text-xs"><InfoDark label="Customer ID" value={item.asaasCustomerId || 'Ainda não criado'} /><InfoDark label="Subscription ID" value={item.asaasSubscriptionId || 'Ainda não criada'} /></dl><p className="mt-5 text-xs leading-relaxed text-slate-400">O pagamento confirmado ativa a empresa. Faturas recorrentes vencidas entram em carência e depois suspendem o acesso automaticamente.</p></div>
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
```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/_components/company-action-menu.tsx`

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Key, MoreVertical, Power, Settings, Archive, Users } from 'lucide-react';
import { type PlatformCompany } from '@/app/lib/api';

interface CompanyActionMenuProps {
  company: PlatformCompany;
  tenant: string;
  isSuperAdmin: boolean;
  canManageUsers: boolean;
  canManageLicenses: boolean;
  status: string;
  onManageUsers: () => void;
  onManageLicense: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  loadingToggle: boolean;
  loadingDelete: boolean;
}

export function CompanyActionMenu({
  company,
  tenant,
  isSuperAdmin,
  canManageUsers,
  canManageLicenses,
  status,
  onManageUsers,
  onManageLicense,
  onToggleStatus,
  onDelete,
  loadingToggle,
  loadingDelete
}: CompanyActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 z-[100] mt-1 w-48 origin-top-right rounded-[10px] border border-slate-200 bg-white p-1 shadow-2xl ring-1 ring-black ring-opacity-5">
          <div className="flex flex-col">
            <Link 
              href={`/${tenant}/dashboard/platform/${company.id}`} 
              className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <FileText size={14} className="text-slate-400" />
              Detalhes
            </Link>

            {canManageUsers && (
              <button 
                onClick={() => { setOpen(false); onManageUsers(); }} 
                className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Users size={14} className="text-slate-400" />
                Usuários
              </button>
            )}

            {canManageLicenses && (
              <button 
                onClick={() => { setOpen(false); onManageLicense(); }} 
                className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Settings size={14} className="text-slate-400" />
                Gerenciar Licença
              </button>
            )}

            {isSuperAdmin && (
              <>
                <div className="my-1 border-t border-slate-100"></div>
                <Link 
                  href={`/auth/ghost-init?companyId=${company.id}`} 
                  target="_blank" 
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[11px] font-bold text-[#0030B9] hover:bg-blue-50"
                >
                  <Key size={14} />
                  Acessar (Ghost)
                </Link>
                
                <button 
                  onClick={() => { setOpen(false); onToggleStatus(); }} 
                  disabled={loadingToggle}
                  className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
                >
                  <Power size={14} />
                  {status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                </button>
                
                <button 
                  onClick={() => { setOpen(false); onDelete(); }} 
                  disabled={loadingDelete}
                  className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Archive size={14} />
                  Arquivar empresa
                </button>
              </>
            )}
            
            {!canManageUsers && !isSuperAdmin && (
              <div className="px-3 py-2 text-[10px] font-semibold text-slate-400">
                Acesso limitado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/_components/company-manage-modal.tsx`

```tsx
'use client';

import { useState } from 'react';
import { CreditCard, Database, MessageSquare, Shield, X } from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformCompany } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';

export function safeIsoDate(val: any) {
  if (!val) return '';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

export function CompanyManageModal({ company, onClose, onSave, loading, error }: { company: PlatformCompany; onClose: () => void; onSave: (data: any) => void; loading: boolean; error: string | null }) {
  const [activeTab, setActiveTab] = useState<string>('plan');

  const plansData = useQuery(() => api.platform.listPlans(), []);
  const [name, setName] = useState(company.name || '');
  const [cnpj, setCnpj] = useState(company.document || '');
  const [maxUsers, setMaxUsers] = useState(company.maxUsers);
  const [maxEmployees, setMaxEmployees] = useState(company.maxEmployees ?? 1);
  const [plan, setPlan] = useState(company.platformPlanId || company.plan || 'FREE');
  const [billingStatus, setBillingStatus] = useState<'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PENDING_PAYMENT'>(company.billingStatus ?? 'TRIAL');
  const [trialEndsAt, setTrialEndsAt] = useState(safeIsoDate(company.trialEndsAt));
  const [activeModules, setActiveModules] = useState<string[]>(company.activeModules || ['employees', 'time-track', 'vacations', 'management', 'whatsapp']);
  const [asaasCustomerId, setAsaasCustomerId] = useState(company.asaasCustomerId || '');
  const [asaasSubscriptionId, setAsaasSubscriptionId] = useState(company.asaasSubscriptionId || '');
  const [internalNotes, setInternalNotes] = useState(company.internalNotes || '');

  const handleGeneratePdf = () => {
    const selectedPlan = plansData.data?.find(p => p.id === plan);
    if (!selectedPlan) return alert('Selecione um plano da plataforma primeiro.');
    
    const { buildPdfShell, infoGrid, section, signatureBlock, printPdf } = require('@/app/lib/pdf-utils');
    const pdfCompanyData = { 
      name: company.name, 
      document: company.document || 'N/A', 
      address: company.address || 'Não informado', 
      city: '', state: '' 
    };

    const objContent = '<p class="text-[11px] text-slate-700 text-justify mb-2">O presente contrato tem como objeto a licença de uso do software como serviço (SaaS) denominado "Innovation RH", referente ao plano <strong>' + selectedPlan.name + '</strong>.<'+'/'+'p>';
    const termsContent = '<p class="text-[11px] text-slate-700 text-justify mb-2">1. A CONTRATADA compromete-se a manter a plataforma acessível e funcional, ressalvadas as manutenções programadas.<'+'br><'+'br>2. Em caso de inadimplência (status: Inadimplente), o sistema suspenderá automaticamente o acesso aos módulos contratados, limitando o acesso a funções de administração até a regularização.<'+'br><'+'br>3. O suporte será prestado dentro do horário comercial e os SLAs obedecem a política de suporte estabelecida.<'+'/p>';
    const condGrid = infoGrid([
      { label: 'Plano', value: selectedPlan.name },
      { label: 'Valor', value: selectedPlan.isFree ? 'Gratuito' : 'R$ ' + parseFloat(String(selectedPlan.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' / ' + selectedPlan.cycle },
      { label: 'Max. Usuários', value: String(maxUsers) },
      { label: 'Max. Funcionários', value: String(maxEmployees) },
    ]);
    
    const html = buildPdfShell({ title: 'Contrato de Prestação de Serviços', subtitle: 'Innovation RH Plataforma' }, pdfCompanyData, section('1. O Objeto', objContent) + section('2. Condições Comerciais', condGrid) + section('3. Termos Gerais', termsContent) + signatureBlock(['Innovation RH System', company.name]));
    
    printPdf(html, 'contrato-' + company.id + '.pdf');
  };

  const changed = 
    name !== (company.name || '') ||
    cnpj !== (company.document || '') ||
    maxUsers !== (company.maxUsers ?? 1) || 
    maxEmployees !== (company.maxEmployees ?? 1) || 
    plan !== (company.plan ?? 'FREE') || 
    billingStatus !== (company.billingStatus ?? 'TRIAL') || 
    trialEndsAt !== safeIsoDate(company.trialEndsAt) || 
    JSON.stringify(activeModules) !== JSON.stringify(company.activeModules || ['employees', 'time-track', 'vacations', 'management', 'whatsapp']) ||
    asaasCustomerId !== (company.asaasCustomerId || '') ||
    asaasSubscriptionId !== (company.asaasSubscriptionId || '') ||
    internalNotes !== (company.internalNotes || '');

  const valid = name.trim().length > 0 && maxUsers >= 1 && maxUsers >= company.usersCount && maxEmployees >= 1 && maxEmployees >= company.employeesCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[12px] border border-slate-200 bg-white p-0 shadow-xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-black text-slate-950">Gerenciar {normalizeDisplayName(company.name)}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">Configurações, limites e financeiro</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {/* TABS */}
        <div className="flex gap-6 border-b border-slate-100 px-6 pt-2 overflow-x-auto">
          {[
            { id: 'plan', label: 'Planos e Limites', icon: <Database size={14} /> },
            { id: 'permissions', label: 'Permissões', icon: <Shield size={14} /> },
            { id: 'finance', label: 'Financeiro', icon: <CreditCard size={14} /> },
            { id: 'crm', label: 'CRM / Notas', icon: <MessageSquare size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-xs font-bold transition-colors ${activeTab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          {/* Campos de Nome e CNPJ — sempre visíveis, independente da aba */}
          <div className="rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Nome da Empresa <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Razão social ou nome fantasia"
                  className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500"
                />
                {name.trim().length === 0 && <p className="mt-1 text-[10px] font-semibold text-rose-600">Nome obrigatório</p>}
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">CNPJ</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {activeTab === 'plan' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Usuários</label>
                  <span className="text-[10px] font-bold text-slate-400">{company.usersCount} em uso</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={Math.max(1, company.usersCount)} value={maxUsers} onChange={(e) => setMaxUsers(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500" />
                </div>
                {maxUsers < company.usersCount && <p className="mt-1 text-[10px] font-semibold text-rose-600">Não pode ser menor que o atual ({company.usersCount})</p>}
              </div>

              <div className="rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Funcionários</label>
                  <span className="text-[10px] font-bold text-slate-400">{company.employeesCount} em uso</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={Math.max(1, company.employeesCount)} value={maxEmployees} onChange={(e) => setMaxEmployees(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500" />
                </div>
                {maxEmployees < company.employeesCount && <p className="mt-1 text-[10px] font-semibold text-rose-600">Não pode ser menor que o atual ({company.employeesCount})</p>}
              </div>

              <div className="sm:col-span-2 rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Plano Ativo</label>
                    <select value={plan} onChange={(e) => setPlan(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500 bg-white">
                      <option value="FREE">Free Trial / Nenhum</option>
                      {plansData.data?.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.isHidden ? '(Uso Interno)' : ''} - {p.isFree ? 'FREE' : `R$ ${parseFloat(String(p.price || 0)).toFixed(2)}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Status de Faturamento</label>
                    <select value={billingStatus} onChange={(e) => setBillingStatus(e.target.value as 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PENDING_PAYMENT')} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500 bg-white">
                      <option value="TRIAL">Em Teste (Trial)</option>
                      <option value="ACTIVE">Ativo</option>
                      <option value="PAST_DUE">Inadimplente</option>
                      <option value="CANCELED">Cancelado</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={handleGeneratePdf}
                    className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"
                  >
                    Gerar Contrato (PDF)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm">
              <label className="mb-4 block text-[11px] font-black uppercase tracking-wider text-slate-500">Módulos Liberados</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'employees', label: 'Funcionários' },
                  { id: 'time-track', label: 'Controle de Ponto' },
                  { id: 'vacations', label: 'Gestão de Férias' },
                  { id: 'management', label: 'Painel de Gestão' },
                  { id: 'whatsapp', label: 'Integração WhatsApp' },
                ].map(mod => (
                  <label key={mod.id} className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 p-2 rounded-[8px] hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600" checked={activeModules.includes(mod.id)} onChange={(e) => {
                      if (e.target.checked) setActiveModules(prev => [...prev, mod.id]);
                      else setActiveModules(prev => prev.filter(id => id !== mod.id));
                    }} />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0030B9] text-white">
                    <Database size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Integração Asaas</h4>
                    <p className="text-[11px] text-slate-500">Vincule a empresa ao cliente e assinatura do Asaas</p>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Customer ID (Asaas)</label>
                    <input type="text" placeholder="cus_00000..." value={asaasCustomerId} onChange={(e) => setAsaasCustomerId(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 font-mono" />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Subscription ID (Asaas)</label>
                    <input type="text" placeholder="sub_00000..." value={asaasSubscriptionId} onChange={(e) => setAsaasSubscriptionId(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 font-mono" />
                  </div>
                </div>

                {(asaasCustomerId || asaasSubscriptionId) && (
                  <div className="mt-4 flex gap-2">
                    {asaasCustomerId && (
                      <a href={`https://www.asaas.com/customer/view/${asaasCustomerId}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#0030B9] hover:underline">
                        Abrir Cliente no Asaas
                      </a>
                    )}
                    {asaasCustomerId && asaasSubscriptionId && <span className="text-slate-300">|</span>}
                    {asaasSubscriptionId && (
                      <a href={`https://www.asaas.com/subscription/view/${asaasSubscriptionId}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#0030B9] hover:underline">
                        Abrir Assinatura no Asaas
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm flex flex-col h-full">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Anotações Internas (Somente DEV/COMERCIAL)</label>
              <textarea 
                value={internalNotes} 
                onChange={(e) => setInternalNotes(e.target.value)} 
                placeholder="Registre aqui o histórico de negociação, alinhamentos e observações técnicas sobre o cliente..."
                className="w-full flex-1 min-h-[160px] rounded-[8px] border border-slate-200 p-3 text-sm outline-none focus:border-teal-500 resize-y" 
              />
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-100 p-6 bg-white rounded-b-[12px]">
          <div className="text-[11px]">
            {changed ? (
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-[4px]">Alterações pendentes em abas</span>
            ) : (
              <span className="text-slate-400">Nenhuma alteração</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline h-9 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
            <button
              onClick={() => valid && changed && onSave({ 
                name,
                document: cnpj,
                maxUsers, 
                maxEmployees, 
                plan, 
                billingStatus, 
                trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : undefined, 
                activeModules, 
                asaasCustomerId, 
                asaasSubscriptionId, 
                internalNotes 
              })}
              disabled={!valid || !changed || loading}
              className="crystal-button h-9 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Salvar Empresa'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/_components/company-users-modal.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Edit3, Plus, Trash2, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type AppUser, type PlatformCompany, type PlatformCompanyUserRole } from '@/app/lib/api';
import { ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

const COMPANY_USER_ROLES: PlatformCompanyUserRole[] = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
type CompanyUserForm = { name: string; email: string; password: string; role: PlatformCompanyUserRole; isActive?: boolean };

function F({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
    </label>
  );
}

export function CompanyUsersModal({ company, onClose }: { company: PlatformCompany; onClose: () => void }) {
  const users = useQuery(() => api.platform.listCompanyUsers(company.id), [company.id]);
  const onlineUsers = useQuery(() => api.platform.getOnlineUsers(), []);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const remove = useMutation((userId: string) => api.platform.deleteCompanyUser(company.id, userId), { onSuccess: () => users.refetch() });

  async function handleDelete(user: AppUser) {
    if (!window.confirm(`Remover o acesso de ${user.name}?`)) return;
    await remove.mutate(user.id).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-3xl rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-950">Usuários de {normalizeDisplayName(company.name)}</h3>
            <p className="mt-1 text-xs text-slate-500">{company.usersCount} / {company.maxUsers} usuarios</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="mb-4 flex justify-end">
          <button onClick={() => setOpenNew(true)} className="crystal-button inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-xs font-black text-white">
            <Plus size={13} /> Novo usuario
          </button>
        </div>
        {remove.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{remove.error}</p>}
        {users.loading ? <LoadingState label="Carregando usuarios..." /> : users.error ? <ErrorState message={users.error} onRetry={users.refetch} /> : (
          <div className="max-h-[420px] overflow-auto rounded-[8px] border border-slate-100">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-slate-50 text-[11px] font-medium text-slate-500">
                <tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Perfil</th><th className="p-3">Status</th><th className="p-3">Sessão</th><th className="p-3">Ações</th></tr>
              </thead>
              <tbody>
                {(users.data ?? []).map((u) => {
                  const isOnline = onlineUsers.data?.some((ou) => ou.id === u.id);
                  return (
                  <tr key={u.id} className="border-t border-slate-100 text-xs">
                    <td className="p-3 font-semibold text-slate-950">{normalizeDisplayName(u.name)}</td>
                    <td className="p-3 text-slate-600">{u.email}</td>
                    <td className="p-3 text-slate-600">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="p-3 text-slate-600">{u.isActive === false ? 'Bloqueado' : 'Ativo'}</td>
                    <td className="p-3">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(u)} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"><Edit3 size={12} />Editar</button>
                        <button onClick={() => handleDelete(u)} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-rose-600"><Trash2 size={12} />Remover</button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
        {(openNew || editing) && (
          <CompanyUserFormModal
            companyId={company.id}
            user={editing ?? undefined}
            onClose={() => { setOpenNew(false); setEditing(null); }}
            onDone={() => { setOpenNew(false); setEditing(null); users.refetch(); }}
          />
        )}
      </div>
    </div>
  );
}

function CompanyUserFormModal({ companyId, user, onClose, onDone }: { companyId: string; user?: AppUser; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<CompanyUserForm>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: (user?.role as PlatformCompanyUserRole) ?? 'FUNCIONARIO',
    isActive: user?.isActive ?? true,
  });
  const save = useMutation(() => {
    if (user) {
      const { password, ...rest } = form;
      return api.platform.updateCompanyUser(companyId, user.id, { ...rest, name: normalizeDisplayName(rest.name ?? ''), email: rest.email?.trim().toLowerCase(), ...(password ? { password } : {}) });
    }
    const { isActive, ...createInput } = form;
    return api.platform.createCompanyUser(companyId, { ...createInput, name: normalizeDisplayName(createInput.name), email: createInput.email.trim().toLowerCase() });
  }, { onSuccess: onDone });
  const valid = form.name && form.email && (user || form.password.length >= 8);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-base font-black text-slate-950">{user ? 'Editar usuario' : 'Novo usuario'}</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {save.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{save.error}</p>}
        <div className="space-y-3">
          <F label="Nome" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
          <F label="E-mail" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
          <F label={user ? 'Nova senha (opcional)' : 'Senha padrao (min. 8 chars)'} type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} />
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>Perfil</span>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as PlatformCompanyUserRole }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
              {COMPANY_USER_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
            </select>
          </label>
          {user && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              Usuario ativo
            </label>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button onClick={() => valid && save.mutate().catch(() => {})} disabled={!valid || save.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
            {save.loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/_components/new-company-modal.tsx`

```tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type CreatePlatformCompanyInput } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';

function F({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
    </label>
  );
}

export function NewCompanyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const plansData = useQuery(() => api.platform.listPlans(), []);

  const [form, setForm] = useState<CreatePlatformCompanyInput & { planId?: string }>({
    name: '', document: '', slug: '', maxUsers: 10, maxEmployees: 20,
    adminName: '', adminEmail: '', adminPassword: '',
  });
  
  const create = useMutation(() => api.platform.createCompany({
    ...form,
    name: normalizeDisplayName(form.name),
    document: form.document?.replace(/\D/g, ''),
    adminName: normalizeDisplayName(form.adminName),
    adminEmail: form.adminEmail.trim().toLowerCase(),
    planId: form.planId,
  }), { onSuccess: (result) => {
    if (result.paymentUrl) {
      window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
      toast.success('Empresa criada. Checkout Asaas aberto em nova aba.');
    } else if (result.billingSetupPending) {
      toast.warning('Empresa criada, mas o checkout precisa ser retomado em Detalhes.');
    } else {
      toast.success('Empresa criada e ativada.');
    }
    onDone();
  } });
  
  const valid = form.name && form.adminName && form.adminEmail && form.adminPassword.length >= 8;

  function set<K extends keyof (CreatePlatformCompanyInput & { planId?: string })>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Nova empresa</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {create.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{create.error}</p>}
        <div className="grid gap-3 sm:grid-cols-2 mb-3">
          <F label="Nome da empresa" value={form.name} onChange={(v) => set('name', v)} required />
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">CNPJ</label>
            <div className="flex gap-2">
              <input type="text" value={form.document ?? ''} onChange={(e) => set('document', e.target.value)} className="h-10 flex-1 rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
              <button 
                type="button"
                onClick={async () => {
                  if (!form.document || form.document.length < 14) return alert('Digite um CNPJ válido');
                  try {
                    const res = await api.platform.getReceitaCnpj(form.document.replace(/\D/g, ''));
                    if (res.nome) set('name', res.nome);
                    if (res.email) set('adminEmail', res.email);
                  } catch (e: any) {
                    alert(e.message || 'Erro ao buscar CNPJ');
                  }
                }}
                className="btn-outline px-3 rounded-[8px] text-xs font-bold whitespace-nowrap h-10"
              >
                Buscar
              </button>
            </div>
          </div>
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
            <span>Plano (Opcional)</span>
            <select value={form.planId || ''} onChange={e => {
              const pId = e.target.value;
              set('planId', pId);
              const plan = plansData.data?.find(p => p.id === pId);
              if (plan) {
                set('maxUsers', plan.maxUsers);
                set('maxEmployees', plan.maxEmployees);
              }
            }} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
              <option value="">Sem plano (Limites manuais)</option>
              {plansData.data?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isHidden ? '(Uso Interno)' : ''} - {p.isFree ? 'FREE' : `R$ ${parseFloat(String(p.price || 0)).toFixed(2)}`}
                </option>
              ))}
            </select>
          </label>
          <F label="Max. usuarios" type="number" value={String(form.maxUsers)} onChange={(v) => set('maxUsers', Number(v) || 6)} />
          <F label="Max. funcionarios" type="number" value={String(form.maxEmployees)} onChange={(v) => set('maxEmployees', Number(v) || 50)} />
        </div>
        <p className="mb-2 mt-4 text-[11px] font-black uppercase tracking-wider text-slate-400">Admin inicial</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome" value={form.adminName} onChange={(v) => set('adminName', v)} required />
          <F label="E-mail" type="email" value={form.adminEmail} onChange={(v) => set('adminEmail', v)} required />
          <div className="sm:col-span-2">
            <F label="Senha (min. 8 chars)" type="password" value={form.adminPassword} onChange={(v) => set('adminPassword', v)} required />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button onClick={() => valid && create.mutate().catch(() => {})} disabled={!valid || create.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
            {create.loading ? 'Criando...' : 'Criar empresa'}
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/_components/platform-nav-config.ts`

```tsx
export type PlatformNavItem = { label: string; href: string };
export type PlatformNavGroup = { key: string; label: string; items: PlatformNavItem[] };

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    key: 'overview',
    label: 'Visão Geral',
    items: [{ label: 'Central', href: '' }],
  },
  {
    key: 'operations',
    label: 'Operações',
    items: [
      { label: 'Empresas', href: '/companies' },
      { label: 'Acessos', href: '/access' },
      { label: 'Auditoria', href: '/audit' },
    ],
  },
  {
    key: 'finance',
    label: 'Financeiro',
    items: [
      { label: 'Faturamento', href: '/finance' },
      { label: 'Propostas', href: '/proposals' },
      { label: 'Contratos', href: '/contracts' },
      { label: 'Assinaturas', href: '/subscriptions' },
    ],
  },
  {
    key: 'products',
    label: 'Produtos',
    items: [
      { label: 'Planos', href: '/plans' },
      { label: 'Cupons', href: '/coupons' },
    ],
  },
  {
    key: 'communication',
    label: 'Comunicação',
    items: [
      { label: 'WhatsApp', href: '/whatsapp' },
    ],
  },
];

// Regra herdada do layout.tsx antigo: usuários COMERCIAL só enxergam Central, Empresas e Propostas.
const COMERCIAL_ALLOWED_LABELS = new Set(['Central', 'Empresas', 'Propostas']);

export function getPlatformNavGroups(role: string): PlatformNavGroup[] {
  if (role === 'DEV') return PLATFORM_NAV_GROUPS;
  return PLATFORM_NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => COMERCIAL_ALLOWED_LABELS.has(item.label)),
    }))
    .filter((group) => group.items.length > 0);
}

export function resolvePlatformActive(base: string, pathname: string, groups: PlatformNavGroup[]) {
  for (const group of groups) {
    for (const item of group.items) {
      const full = `${base}${item.href}`;
      const isActive = item.href ? pathname.startsWith(full) : pathname === base || pathname === `${base}/`;
      if (isActive) return { group, item };
    }
  }
  return { group: null as PlatformNavGroup | null, item: null as PlatformNavItem | null };
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/_components/platform-nav.tsx`

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { resolvePlatformActive, type PlatformNavGroup } from './platform-nav-config';

export function PlatformNav({ base, groups }: { base: string; groups: PlatformNavGroup[] }) {
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const { group: activeGroup } = resolvePlatformActive(base, pathname, groups);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenKey(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  function isItemActive(href: string) {
    const full = `${base}${href}`;
    return href ? pathname.startsWith(full) : pathname === base || pathname === `${base}/`;
  }

  return (
    <nav ref={containerRef} className="relative flex items-center gap-1 border-b border-slate-200" aria-label="Navegação da plataforma">
      {groups.map((group) => {
        const isGroupActive = activeGroup?.key === group.key;

        if (group.items.length === 1) {
          const item = group.items[0];
          return (
            <Link
              key={group.key}
              href={`${base}${item.href}`}
              className={`relative px-4 py-3 text-sm font-semibold transition-colors ${isGroupActive ? 'text-violet-700' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {group.label}
              {isGroupActive && <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-violet-600" />}
            </Link>
          );
        }

        const isOpen = openKey === group.key;
        return (
          <div key={group.key} className="relative">
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : group.key)}
              className={`relative flex items-center gap-1 px-4 py-3 text-sm font-semibold transition-colors ${isGroupActive ? 'text-violet-700' : 'text-slate-500 hover:text-slate-900'}`}
              aria-expanded={isOpen}
              aria-haspopup="true"
            >
              {group.label}
              <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              {isGroupActive && <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-violet-600" />}
            </button>
            {isOpen && (
              <div className="absolute left-0 top-full z-[100] mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                {group.items.map((item) => {
                  const itemActive = isItemActive(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={`${base}${item.href}`}
                      onClick={() => setOpenKey(null)}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${itemActive ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/_components/platform-stats.tsx`

```tsx
'use client';

import { Activity, AlertTriangle, Building2, Shield, Users } from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformStats as PlatformStatsData } from '@/app/lib/api';

const STAT_ITEMS: { label: string; key: keyof PlatformStatsData; icon: typeof Building2 }[] = [
  { label: 'Empresas', key: 'companies', icon: Building2 },
  { label: 'Ativas', key: 'activeCompanies', icon: Activity },
  { label: 'Usuários', key: 'users', icon: Users },
  { label: 'Funcionários', key: 'employees', icon: Users },
  { label: 'Suspensas', key: 'suspendedCompanies', icon: Shield },
  { label: 'Inadimplentes', key: 'pastDueCompanies', icon: AlertTriangle },
];

export function PlatformStats() {
  const stats = useQuery(() => api.platform.stats(), []);

  return (
    <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {STAT_ITEMS.map(({ label, key, icon: Icon }) => (
        <div key={label} className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <Icon size={16} strokeWidth={1.8} className="text-slate-300" />
          </div>
          <p className="text-[28px] font-bold leading-none text-slate-950">{stats.data?.[key] ?? '-'}</p>
        </div>
      ))}
    </section>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/access/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

export default function AccessPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { request<any[]>('/platform/online-users').then(setItems).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  return <div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[680px] w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Usuário</th><th className="p-4">Empresa</th><th className="p-4">Perfil</th><th className="p-4">Última atividade</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id || index} className="border-b"><td className="p-4 font-bold">{item.name || item.email}</td><td className="p-4">{item.company?.name || item.companyName || '—'}</td><td className="p-4">{item.role}</td><td className="p-4">{item.lastActiveAt ? new Date(item.lastActiveAt).toLocaleString('pt-BR') : '—'}</td></tr>)}</tbody></table></div>;
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/audit/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

export default function AuditPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { request<any[]>('/platform/companies').then(setCompanies).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (!companyId) { setLogs([]); return; } request<any[]>(`/platform/companies/${companyId}/audit-logs`).then(setLogs).catch((e) => setError(e.message)); }, [companyId]);
  return <div className="space-y-4"><select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-11 w-full max-w-md rounded-xl border bg-white px-3"><option value="">Selecione uma empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>{error && <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}<div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[760px] w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Data</th><th className="p-4">Ação</th><th className="p-4">Entidade</th><th className="p-4">Usuário</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b"><td className="p-4">{new Date(log.createdAt).toLocaleString('pt-BR')}</td><td className="p-4 font-bold">{log.action}</td><td className="p-4">{log.entity}</td><td className="p-4">{log.user?.name || log.user?.email || 'Sistema'}</td></tr>)}</tbody></table></div></div>;
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/companies/page.tsx`

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type PlatformCompany } from '@/app/lib/api';
import { formatDate } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

import { NewCompanyModal } from '../_components/new-company-modal';
import { CompanyUsersModal } from '../_components/company-users-modal';
import { CompanyManageModal } from '../_components/company-manage-modal';
import { PlatformStats } from '../_components/platform-stats';
import { CompanyActionMenu } from '../_components/company-action-menu';

export default function CompaniesPage() {
  const params = useParams();
  const { user } = useAuth();
  const tenant = String(params?.tenant || user?.companyId || 'empresa');
  const currentRole = user?.profile?.toUpperCase();
  const isSuperAdmin = currentRole === 'DEV';
  
  const stats = useQuery(() => api.platform.stats(), []);
  const companies = useQuery(() => api.platform.listCompanies(), []);
  
  const [open, setOpen] = useState(false);
  const [usersCompany, setUsersCompany] = useState<PlatformCompany | null>(null);
  const [licenseCompany, setLicenseCompany] = useState<PlatformCompany | null>(null);
  const [search, setSearch] = useState('');

  const toggleActive = useMutation(
    ({ id, status, suspensionReason }: { id: string; status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'; suspensionReason?: string | null }) =>
      api.platform.updateCompany(id, { status, suspensionReason }),
    { onSuccess: () => { companies.refetch(); stats.refetch(); } },
  );

  const remove = useMutation((id: string) => api.platform.deleteCompany(id), {
    onSuccess: () => { companies.refetch(); stats.refetch(); },
  });

  const updateLicense = useMutation(
    ({ id, ...payload }: any) =>
      api.platform.updateCompany(id, payload),
    { onSuccess: () => { companies.refetch(); stats.refetch(); setLicenseCompany(null); } },
  );

  function canManageCompanyUsers(c: PlatformCompany) {
    if (isSuperAdmin) return true;
    return currentRole === 'COMERCIAL' && c.commercialOwnerId === user?.id;
  }

  function canManageLicenses(c: PlatformCompany) {
    if (isSuperAdmin) return true;
    return currentRole === 'COMERCIAL' && c.commercialOwnerId === user?.id;
  }

  async function handleToggle(c: PlatformCompany) {
    if (!isSuperAdmin) return;
    const currentStatus = c.status ?? (c.isActive ? 'ACTIVE' : 'SUSPENDED');
    if (currentStatus !== 'ACTIVE') {
      await toggleActive.mutate({ id: c.id, status: 'ACTIVE', suspensionReason: null }).catch(() => {});
      return;
    }
    const reason = window.prompt('Motivo: inadimplencia ou solicitacao_voluntaria?', 'inadimplencia');
    if (reason === null) return;
    const normalized = reason.trim() === 'solicitacao_voluntaria' ? 'solicitacao_voluntaria' : reason.trim() === 'não informado' ? 'não informado' : 'inadimplencia';
    await toggleActive.mutate({ id: c.id, status: 'SUSPENDED', suspensionReason: normalized }).catch(() => {});
  }

  async function handleDelete(c: PlatformCompany) {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Arquivar "${c.name}"? O acesso será bloqueado e o histórico será preservado.`)) return;
    await remove.mutate(c.id).catch(() => {});
  }

  const filteredCompanies = useMemo(() => {
    if (!companies.data) return [];
    const term = search.toLowerCase();
    return companies.data.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.document && c.document.includes(term)) ||
      (c.id && c.id.includes(term))
    );
  }, [companies.data, search]);

  return (
    <div className="mx-auto w-full space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Empresas</h2>
          <p className="text-sm text-slate-500">Gerencie os clientes e licenças da plataforma.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-nubank">
          <Plus size={14} /> Nova empresa
        </button>
      </div>

      <PlatformStats />

      {(toggleActive.error || remove.error) && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {toggleActive.error || remove.error}
        </p>
      )}

      {companies.loading ? (
        <LoadingState label="Carregando empresas..." />
      ) : companies.error ? (
        <ErrorState message={companies.error} onRetry={companies.refetch} />
      ) : (companies.data ?? []).length === 0 ? (
        <EmptyState message="Nenhuma empresa cadastrada. Clique em Nova empresa." />
      ) : (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-slate-900/5 border border-slate-200">
          <div className="border-b border-slate-100 p-4 bg-slate-50">
            <div className="relative max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search size={14} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-[6px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500 bg-white"
              />
            </div>
          </div>
          <div className="overflow-x-auto p-0 min-h-[400px]">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider bg-white">
                  <th className="p-4 pl-5">Empresa</th>
                  <th className="p-4">CNPJ</th>
                  <th className="p-4">Usuários</th>
                  <th className="p-4">Funcionários</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">Financeiro</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredCompanies.map((c) => {
                  const status = c.status ?? (c.isActive ? 'ACTIVE' : 'SUSPENDED');
                  return (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 text-sm text-slate-700 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-5 font-medium text-slate-900">
                        <div className="flex flex-col">
                          <span>{normalizeDisplayName(c.name)}</span>
                          <span className="text-[10px] font-normal text-slate-400 mt-0.5">Criada em {formatDate(c.createdAt)}</span>
                        </div>
                      </td>
                      <td className="p-4">{c.document || '-'}</td>
                      <td className="p-4 text-slate-600">{c.usersCount} / {c.maxUsers}</td>
                      <td className="p-4 text-slate-600">{c.employeesCount} / {c.maxEmployees}</td>
                      <td className="p-4">
                        <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">{c.plan ?? 'FREE'}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.billingStatus === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : c.billingStatus === 'TRIAL' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                          {c.billingStatus ?? 'TRIAL'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                            {status === 'ACTIVE' ? 'Ativa' : status === 'CANCELLED' ? 'Cancelada' : 'Suspensa'}
                          </span>
                          {status !== 'ACTIVE' && c.suspensionReason && <p className="max-w-[150px] truncate text-[9px] text-slate-400">{c.suspensionReason}</p>}
                        </div>
                      </td>
                      <td className="p-4 pr-5 text-right">
                        <div className="flex justify-end">
                          <CompanyActionMenu 
                            company={c}
                            tenant={tenant}
                            isSuperAdmin={isSuperAdmin}
                            canManageUsers={canManageCompanyUsers(c)}
                            canManageLicenses={canManageLicenses(c)}
                            status={status}
                            onManageUsers={() => setUsersCompany(c)}
                            onManageLicense={() => setLicenseCompany(c)}
                            onToggleStatus={() => handleToggle(c)}
                            onDelete={() => handleDelete(c)}
                            loadingToggle={toggleActive.loading}
                            loadingDelete={remove.loading}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-slate-500 bg-white">
                      Nenhuma empresa encontrada com o termo "{search}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <NewCompanyModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); companies.refetch(); stats.refetch(); }} />
      )}
      {usersCompany && (
        <CompanyUsersModal company={usersCompany} onClose={() => setUsersCompany(null)} />
      )}
      {licenseCompany && (
        <CompanyManageModal
          company={licenseCompany}
          onClose={() => setLicenseCompany(null)}
          onSave={(data) => {
            const { plan: selectedPlanId, name, document: cnpj, ...rest } = data;
            updateLicense.mutate({ id: licenseCompany.id, name, document: cnpj, platformPlanId: selectedPlanId, ...rest }).catch(() => {});
          }}
          loading={updateLicense.loading}
          error={updateLicense.error}
        />
      )}
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/contracts/page.tsx`

```tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

export default function ContractsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ companyId: '', seatQuantity: 1, agreedAmount: '', startsAt: '', endsAt: '', paymentMethod: 'EXTERNAL', notes: '' });
  const load = async () => { const [contracts, companyItems] = await Promise.all([request<any[]>('/manual-contracts'), request<any[]>('/platform/companies')]); setItems(contracts); setCompanies(companyItems); };
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try { await request('/manual-contracts', { method: 'POST', body: { ...form, agreedAmount: Number(form.agreedAmount), startsAt: new Date(form.startsAt).toISOString(), endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined } }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao criar contrato.'); }
  }
  return <div className="space-y-5"><form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-2 xl:grid-cols-4"><select required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="h-11 rounded-xl border px-3"><option value="">Empresa</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input required type="number" min={1} value={form.seatQuantity} onChange={(e) => setForm({ ...form, seatQuantity: Number(e.target.value) })} className="h-11 rounded-xl border px-3" placeholder="Licenças" /><input required type="number" min="0.01" step="0.01" value={form.agreedAmount} onChange={(e) => setForm({ ...form, agreedAmount: e.target.value })} className="h-11 rounded-xl border px-3" placeholder="Valor acordado" /><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="h-11 rounded-xl border px-3"><option value="ASAAS">Asaas</option><option value="BANK_TRANSFER">Transferência</option><option value="EXTERNAL">Externo</option></select><input required type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="h-11 rounded-xl border px-3" /><input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="h-11 rounded-xl border px-3" /><input required value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-11 rounded-xl border px-3 xl:col-span-2" placeholder="Motivo e observações" /><button className="h-11 rounded-xl bg-violet-600 font-bold text-white">Criar contrato manual</button>{error && <p className="text-sm text-rose-600 md:col-span-2">{error}</p>}</form><div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[860px] w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Empresa</th><th className="p-4">Valor</th><th className="p-4">Licenças</th><th className="p-4">Início</th><th className="p-4">Fim</th><th className="p-4">Pagamento</th><th className="p-4">Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b"><td className="p-4 font-bold">{item.company?.name}</td><td className="p-4">{Number(item.agreedAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="p-4">{item.seatQuantity}</td><td className="p-4">{new Date(item.startsAt).toLocaleDateString('pt-BR')}</td><td className="p-4">{item.endsAt ? new Date(item.endsAt).toLocaleDateString('pt-BR') : 'Indeterminado'}</td><td className="p-4">{item.paymentMethod}</td><td className="p-4">{item.status}</td></tr>)}</tbody></table></div></div>;
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/coupons/page.tsx`

```tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

export default function CouponsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ code: '', description: '', trialDays: 30, maxRedemptions: '' });
  const load = () => request<any[]>('/coupons').then(setItems).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      await request('/coupons', { method: 'POST', body: { ...form, maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined } });
      setForm({ code: '', description: '', trialDays: 30, maxRedemptions: '' }); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao criar cupom.'); }
  }
  async function toggle(id: string, active: boolean) { await request(`/coupons/${id}/${active ? 'deactivate' : 'activate'}`, { method: 'PATCH' }); await load(); }
  return <div className="grid gap-5 xl:grid-cols-[360px,1fr]"><form onSubmit={submit} className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-black">Novo cupom de trial</h2><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Código" className="h-11 w-full rounded-xl border px-3" /><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" className="h-11 w-full rounded-xl border px-3" /><div className="grid grid-cols-2 gap-2"><input type="number" min={1} max={365} value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} className="h-11 rounded-xl border px-3" aria-label="Dias de trial" /><input type="number" min={1} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="Limite" className="h-11 rounded-xl border px-3" /></div><button className="h-11 w-full rounded-xl bg-violet-600 font-bold text-white">Criar cupom</button>{error && <p className="text-sm text-rose-600">{error}</p>}</form><div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[700px] w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Código</th><th className="p-4">Trial</th><th className="p-4">Resgates</th><th className="p-4">Status</th><th className="p-4">Ação</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b"><td className="p-4 font-black">{item.code}</td><td className="p-4">{item.trialDays} dias</td><td className="p-4">{item.redemptionCount}{item.maxRedemptions ? ` / ${item.maxRedemptions}` : ''}</td><td className="p-4">{item.isActive ? 'Ativo' : 'Inativo'}</td><td className="p-4"><button onClick={() => toggle(item.id, item.isActive)} className="rounded-lg border px-3 py-2 font-bold">{item.isActive ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody></table></div></div>;
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/finance/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import {
  ArrowDownToLine,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildPdfShell, escapeHtml, infoGrid, pdfTable, printPdf, section } from '@/app/lib/pdf-utils';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import api, {
  ApiError,
  PlatformBillingType,
  PlatformCompany,
  PlatformInvoice,
  PlatformInvoiceStatus,
} from '@/app/lib/api';

const STATUS: Record<PlatformInvoiceStatus, { label: string; className: string }> = {
  OPEN: { label: 'Em aberto', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  PAID: { label: 'Pago', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  OVERDUE: { label: 'Vencido', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  CANCELED: { label: 'Cancelado', className: 'border-slate-200 bg-slate-100 text-slate-600' },
};

const BILLING_LABEL: Record<PlatformBillingType, string> = {
  UNDEFINED: 'Cliente escolhe',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartao',
};

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

function date(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function monthLabel(value: string) {
  const [year, month] = value.split('-');
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(Number(year), Number(month) - 1, 1)).replace('.', '');
}

// InvoiceModal component removed because finance is now automated via Asaas

export default function FinancePage({ params: { tenant } }: { params: { tenant: string } }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<PlatformInvoiceStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [workingId, setWorkingId] = useState<string>();

  const summary = useQuery(() => api.platform.finance.summary({ from, to }), [from, to]);
  const invoices = useQuery(
    () => api.platform.finance.list({ page, limit: 20, status, search: deferredSearch, from, to }),
    [page, status, deferredSearch, from, to],
  );

  function refresh() {
    invoices.refetch();
    summary.refetch();
  }


  async function sync(invoice: PlatformInvoice) {
    setWorkingId(invoice.id);
    try {
      await api.platform.finance.sync(invoice.id);
      toast.success('Status sincronizado com o Asaas.');
      refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível sincronizar.');
    } finally {
      setWorkingId(undefined);
    }
  }

  async function exportPdf() {
    try {
      const result = await api.platform.finance.list({ limit: 500, status, search: deferredSearch, from, to });
      const rows = result.items.map(item => [
        item.company.name,
        item.company.document || '-',
        item.description || 'Mensalidade',
        money(item.amount),
        date(item.dueDate),
        STATUS[item.status]?.label ?? item.status,
        BILLING_LABEL[item.billingType] ?? item.billingType,
        item.asaasPaymentId ? 'Asaas' : 'Local',
      ].map(cell => `<td style="padding:3px 4px;font-size:7px;color:#334155;">${escapeHtml(cell)}</td>`).join(''));
      const filterLabel = [from ? `De ${date(from)}` : null, to ? `ate ${date(to)}` : null, status ? STATUS[status].label : null]
        .filter(Boolean)
        .join(' | ') || 'Todos os registros';
      const html = buildPdfShell(
        { title: 'Relatorio Financeiro da Plataforma', subtitle: filterLabel, landscape: true },
        { name: 'Innovation RH System', document: 'Plataforma SaaS' },
        `
          ${section('Resumo', infoGrid([
            { label: 'Faturado', value: money(summary.data?.totals.billed ?? 0) },
            { label: 'Recebido', value: money(summary.data?.totals.received ?? 0) },
            { label: 'A receber', value: money(summary.data?.totals.open ?? 0) },
            { label: 'Em atraso', value: money(summary.data?.totals.overdue ?? 0) },
          ], 4))}
          ${section('Faturas', rows.length
            ? pdfTable(['Empresa', 'Documento', 'Cobranca', 'Valor', 'Vencimento', 'Status', 'Forma', 'Integracao'], rows, { compact: true, border: true })
            : `<p style="font-size:10px;color:#64748b;">${escapeHtml('Nenhuma fatura encontrada para estes filtros.')}</p>`, { noBg: true })}
        `,
      );
      printPdf(html, `financeiro-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.error('Não foi possível exportar o PDF.');
    }
  }

  const totals = summary.data?.totals;
  const chartData = summary.data?.monthly.map(item => ({ ...item, label: monthLabel(item.month) })) ?? [];
  const chartMax = Math.max(1, ...chartData.flatMap(item => [item.billed, item.received]));

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Controle da operacao</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Gestao da Plataforma</h2>
          <div className="mt-4 flex max-w-full gap-4 overflow-x-auto border-b border-slate-200 whitespace-nowrap">
            <Link href={`/${tenant}/dashboard/platform`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Empresas</Link>
            <Link href={`/${tenant}/dashboard/platform/plans`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Planos & Assinaturas</Link>
            <Link href={`/${tenant}/dashboard/platform/finance`} className="border-b-2 border-teal-600 pb-2 text-sm font-black text-slate-950">Financeiro</Link>
            <Link href={`/${tenant}/dashboard/platform/permissions`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Permissoes Globais</Link>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPdf} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"><ArrowDownToLine size={14} /> Exportar</button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Faturado', value: totals?.billed, icon: WalletCards, tone: 'bg-slate-950 text-white' },
          { label: 'Recebido', value: totals?.received, icon: CheckCircle2, tone: 'bg-emerald-600 text-white' },
          { label: 'A receber', value: totals?.open, icon: Banknote, tone: 'bg-white text-slate-950' },
          { label: 'Em atraso', value: totals?.overdue, icon: CalendarDays, tone: 'bg-rose-50 text-rose-950' },
        ].map(card => (
          <article key={card.label} className={`relative overflow-hidden rounded-[14px] border border-slate-200 p-5 shadow-sm ${card.tone}`}>
            <card.icon size={18} className="mb-5 opacity-75" />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-65">{card.label}</p>
            <p className="mt-1 text-2xl font-black">{money(card.value ?? 0)}</p>
            <div className="absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-current opacity-[0.04]" />
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_2fr]">
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Conversao</p><h3 className="mt-1 text-lg font-black text-slate-950">Receita confirmada</h3></div>
            <TrendingUp size={20} className="text-teal-600" />
          </div>
          <div className="mt-8 flex items-end gap-3"><span className="text-5xl font-black text-slate-950">{summary.data?.conversionRate ?? 0}%</span><span className="pb-1 text-xs font-bold text-slate-400">do faturado</span></div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.min(summary.data?.conversionRate ?? 0, 100)}%` }} /></div>
          <p className="mt-4 text-xs text-slate-500">{summary.data?.count ?? 0} faturas no periodo selecionado.</p>
        </div>

        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ultimos meses</p><h3 className="mt-1 text-lg font-black text-slate-950">Faturado x recebido</h3></div><MoreHorizontal className="text-slate-300" /></div>
          <div className="h-52">
            {chartData.length ? (
              <div className="flex h-full items-end gap-2 border-b border-slate-200 pt-3">
                {chartData.map(item => (
                  <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${item.label}: ${money(item.billed)} faturado / ${money(item.received)} recebido`}>
                    <div className="flex flex-1 items-end justify-center gap-1">
                      <div className="w-[38%] rounded-t bg-slate-900 transition-all" style={{ height: `${Math.max(3, (item.billed / chartMax) * 100)}%` }} />
                      <div className="w-[38%] rounded-t bg-teal-500 transition-all" style={{ height: `${Math.max(3, (item.received / chartMax) * 100)}%` }} />
                    </div>
                    <span className="mt-2 truncate text-center text-[10px] font-bold text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            ) : <div className="flex h-full items-center justify-center text-xs text-slate-400">Sem dados para o grafico.</div>}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar empresa ou CNPJ..." className="h-10 w-full rounded-[8px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500" /></div>
          <select value={status} onChange={event => { setStatus(event.target.value as PlatformInvoiceStatus | ''); setPage(1); }} className="h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none"><option value="">Todos os status</option>{Object.entries(STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select>
          <input type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} className="h-10 rounded-[8px] border border-slate-200 px-3 text-xs text-slate-600 outline-none" />
          <input type="date" value={to} onChange={event => { setTo(event.target.value); setPage(1); }} className="h-10 rounded-[8px] border border-slate-200 px-3 text-xs text-slate-600 outline-none" />
          <button onClick={refresh} className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-slate-200 text-slate-500 hover:bg-slate-50"><RefreshCw size={14} /></button>
        </div>

        {invoices.error ? <div className="p-6"><ErrorState message={invoices.error} onRetry={invoices.refetch} /></div> : invoices.loading ? <div className="p-10"><LoadingState label="Carregando financeiro..." /></div> : !invoices.data?.items.length ? <div className="p-10"><EmptyState message="Nenhuma fatura encontrada para estes filtros." /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Empresa</th><th className="px-4 py-3">Cobranca</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Integracao</th><th className="px-5 py-3 text-right">Acoes</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.data.items.map(invoice => (
                  <tr key={invoice.id} className="group hover:bg-slate-50/70">
                    <td className="px-5 py-4"><p className="text-sm font-black text-slate-900">{invoice.company.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{invoice.company.document || 'Sem documento'}</p></td>
                    <td className="px-4 py-4"><p className="max-w-[230px] truncate text-xs font-bold text-slate-700">{invoice.description || 'Mensalidade'}</p><p className="mt-1 text-[10px] text-slate-400">{BILLING_LABEL[invoice.billingType]}</p></td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-600">{date(invoice.dueDate)}</td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">{money(invoice.amount)}</td>
                    <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${STATUS[invoice.status].className}`}>{STATUS[invoice.status].label}</span></td>
                    <td className="px-4 py-4">{invoice.asaasPaymentId ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Asaas</span> : <span className="text-[10px] font-bold text-slate-400">Local</span>}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1">
                      {invoice.invoiceUrl && <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" title="Abrir cobranca" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-teal-700 hover:shadow-sm"><ExternalLink size={14} /></a>}
                      {invoice.asaasPaymentId && <button disabled={workingId === invoice.id} onClick={() => sync(invoice)} title="Sincronizar" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-teal-700 hover:shadow-sm disabled:opacity-40"><RefreshCw size={14} /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoices.data && invoices.data.pagination.total > 0 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>{invoices.data.pagination.total} faturas</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="rounded border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Anterior</button><span className="font-bold text-slate-700">{page} / {invoices.data.pagination.pages}</span><button disabled={page >= invoices.data.pagination.pages} onClick={() => setPage(current => current + 1)} className="rounded border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Proxima</button></div></div>}
      </section>

    </div>
  );
}




```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/layout.tsx`

```tsx
'use client';

import type { ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { PlatformNav } from './_components/platform-nav';
import { getPlatformNavGroups, resolvePlatformActive } from './_components/platform-nav-config';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const tenant = String(params?.tenant || '');
  const role = String(user?.role || user?.profile || '').toUpperCase();
  const allowed = role === 'DEV' || role === 'COMERCIAL';

  if (!allowed) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">Acesso restrito à administração da plataforma.</div>;
  }

  const base = `/${tenant}/dashboard/platform`;
  const groups = getPlatformNavGroups(role);
  const { group: activeGroup, item: activeItem } = resolvePlatformActive(base, pathname, groups);
  const showBreadcrumb = !!activeGroup && !!activeItem && activeGroup.items.length > 1;

  return (
    <section className="min-w-0 space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Administração</p>
        <h1 className="text-2xl font-black text-slate-950">Plataforma Innovation RH</h1>
        {showBreadcrumb && (
          <p className="mt-1 text-xs font-medium text-slate-400">
            {activeGroup!.label} <span className="mx-1.5 text-slate-300">/</span> {activeItem!.label}
          </p>
        )}
      </div>
      <PlatformNav base={base} groups={groups} />
      {children}
    </section>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/page.tsx`

```tsx
'use client';

import { TrendingUp, Users, AlertCircle, CheckCircle2, DollarSign, Activity, FileText } from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { formatCurrency } from '@/app/lib/format';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';

export default function PlatformDashboardPage() {
  const statsQuery = useQuery(() => api.platform.stats(), []);
  const summaryQuery = useQuery(() => api.platform.finance.summary(), []);
  const invoicesQuery = useQuery(() => api.platform.finance.list({ limit: 5 }), []);

  if (statsQuery.loading || summaryQuery.loading) {
    return <LoadingState label="Carregando indicadores da plataforma..." />;
  }

  if (statsQuery.error || summaryQuery.error) {
    return (
      <ErrorState 
        message={statsQuery.error || summaryQuery.error || 'Não foi possível carregar os dados da plataforma.'} 
        onRetry={() => { statsQuery.refetch(); summaryQuery.refetch(); invoicesQuery.refetch(); }} 
      />
    );
  }

  const stats = statsQuery.data;
  const summary = summaryQuery.data;
  const invoices = invoicesQuery.data?.items || [];

  const badgeColors: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  const statusBadgeColor: Record<string, string> = {
    PAID: 'emerald',
    OPEN: 'amber',
    OVERDUE: 'rose',
    CANCELED: 'rose',
  };

  const statusText: Record<string, string> = {
    PAID: 'Concluído',
    OPEN: 'Pendente',
    OVERDUE: 'Atrasado',
    CANCELED: 'Cancelado',
  };

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Central de Operações</h2>
          <p className="text-sm text-slate-500">Visão consolidada da plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          title="Recebido no mês" 
          value={formatCurrency(summary?.totals?.received ?? 0)} 
          icon={<DollarSign size={20} className="text-emerald-600" />} 
          trend={`${summary?.conversionRate ?? 0}% taxa de conversão`} 
        />
        <Card 
          title="Faturamento Bruto" 
          value={formatCurrency(summary?.totals?.billed ?? 0)} 
          icon={<TrendingUp size={20} className="text-blue-600" />} 
          trend={`${summary?.count ?? 0} faturas`} 
        />
        <Card 
          title="Empresas Ativas" 
          value={stats?.activeCompanies ? String(stats.activeCompanies) : (stats?.companies ? String(stats.companies) : '0')} 
          icon={<Users size={20} className="text-indigo-600" />} 
          trend={`${stats?.users ?? 0} usuários cadastrados`} 
        />
        <Card 
          title="Atrasado / Em Aberto" 
          value={formatCurrency(summary?.totals?.overdue ?? 0)} 
          icon={<AlertCircle size={20} className="text-rose-600" />} 
          trend={`${formatCurrency(summary?.totals?.open ?? 0)} a vencer`} 
          trendDown 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Activity size={16} /> Faturamento Mensal (Últimos Meses)
            </h3>
          </div>
          {summary?.monthly && summary.monthly.length > 0 ? (
            <div className="h-56 w-full rounded-xl bg-slate-50 border border-slate-100 flex items-end justify-between p-4 px-6 gap-2">
              {summary.monthly.map((m, i) => {
                const maxVal = Math.max(...summary.monthly.map(item => item.billed), 1);
                const heightPercent = Math.min(100, Math.max(10, Math.round((m.billed / maxVal) * 100)));
                return (
                  <div key={i} className="w-full bg-blue-500/20 rounded-t-md relative group hover:bg-blue-500/40 transition-colors" style={{ height: `${heightPercent}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatCurrency(m.billed)}
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-medium uppercase">
                      {m.month}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Sem dados históricos disponíveis
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle2 size={16} /> Status dos Serviços (Core)
            </h3>
          </div>
          <div className="space-y-4 flex-1 mt-2">
            <StatusRow label="API Principal (NestJS)" status="Operacional" color="emerald" />
            <StatusRow label="Banco de Dados (PostgreSQL)" status="Operacional" color="emerald" />
            <StatusRow label="Integração Asaas" status="Operacional" color="emerald" />
            <StatusRow label="Antivírus ClamAV" status="Operacional" color="emerald" />
            <StatusRow label="Fila Redis & Notificações" status="Operacional" color="emerald" />
          </div>
        </section>
      </div>
      
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={16} /> Últimas Faturas Registradas
          </h3>
        </div>
        {invoices.length === 0 ? (
          <EmptyState message="Nenhuma fatura registrada recentemente." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider bg-white">
                  <th className="p-3 pl-0">Data Vencimento</th>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 pr-0 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const colorKey = statusBadgeColor[inv.status] || 'amber';
                  return (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-0 text-sm text-slate-700">
                      <td className="p-3 pl-0 text-slate-400 text-xs">{inv.dueDate}</td>
                      <td className="p-3 font-medium text-slate-900">{inv.company?.name || 'Empresa'}</td>
                      <td className="p-3 text-slate-600">{inv.description || 'Assinatura Plataforma'}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(Number(inv.amount))}</td>
                      <td className="p-3 pr-0 text-right">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeColors[colorKey]}`}>
                          {statusText[inv.status] || inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ title, value, icon, trend, trendDown = false }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`text-xs font-bold ${trendDown ? 'text-rose-600' : 'text-emerald-600'}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, status, color }: any) {
  const badgeColors: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${badgeColors[color]}`}>
        {status}
      </span>
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/permissions/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import Link from 'next/link';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { request } from '@/app/lib/api';
import { PERMISSIONS_LABELS, type Permission } from '@/app/lib/permissions';

const ROLES = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const ROLE_LABELS: Record<string, string> = {
  DEV: 'Desenvolvedor', COMERCIAL: 'Comercial', ADMIN: 'Administrador',
  RH: 'Recursos Humanos', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Apenas Consulta'
};

export default function GlobalPermissionsPage({ params: { tenant } }: { params: { tenant: string } }) {
  const [selectedRole, setSelectedRole] = useState('GESTOR');
  
  const permissionsData = useQuery(() => request<{ role: string; permissions: string[] }[]>('/platform/global-permissions'), []);
  
  const currentPermissions = permissionsData.data?.find(p => p.role === selectedRole)?.permissions || [];
  
  const [localPermissions, setLocalPermissions] = useState<string[] | null>(null);

  const save = useMutation((perms: string[]) => request(`/platform/global-permissions/${selectedRole}`, { method: 'PATCH', body: { permissions: perms } }), {
    onSuccess: () => { permissionsData.refetch(); setLocalPermissions(null); alert('Permissões salvas!'); }
  });

  const activePermissions = localPermissions ?? currentPermissions;

  function togglePermission(p: string) {
    if (activePermissions.includes(p)) {
      setLocalPermissions(activePermissions.filter(x => x !== p));
    } else {
      setLocalPermissions([...activePermissions, p]);
    }
  }

  return (
    <div className="mx-auto w-full space-y-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Permissões Globais</h2>
        <button 
          onClick={() => save.mutate(activePermissions)}
          disabled={save.loading || localPermissions === null}
          className="crystal-button inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black text-white shadow-md disabled:opacity-50"
        >
          <Save size={14} /> Salvar Alterações
        </button>
      </div>

      {permissionsData.error ? (
        <ErrorState message={permissionsData.error} onRetry={permissionsData.refetch} />
      ) : permissionsData.loading ? (
        <LoadingState label="Carregando configurações..." />
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Selecione o Perfil</h3>
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => { setSelectedRole(role); setLocalPermissions(null); }}
                className={`text-left px-4 py-3 rounded-[8px] text-sm font-medium transition-colors ${selectedRole === role ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          <div className="flex-1 ops-card rounded-[12px] border border-slate-200 bg-white p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Permissões para {ROLE_LABELS[selectedRole]}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(PERMISSIONS_LABELS) as Permission[]).map(p => (
                <label key={p} className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-colors ${activePermissions.includes(p) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={activePermissions.includes(p)}
                    onChange={() => togglePermission(p)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{PERMISSIONS_LABELS[p]}</div>
                    <div className="text-[11px] text-slate-500">{p}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/plans/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit3, Trash2, X, RotateCcw, Check, Users, Briefcase, Layers, Eye, EyeOff, Gift } from 'lucide-react';
import { ErrorState, LoadingState, EmptyState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { request } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';

const MODULES: { id: string; label: string }[] = [
  { id: 'employees', label: 'Funcionários' },
  { id: 'time-track', label: 'Controle de Ponto' },
  { id: 'vacations', label: 'Férias' },
  { id: 'management', label: 'Painel de Gestão' },
];

const CYCLE_LABEL: Record<string, string> = {
  MONTHLY: 'mês',
  QUARTERLY: 'trimestre',
  YEARLY: 'ano',
};

// Prisma Decimal vem como string — converte com segurança
function parseMoney(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const raw = String(val).trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(val: any): string {
  return parseMoney(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── MODAL ───────────────────────────────────────────────────────────────────

function PlanModal({ plan, onClose, onDone }: { plan?: any; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: plan ? String(parseMoney(plan.price)) : '0',
    cycle: plan?.cycle ?? 'MONTHLY',
    maxUsers: plan?.maxUsers ?? 9999,
    maxEmployees: plan?.maxEmployees ?? 9999,
    activeModules: (plan?.activeModules ?? MODULES.map(m => m.id)) as string[],
    isFree: plan?.isFree ?? false,
    isHidden: plan?.isHidden ?? false,
  });

  const save = useMutation(() => {
    const payload = {
      ...form,
      price: form.isFree ? 0 : parseMoney(form.price),
      maxUsers: Number(form.maxUsers),
      maxEmployees: Number(form.maxEmployees),
    };
    if (plan) {
      return request(`/platform/plans/${plan.id}`, { method: 'PATCH', body: payload });
    }
    return request('/platform/plans', { method: 'POST', body: payload });
  }, { onSuccess: onDone });

  function toggleModule(id: string) {
    setForm(f => ({
      ...f,
      activeModules: f.activeModules.includes(id)
        ? f.activeModules.filter(x => x !== id)
        : [...f.activeModules, id],
    }));
  }

  const parsedPrice = parseMoney(form.price);
  const priceInvalid = !form.isFree && parsedPrice <= 0;
  const isValid = form.name.trim().length > 0 && !priceInvalid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-[14px] border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-black text-slate-950">{plan ? 'Editar Plano' : 'Novo Plano'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {save.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{save.error}</p>}
          {priceInvalid && <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Plano pago precisa ter valor maior que zero. Corrija o preco antes de salvar.</p>}

          <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
            <span>Nome do Plano <span className="text-rose-500">*</span></span>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Pro, Básico, Enterprise..."
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
            <span>Descrição (opcional)</span>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descreva o que está incluído no plano..."
              rows={2}
              className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Preço (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="199,90"
                value={form.price}
                disabled={form.isFree}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Ciclo de Cobrança</span>
              <select
                value={form.cycle}
                onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 bg-white"
              >
                <option value="MONTHLY">Mensal</option>
                <option value="QUARTERLY">Trimestral</option>
                <option value="YEARLY">Anual</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Limite de Usuários (Sistemas)</span>
              <input
                type="number"
                min="1"
                value={form.maxUsers}
                onChange={e => setForm(f => ({ ...f, maxUsers: Number(e.target.value) || 1 }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Limite de Colaboradores</span>
              <input
                type="number"
                min="1"
                value={form.maxEmployees}
                onChange={e => setForm(f => ({ ...f, maxEmployees: Number(e.target.value) || 1 }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          {/* Opções */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 p-3 border border-slate-200 rounded-[8px] cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={e => setForm(f => ({ ...f, isFree: e.target.checked, price: e.target.checked ? '0' : f.price }))}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Gift size={13} className="text-emerald-600" />
              Plano Gratuito
            </label>
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 p-3 border border-slate-200 rounded-[8px] cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={form.isHidden}
                onChange={e => setForm(f => ({ ...f, isHidden: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <EyeOff size={13} className="text-slate-400" />
              Oculto (Interno)
            </label>
          </div>

          {/* Módulos */}
          <div>
            <span className="block text-xs font-bold text-slate-800 mb-2">Módulos incluídos</span>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map(m => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-[8px] border cursor-pointer transition-all ${
                    form.activeModules.includes(m.id)
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.activeModules.includes(m.id)}
                    onChange={() => toggleModule(m.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-white rounded-b-[14px]">
          <button type="button" onClick={onClose} className="btn-outline h-9 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button
            type="button"
            disabled={save.loading || !isValid}
            onClick={() => save.mutate()}
            className="crystal-button h-9 rounded-[8px] px-5 text-xs font-black text-white disabled:opacity-50"
          >
            {save.loading ? 'Salvando...' : 'Salvar Plano'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit, onDeactivate, onReactivate, onDelete }: {
  plan: any;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const price = parseMoney(plan.price);
  const cycleLabel = CYCLE_LABEL[plan.cycle as string] ?? 'ciclo';
  const moduleNames = (plan.activeModules as string[]).map(id => MODULES.find(m => m.id === id)?.label ?? id);
  const isActive = plan.isActive !== false;
  const paidPlanWithoutPrice = !plan.isFree && price <= 0;

  return (
    <div className={`ops-card relative flex flex-col rounded-[14px] border bg-white transition-all ${
      isActive ? 'border-slate-200 shadow-sm hover:shadow-md' : 'border-slate-100 opacity-60'
    }`}>
      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        {!isActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            Inativo
          </span>
        )}
        {plan.isHidden && isActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-600">
            <EyeOff size={9} /> Oculto
          </span>
        )}
        {plan.isFree && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <Gift size={9} /> FREE
          </span>
        )}
      </div>

      {/* Header */}
      <div className="p-5 pb-0">
        <h3 className="text-base font-black text-slate-900 pr-16">{plan.name}</h3>
        {plan.description && <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{plan.description}</p>}

        {/* Price */}
        <div className="mt-3 flex items-end gap-1">
          <span className="text-[11px] font-semibold text-slate-500">R$</span>
          <span className={`text-3xl font-black leading-none ${paidPlanWithoutPrice ? 'text-rose-600' : 'text-indigo-600'}`}>
            {plan.isFree ? '0,00' : formatBRL(plan.price)}
          </span>
          <span className="text-xs font-medium text-slate-400 mb-0.5">/{cycleLabel}</span>
        </div>
        {paidPlanWithoutPrice && (
          <p className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
            Este plano esta pago, mas foi salvo com valor zero no banco. Clique em Editar e informe o preco correto.
          </p>
        )}
      </div>

      {/* Details */}
      <div className="mx-5 mt-4 space-y-2 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium"><Users size={11} /> Usuários (Sistemas)</span>
          <span className="font-bold text-slate-800">{plan.maxUsers >= 9999 ? 'Ilimitado' : plan.maxUsers}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium"><Briefcase size={11} /> Colaboradores</span>
          <span className="font-bold text-slate-800">{plan.maxEmployees >= 9999 ? 'Ilimitado' : plan.maxEmployees}</span>
        </div>
        <div className="flex items-start justify-between text-xs gap-2">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium whitespace-nowrap"><Layers size={11} /> Módulos</span>
          <span className="font-semibold text-slate-700 text-right text-[10px] leading-relaxed">{moduleNames.join(', ') || '—'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto p-4 pt-3 flex gap-2">
        {isActive ? (
          <>
            <button
              onClick={onEdit}
              className="flex-1 btn-outline h-9 inline-flex justify-center items-center gap-1.5 text-xs font-bold text-slate-700 rounded-[8px]"
            >
              <Edit3 size={13} /> Editar
            </button>
            <button
              onClick={onDeactivate}
              title="Desativar plano"
              className="h-9 w-9 flex justify-center items-center rounded-[8px] border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onReactivate}
              className="flex-1 btn-outline h-9 inline-flex justify-center items-center gap-1.5 text-xs font-bold text-emerald-700 rounded-[8px] border-emerald-200 hover:bg-emerald-50"
            >
              <RotateCcw size={13} /> Reativar
            </button>
            <button
              onClick={onDelete}
              title="Excluir permanentemente"
              className="h-9 w-9 flex justify-center items-center rounded-[8px] border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function PlansPage({ params: { tenant } }: { params: { tenant: string } }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.profile?.toUpperCase() === 'DEV';

  const plansData = useQuery(() => request<any[]>('/platform/plans'), []);
  const [editing, setEditing] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const deactivate = useMutation(
    (id: string) => request(`/platform/plans/${id}`, { method: 'DELETE' }),
    { onSuccess: () => plansData.refetch() },
  );

  const reactivate = useMutation(
    (id: string) => request(`/platform/plans/${id}`, { method: 'PATCH', body: { isActive: true } }),
    { onSuccess: () => plansData.refetch() },
  );

  const deletePermanently = useMutation(
    (id: string) => request(`/platform/plans/${id}/permanent`, { method: 'DELETE' }),
    { onSuccess: () => plansData.refetch() },
  );

  const allPlans = plansData.data ?? [];
  const activePlans = allPlans.filter(p => p.isActive !== false);
  const inactivePlans = allPlans.filter(p => p.isActive === false);
  const visiblePlans = showInactive ? allPlans : activePlans;

  function handleDeactivate(plan: any) {
    if (!window.confirm(`Desativar o plano "${plan.name}"?\nEmpresas vinculadas não serão afetadas.`)) return;
    deactivate.mutate(plan.id);
  }

  function handleReactivate(plan: any) {
    reactivate.mutate(plan.id);
  }

  function handleDeletePermanent(plan: any) {
    if (!window.confirm(`EXCLUIR PERMANENTEMENTE o plano "${plan.name}"?\nEsta ação não pode ser desfeita.`)) return;
    deletePermanently.mutate(plan.id);
  }

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-slate-900">Gestão de Planos</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="crystal-button inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black text-white shadow-md"
        >
          <Plus size={14} /> Novo Plano
        </button>
      </div>

      {/* Stats bar */}
      {!plansData.loading && allPlans.length > 0 && (
        <div className="flex items-center gap-6 rounded-[10px] border border-slate-100 bg-white px-5 py-3">
          <div className="text-xs text-slate-500">
            <span className="font-black text-slate-950">{activePlans.length}</span> planos ativos
          </div>
          {inactivePlans.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-200" />
              <div className="text-xs text-slate-500">
                <span className="font-black text-slate-400">{inactivePlans.length}</span> inativos
              </div>
              <button
                onClick={() => setShowInactive(v => !v)}
                className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                {showInactive ? <EyeOff size={12} /> : <Eye size={12} />}
                {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Errors */}
      {(deactivate.error || reactivate.error || deletePermanently.error) && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {deactivate.error || reactivate.error || deletePermanently.error}
        </p>
      )}

      {/* Content */}
      {plansData.error ? (
        <ErrorState message={plansData.error} onRetry={plansData.refetch} />
      ) : plansData.loading ? (
        <LoadingState label="Carregando planos..." />
      ) : visiblePlans.length === 0 ? (
        <EmptyState message={allPlans.length === 0 ? 'Nenhum plano cadastrado. Clique em + Novo Plano para criar.' : 'Nenhum plano ativo no momento.'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visiblePlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => setEditing(plan)}
              onDeactivate={() => handleDeactivate(plan)}
              onReactivate={() => handleReactivate(plan)}
              onDelete={() => handleDeletePermanent(plan)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {(isCreating || editing) && (
        <PlanModal
          plan={editing}
          onClose={() => { setIsCreating(false); setEditing(null); }}
          onDone={() => { setIsCreating(false); setEditing(null); plansData.refetch(); }}
        />
      )}
    </div>
  );
}



```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/proposals/[id]/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function ProposalDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<any>(null);

  useEffect(() => {
    loadProposal();
  }, [id]);

  const loadProposal = async () => {
    try {
      const data = await api.proposals.getStatus(id);
      setProposal(data);
    } catch (err) {
      toast.error('Erro ao carregar proposta');
      router.push(`/${tenant}/dashboard/platform/proposals`);
    }
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      await api.proposals.send(id);
      toast.success('Proposta enviada ao cliente com sucesso!');
      loadProposal();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar proposta');
    } finally {
      setLoading(false);
    }
  };

  if (!proposal) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-6 w-full mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-muted rounded-md" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals`)}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Proposta {proposal.proposalNumber}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${proposal.status === 'SENT' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{proposal.status}</span>
        </div>
        
        {proposal.status === 'DRAFT' && (
          <button className="flex items-center crystal-button px-5 py-2.5 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={handleSend} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Enviando...' : 'Enviar para Cliente'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white shadow-sm shadow-slate-900/5">
          <div className="p-6 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Detalhes da Oferta</h3>
          </div>
          <div className="p-6 pt-0 space-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-medium text-slate-900">{proposal.company?.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Título:</span>
              <span className="font-medium text-slate-900">{proposal.title}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Plano / Valor:</span>
              <span className="font-medium text-slate-900">{proposal.planType} - R$ {proposal.monthlyPrice?.toFixed(2)}/mês</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Limites:</span>
              <span className="font-medium text-slate-900">{proposal.usersLimit} usuários / {proposal.employeesLimit} func.</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm shadow-slate-900/5">
          <div className="p-6 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Status da Assinatura</h3>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className={`w-5 h-5 ${proposal.termsAccepted ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="text-sm font-medium text-slate-700">Termos Aceitos?</span>
              </div>
              <span className="font-bold text-slate-900">{proposal.termsAccepted ? 'Sim' : 'Não'}</span>
            </div>
            {proposal.termsAccepted && (
              <div className="text-sm space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-slate-600"><strong className="text-slate-900">Assinado por:</strong> {proposal.signedByName} ({proposal.signedByEmail})</p>
                <p className="text-slate-600"><strong className="text-slate-900">Data:</strong> {new Date(proposal.signedAt).toLocaleString()}</p>
              </div>
            )}

            {proposal.asaasPaymentLink && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <a href={proposal.asaasPaymentLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Link de Pagamento (Asaas)
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/proposals/new/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProposalPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    companyId: '',
    title: 'Proposta Comercial - Innovation RH',
    description: 'Serviços de RH e Ponto Eletrônico',
    startDate: new Date().toISOString().split('T')[0],
    planType: 'PRO',
    monthlyPrice: 199.90,
    usersLimit: 10,
    employeesLimit: 50,
    features: ['time-track', 'vacations', 'management', 'whatsapp'],
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await api.platform.listCompanies();
      setCompanies(data.filter((c: any) => c.status !== 'CANCELLED'));
    } catch (err) {
      toast.error('Erro ao carregar empresas');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId) return toast.error('Selecione uma empresa');
    
    try {
      setLoading(true);
      await api.proposals.create({
        ...formData,
        monthlyPrice: Number(formData.monthlyPrice),
        usersLimit: Number(formData.usersLimit),
        employeesLimit: Number(formData.employeesLimit),
      });
      toast.success('Proposta criada com sucesso!');
      router.push(`/${tenant}/dashboard/platform/proposals`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar proposta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button className="p-2 hover:bg-muted rounded-md" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals`)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Criar Nova Proposta</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm shadow-slate-900/5">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Empresa Cliente</label>
              <select 
                className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                value={formData.companyId}
                onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.document})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Título da Proposta</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Data de Início</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Descrição Opcional</label>
              <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Plano / SKU</label>
                <select 
                  className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  value={formData.planType}
                  onChange={e => setFormData({ ...formData, planType: e.target.value })}
                >
                  <option value="STARTUP">Startup</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Valor Mensal (R$)</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" type="number" step="0.01" required value={formData.monthlyPrice} onChange={e => setFormData({...formData, monthlyPrice: parseFloat(e.target.value)})} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Limite de Usuários Admin</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" type="number" required value={formData.usersLimit} onChange={e => setFormData({...formData, usersLimit: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Limite de Colaboradores</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" type="number" required value={formData.employeesLimit} onChange={e => setFormData({...formData, employeesLimit: parseInt(e.target.value)})} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t border-slate-100">
            <button className="crystal-button px-5 py-2.5 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Criar Proposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/proposals/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { Eye, Plus } from 'lucide-react';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      const data = await api.proposals.list();
      setProposals(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Propostas Comerciais</h1>
        <button className="flex items-center crystal-button px-4 py-2 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-md transition-colors" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Proposta
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-slate-900/5">
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Nº Proposta</th>
                <th className="px-6 py-4 text-left font-semibold">Empresa</th>
                <th className="px-6 py-4 text-left font-semibold">Plano</th>
                <th className="px-6 py-4 text-left font-semibold">Valor (R$)</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proposals.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.proposalNumber}</td>
                  <td className="px-6 py-4 text-slate-600">{p.company?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-600">{p.planType}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">R$ {p.monthlyPrice?.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      p.status === 'ACTIVE' || p.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      p.status === 'SENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      p.status === 'PAYMENT_PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals/${p.id}`)}>
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {proposals.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    Nenhuma proposta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/subscriptions/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

export default function SubscriptionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { request<any[]>('/platform/companies').then(setItems).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-[760px] w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Empresa</th><th className="p-4">Plano</th><th className="p-4">Status</th><th className="p-4">Licenças</th><th className="p-4">Próximo vencimento</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-4 font-bold">{item.name}</td><td className="p-4">{item.platformPlan?.name || 'Sem plano'}</td><td className="p-4">{item.subscription?.status || item.billingStatus}</td><td className="p-4">{item.subscription?.seatQuantity ?? 0}</td><td className="p-4">{item.subscription?.nextDueDate ? new Date(item.subscription.nextDueDate).toLocaleDateString('pt-BR') : '—'}</td></tr>)}</tbody></table></div>;
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/support/page.tsx`

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';
import { 
  Headset, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Filter,
  Building2,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlatformTicket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
  employee?: { name: string };
  company?: { name: string; id: string };
}

export default function PlatformSupportPage() {
  const { user, isDev } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<PlatformTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    if (user && !isDev) {
      router.push('/dashboard');
      return;
    }
    loadTickets();
  }, [user, isDev, statusFilter, router]);

  const loadTickets = async () => {
    if (!isDev) return;
    
    setLoading(true);
    try {
      const data = await api.platformSupport.list({ status: statusFilter });
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load platform tickets', error);
      // Fake data for DEV visualization if API fails
      setTickets([
        {
          id: 'TKT-1234',
          subject: 'Problema na emissão de NFSe',
          status: 'OPEN',
          priority: 'HIGH',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          employee: { name: 'João Silva' },
          company: { id: 'c1', name: 'Acme Corp' }
        },
        {
          id: 'TKT-1235',
          subject: 'Configuração de relógio de ponto',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          createdAt: new Date(Date.now() - 186400000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          employee: { name: 'Maria Souza' },
          company: { id: 'c2', name: 'Stark Industries' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 uppercase tracking-wider"><AlertCircle size={12}/> Aberto</span>;
      case 'IN_PROGRESS':
        return <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider"><Clock size={12}/> Em Atendimento</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider"><CheckCircle2 size={12}/> Resolvido</span>;
      default:
        return <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">{status}</span>;
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    (t.company?.name && t.company.name.toLowerCase().includes(search.toLowerCase()))
  );

  const activeCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  if (!isDev) return null;

  return (
    <div className="flex h-full flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <Headset size={24} />
            </div>
            Painel DEV de Suporte
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Gerencie tickets de suporte de todas as empresas da plataforma.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 border border-slate-200 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-700">{activeCount} Ativos</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 border border-slate-200 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-slate-700">{resolvedCount} Resolvidos</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between rounded-2xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-xl">
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por ID, assunto ou empresa..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Filter size={16} />
            <span>Status:</span>
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
          >
            <option value="">Todos os chamados</option>
            <option value="OPEN">Abertos</option>
            <option value="IN_PROGRESS">Em Atendimento</option>
            <option value="RESOLVED">Resolvidos</option>
          </select>
        </div>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-purple-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <Headset size={48} className="text-slate-200" />
            <p className="text-sm font-medium">Nenhum chamado pendente.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 transition-colors hover:bg-slate-50 cursor-pointer">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{ticket.id}</span>
                    {getStatusBadge(ticket.status)}
                    {ticket.priority === 'HIGH' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                        <AlertCircle size={12} /> Urgente
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                    {ticket.subject}
                  </h3>
                  
                  <div className="flex items-center gap-4 mt-1">
                    {ticket.company && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Building2 size={14} className="text-slate-400" />
                        <span className="text-slate-700 font-semibold">{ticket.company.name}</span>
                      </div>
                    )}
                    {ticket.employee && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Users size={14} className="text-slate-400" />
                        {ticket.employee.name}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3">
                  <span className="text-xs font-medium text-slate-400">
                    Criado em {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

```

---

### 📄 `apps/web/app/[tenant]/dashboard/platform/whatsapp/page.tsx`

```tsx
export { default } from '../../whatsapp/page';

```

---

## ⚙️ CÓDIGO-FONTE: BACKEND

### 📄 `apps/api/src/modules/platform/dto/create-platform-company-user.dto.ts`

```typescript
﻿import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlatformCompanyUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO'])
  role?: 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO';
}

```

---

### 📄 `apps/api/src/modules/platform/dto/create-platform-company.dto.ts`

```typescript
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePlatformCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxEmployees?: number;

  @IsOptional()
  @IsString()
  planId?: string;

  // Admin inicial da empresa — criado na mesma transacao
  @IsString()
  @IsNotEmpty()
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;
}

```

---

### 📄 `apps/api/src/modules/platform/dto/update-platform-company-user.dto.ts`

```typescript
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePlatformCompanyUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO'])
  role?: 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  customPermissions?: any;
}

```

---

### 📄 `apps/api/src/modules/platform/dto/update-platform-company.dto.ts`

```typescript
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlatformCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'CANCELLED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

  @IsOptional()
  @IsIn(['inadimplencia', 'solicitacao_voluntaria', 'não informado'])
  suspensionReason?: string | null;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  platformPlanId?: string | null;

  @IsOptional()
  @IsIn(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED'])
  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

  @IsOptional()
  @IsString()
  trialEndsAt?: string;

  @IsOptional()
  activeModules?: string[];

  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxEmployees?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  asaasCustomerId?: string | null;

  @IsOptional()
  @IsString()
  asaasSubscriptionId?: string | null;
}

```

---

### 📄 `apps/api/src/modules/platform/global-permissions.controller.ts`

```typescript
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { GlobalPermissionsService } from './global-permissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV')
@Controller('platform/global-permissions')
export class GlobalPermissionsController {
  constructor(private readonly service: GlobalPermissionsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Patch(':role')
  update(@Param('role') role: UserRole, @Body() body: { permissions: string[] }) {
    return this.service.update(role, body.permissions);
  }
}

```

---

### 📄 `apps/api/src/modules/platform/global-permissions.service.ts`

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  DEV: ['admin', 'config_company', 'config_payroll', 'config_time', 'time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  ADMIN: ['admin', 'config_company', 'config_payroll', 'config_time', 'time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  COMERCIAL: [],
  RH: ['time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  GESTOR: ['time_approve', 'time_view', 'time_clock', 'manage_employees', 'settings_basic'],
  FUNCIONARIO: ['time_view', 'time_clock', 'settings_basic'],
  CONSULTA: ['time_view'],
};

@Injectable()
export class GlobalPermissionsService implements OnModuleInit {
  private readonly logger = new Logger(GlobalPermissionsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    try {
      const existingCount = await this.prisma.globalRolePermission.count();
      if (existingCount === 0) {
        this.logger.log('Seeding permissões globais padrão...');
        for (const [role, permissions] of Object.entries(DEFAULT_PERMISSIONS)) {
          await this.prisma.globalRolePermission.create({
            data: { role: role as UserRole, permissions },
          });
        }
      }
    } catch (e) {
      this.logger.error('Erro ao semear permissões globais:', e);
    }
  }

  async list() {
    return this.prisma.globalRolePermission.findMany();
  }

  async update(role: UserRole, permissions: string[]) {
    return this.prisma.globalRolePermission.upsert({
      where: { role },
      create: { role, permissions },
      update: { permissions },
    });
  }

  async getForRole(role: UserRole) {
    return this.prisma.globalRolePermission.findUnique({ where: { role } });
  }
}

```

---

### 📄 `apps/api/src/modules/platform/plans.controller.ts`

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformPlansService } from './plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'COMERCIAL')
@Controller('platform/plans')
export class PlatformPlansController {
  constructor(private readonly service: PlatformPlansService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  /** Soft-delete: desativa o plano (não remove do banco) */
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  /** Hard-delete: remove permanentemente (só funciona se o plano já estiver inativo) */
  @Delete(':id/permanent')
  deletePermanent(@Param('id') id: string) {
    return this.service.deletePermanent(id);
  }
}

```

---

### 📄 `apps/api/src/modules/platform/plans.service.ts`

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlatformPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const plans = await this.prisma.platformPlan.findMany({
      orderBy: { price: 'asc' },
    });
    return plans.map(plan => this.serializePlan(plan));
  }

  async get(id: string) {
    const plan = await this.prisma.platformPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plano nao encontrado');
    return this.serializePlan(plan);
  }

  async create(data: any) {
    const plan = await this.prisma.platformPlan.create({ data: this.normalizePlanPayload(data, true) });
    return this.serializePlan(plan);
  }

  async update(id: string, data: any) {
    const payload = this.normalizePlanPayload(data, false);
    const plan = await this.prisma.platformPlan.update({
      where: { id },
      data: payload,
    });
    if (payload.price !== undefined && !plan.isFree && Number(plan.price) > 0) {
      await this.prisma.platformInvoice.updateMany({
        where: { planId: id, deletedAt: null, status: { in: ['OPEN', 'OVERDUE'] }, amount: { lte: 0 } },
        data: { amount: Number(plan.price) },
      });
    }
    return this.serializePlan(plan);
  }


  private serializePlan(plan: any) {
    return {
      ...plan,
      price: this.moneyToNumber(plan.price),
      discountPercent: this.moneyToNumber(plan.discountPercent),
      baseMonthlyPrice: this.moneyToNumber(plan.baseMonthlyPrice),
      userMonthlyPrice: this.moneyToNumber(plan.userMonthlyPrice),
    };
  }
  private normalizePlanPayload(data: any, creating: boolean) {
    const payload = { ...data };
    if (payload.price !== undefined || payload.isFree === true || creating) {
      const price = payload.isFree ? 0 : this.moneyToNumber(payload.price);
      if (!payload.isFree && (!Number.isFinite(price) || price <= 0)) {
        throw new BadRequestException('Plano pago precisa ter valor maior que zero.');
      }
      payload.price = price;
    }
    if (payload.discountPercent !== undefined) payload.discountPercent = this.moneyToNumber(payload.discountPercent);
    if (payload.baseMonthlyPrice !== undefined) payload.baseMonthlyPrice = this.moneyToNumber(payload.baseMonthlyPrice);
    if (payload.userMonthlyPrice !== undefined) payload.userMonthlyPrice = this.moneyToNumber(payload.userMonthlyPrice);
    if (payload.commitmentMonths !== undefined) payload.commitmentMonths = Number(payload.commitmentMonths) || 1;
    
    if (payload.maxUsers !== undefined) payload.maxUsers = Math.max(1, Number(payload.maxUsers) || 1);
    if (payload.maxEmployees !== undefined) payload.maxEmployees = Math.max(1, Number(payload.maxEmployees) || 1);
    return payload;
  }

  private moneyToNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
    const raw = String(value).trim();
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
    const amount = Number(normalized);
    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
  }
  /** Soft-delete: desativa o plano sem remover do banco */
  async deactivate(id: string) {
    return this.prisma.platformPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Hard-delete: remove permanentemente somente se ja estiver inativo. */
  async deletePermanent(id: string) {
    const plan = await this.prisma.platformPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plano nao encontrado');
    if (plan.isActive) {
      throw new BadRequestException('Desative o plano antes de excluir permanentemente.');
    }
    return this.prisma.platformPlan.delete({ where: { id } });
  }

  /** @deprecated use deactivate() */
  async delete(id: string) {
    return this.deactivate(id);
  }
}

```

---

### 📄 `apps/api/src/modules/platform/platform.controller.ts`

```typescript
import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { CreatePlatformCompanyUserDto } from './dto/create-platform-company-user.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';
import { UpdatePlatformCompanyUserDto } from './dto/update-platform-company-user.dto';
import { PlatformService } from './platform.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'COMERCIAL')
@Controller('platform')
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get('companies')
  listCompanies() {
    return this.service.listCompanies();
  }

  @Get('online-users')
  getOnlineUsers() {
    return this.service.getOnlineUsers();
  }

  @Post('ghost-mode/:companyId')
  ghostMode(
    @Param('companyId') companyId: string,
    @CurrentUser() actor: JwtUser,
    @Req() req: any,
  ) {
    return this.service.ghostMode(companyId, actor, req);
  }

  @Get('company-users/:companyId')
  listCompanyUsers(@CurrentUser() actor: JwtUser, @Param('companyId') companyId: string) {
    return this.service.listCompanyUsers(actor, companyId);
  }

  @Post('company-users/:companyId')
  createCompanyUser(
    @CurrentUser() actor: JwtUser,
    @Param('companyId') companyId: string,
    @Body() dto: CreatePlatformCompanyUserDto,
  ) {
    return this.service.createCompanyUser(actor, companyId, dto);
  }

  @Patch('company-users/:companyId/:userId')
  updateCompanyUser(
    @CurrentUser() actor: JwtUser,
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePlatformCompanyUserDto,
  ) {
    return this.service.updateCompanyUser(actor, companyId, userId, dto);
  }

  @Delete('company-users/:companyId/:userId')
  deleteCompanyUser(
    @CurrentUser() actor: JwtUser,
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.deleteCompanyUser(actor, companyId, userId);
  }

  @Get('companies/:id/audit-logs')
  companyAuditLogs(@Param('id') id: string) {
    return this.service.companyAuditLogs(id);
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.service.getCompany(id);
  }

  @Post('companies')
  createCompany(@CurrentUser() actor: JwtUser, @Body() dto: CreatePlatformCompanyDto) {
    return this.service.createCompany(actor, dto);
  }

  @Patch('companies/:id')
  updateCompany(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdatePlatformCompanyDto) {
    this.assertDevOrCommercial(actor);
    return this.service.updateCompany(actor, id, dto);
  }

  @Delete('companies/:id')
  deleteCompany(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    this.assertDev(actor);
    return this.service.deleteCompany(id);
  }

  private assertDev(actor: JwtUser) {
    if (actor.role !== 'DEV') {
      throw new ForbiddenException('Apenas Super Admin pode suspender, ativar ou excluir empresas.');
    }
  }

  private assertDevOrCommercial(actor: JwtUser) {
    if (actor.role !== 'DEV' && actor.role !== 'COMERCIAL') {
      throw new ForbiddenException('Acesso negado.');
    }
  }

  @Get('receita/:cnpj')
  async lookupCnpj(@Param('cnpj') cnpj: string) {
    return this.service.lookupCnpj(cnpj);
  }
}

```

---

### 📄 `apps/api/src/modules/platform/platform.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinanceModule } from '../finance/finance.module';
import { PlatformController } from './platform.controller';
import { PlatformRepository } from './platform.repository';
import { PlatformService } from './platform.service';
import { GlobalPermissionsController } from './global-permissions.controller';
import { GlobalPermissionsService } from './global-permissions.service';
import { PlatformPlansController } from './plans.controller';
import { PlatformPlansService } from './plans.service';

@Module({
  imports: [AuthModule, NotificationsModule, FinanceModule],
  controllers: [PlatformController, GlobalPermissionsController, PlatformPlansController],
  providers: [PlatformService, PlatformRepository, GlobalPermissionsService, PlatformPlansService],
  exports: [PlatformService, GlobalPermissionsService],
})
export class PlatformModule {}

```

---

### 📄 `apps/api/src/modules/platform/platform.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const safeUserSelect = {
  id: true,
  companyId: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class PlatformRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanies() {
    const companies = await this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true,
        platformPlan: { select: { id: true, name: true, code: true } },
        _count: { select: { users: true, employees: true } },
      },
    });
    return companies.map((c: (typeof companies)[number]) => ({
      id: c.id,
      name: c.name,
      document: c.document,
      logoUrl: c.logoUrl,
      commercialOwnerId: c.commercialOwnerId,
      maxUsers: c.maxUsers,
      maxEmployees: c.maxEmployees,
      isActive: c.isActive,
      status: c.status,
      suspensionReason: c.suspensionReason,
      subscriptionStartedAt: c.subscriptionStartedAt,
      plan: c.plan,
      billingStatus: c.billingStatus,
      trialEndsAt: c.trialEndsAt,
      activeModules: c.activeModules,
      asaasCustomerId: c.asaasCustomerId,
      asaasSubscriptionId: c.asaasSubscriptionId,
      internalNotes: c.internalNotes,
      subscription: c.subscription,
      platformPlan: c.platformPlan,
      createdAt: c.createdAt,
      usersCount: c._count.users,
      employeesCount: c._count.employees,
    }));
  }

  listCompanyAuditLogs(companyId: string) {
    return this.prisma.auditLog.findMany({
      where: { companyId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  getCompany(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: { subscription: true, _count: { select: { users: true, employees: true } } },
    });
  }

  getPlan(id: string) {
    return this.prisma.platformPlan.findFirst({ where: { id, isActive: true } });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  countUsers(companyId: string) {
    return this.prisma.user.count({ where: { companyId, isActive: true, role: { in: ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] } } });
  }

  listCompanyUsers(companyId: string) {
    return this.prisma.user.findMany({ where: { companyId }, select: safeUserSelect, orderBy: { createdAt: 'desc' } });
  }

  findCompanyUser(companyId: string, userId: string) {
    return this.prisma.user.findFirst({ where: { id: userId, companyId }, select: safeUserSelect });
  }

  createCompanyUser(data: any) {
    // Garante que senha recém-criada não dispare a regra de troca obrigatória de 30 dias
    return this.prisma.user.create({
      data: { ...data, passwordChangedAt: new Date(), forcePasswordChange: false },
      select: safeUserSelect,
    });
  }

  updateCompanyUser(companyId: string, userId: string, data: any) {
    return this.prisma.user.updateMany({ where: { id: userId, companyId }, data });
  }

  deleteCompanyUser(companyId: string, userId: string) {
    return this.prisma.user.deleteMany({ where: { id: userId, companyId } });
  }

  createCompanyWithAdmin(params: {
    name: string;
    document?: string | null;
    maxUsers: number;
    maxEmployees: number;
    adminName: string;
    adminEmail: string;
    adminPasswordHash: string;
    commercialOwnerId?: string | null;
    plan?: 'FREE' | 'BASE' | 'PRO' | 'ENTERPRISE';
    billingStatus?: 'TRIAL' | 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
    trialEndsAt?: Date;
    platformPlanId?: string;
  }) {
    return this.prisma.$transaction(async (tx: any) => {
      const company = await tx.company.create({
        data: {
          name: params.name,
          document: params.document ?? null,
          maxUsers: params.maxUsers,
          maxEmployees: params.maxEmployees,
          commercialOwnerId: params.commercialOwnerId ?? null,
          status: params.billingStatus === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
          isActive: params.billingStatus === 'ACTIVE',
          suspensionReason: params.billingStatus === 'ACTIVE' ? null : 'aguardando_pagamento',
          plan: params.plan ?? 'FREE',
          billingStatus: params.billingStatus ?? 'TRIAL',
          trialEndsAt: params.trialEndsAt,
          platformPlanId: params.platformPlanId ?? null,
        },
      });
      if (params.platformPlanId) {
        await tx.companySubscription.create({
          data: {
            companyId: company.id,
            planId: params.platformPlanId,
            status: params.billingStatus ?? 'PENDING_PAYMENT',
            seatQuantity: params.maxUsers,
          },
        });
      }
      const admin = await tx.user.create({
        data: {
          companyId: company.id,
          name: params.adminName,
          email: params.adminEmail,
          passwordHash: params.adminPasswordHash,
          role: 'ADMIN',
          passwordChangedAt: new Date(),
          forcePasswordChange: false,
        },
        select: { id: true, email: true, role: true },
      });
      return { company, adminId: admin.id };
    });
  }

  updateCompany(id: string, data: any) {
    return this.prisma.company.update({ where: { id }, data });
  }

  deleteCompany(id: string) {
    return this.prisma.company.update({
      where: { id },
      data: { status: 'CANCELLED', isActive: false, billingStatus: 'CANCELED', suspensionReason: 'arquivada_pelo_dev' },
    });
  }

  async globalStats() {
    const [companies, users, employees, messages, activeCompanies, suspendedCompanies, pastDueCompanies] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.user.count(),
      this.prisma.employee.count(),
      this.prisma.message.count(),
      this.prisma.company.count({ where: { status: 'ACTIVE' } }),
      this.prisma.company.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.company.count({ where: { billingStatus: 'PAST_DUE' } }),
    ]);
    return { companies, users, employees, messages, activeCompanies, suspendedCompanies, pastDueCompanies };
  }

  getOnlineUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.prisma.user.findMany({
      where: { lastActiveAt: { gte: fiveMinutesAgo } },
      select: { id: true, name: true, email: true, role: true, lastActiveAt: true, company: { select: { name: true } } },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  async getFirstAdmin(companyId: string) {
    // Tenta admin ativo primeiro; fallback para qualquer admin (ghost-mode de emergência)
    const activeAdmin = await this.prisma.user.findFirst({
      where: { companyId, role: 'ADMIN', isActive: true },
    });
    if (activeAdmin) return activeAdmin;
    return this.prisma.user.findFirst({
      where: { companyId, role: 'ADMIN' },
    });
  }

  createAuditLog(data: {
    companyId: string;
    action: string;
    actor: string;
    metadata?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        action: data.action,
        entity: 'Platform',
        metadata: {
          actorEmail: data.actor,
          ...data.metadata
        }
      }
    });
  }
}

```

---

### 📄 `apps/api/src/modules/platform/platform.service.ts`

```typescript
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { JwtUser } from '../../common/types/auth.types';
import { emptyToNull, normalizeDisplayName } from '../../common/utils/text-normalization';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { CreatePlatformCompanyUserDto } from './dto/create-platform-company-user.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';
import { UpdatePlatformCompanyUserDto } from './dto/update-platform-company-user.dto';
import { PlatformRepository } from './platform.repository';

// SEGURANÇA: e-mail do DEV proprietário da plataforma — definido via variável de ambiente
const PLATFORM_OWNER_EMAIL = (process.env.PLATFORM_OWNER_EMAIL ?? '').toLowerCase();
const PROTECTED_PLATFORM_ROLES = ['DEV', 'COMERCIAL'];

import { NotificationsService } from '../notifications/notifications.service';
import { PlatformFinanceService } from '../finance/platform-finance.service';

@Injectable()
export class PlatformService {
  constructor(
    private readonly repository: PlatformRepository,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly platformFinance: PlatformFinanceService,
  ) {}

  listCompanies() {
    return this.repository.listCompanies();
  }

  getOnlineUsers() {
    return this.repository.getOnlineUsers();
  }

  async ghostMode(companyId: string, actor?: JwtUser, req?: any) {
    if (!actor || actor.role !== 'DEV') {
      throw new ForbiddenException('Acesso de suporte permitido somente ao perfil DEV.');
    }

    const company = await this.repository.getCompany(companyId);
    if (!company) throw new NotFoundException('Empresa não encontrada');
    if (company.status !== 'ACTIVE') {
      throw new ForbiddenException(`Não pode acessar empresa ${company.status === 'SUSPENDED' ? 'suspensa' : 'cancelada'}`);
    }

    const reason = req?.body?.reason || 'Suporte técnico';

    await this.repository.createAuditLog({
      companyId,
      action: 'GHOST_MODE_STARTED',
      actor: actor.email,
      metadata: {
        reason,
        targetCompany: company.name,
        actorEmail: actor.email,
        ip: req?.ip || 'unknown',
        userAgent: req?.headers?.['user-agent'] || 'unknown',
      },
    });

    // ✅ Mantém identidade do DEV — não impersona o admin da empresa
    const payload = {
      sub: actor.sub,
      email: actor.email,
      name: actor.name,
      role: 'DEV' as const,
      companyId,
      ghostMode: true,
    };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      token: access_token,
      user: payload,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug || company.id,
        status: company.status,
        billingStatus: company.billingStatus,
        isActive: company.isActive,
      },
      ghostMode: true,
    };
  }

  async getCompany(id: string) {
    const company = await this.repository.getCompany(id);
    if (!company) throw new NotFoundException('Empresa nao encontrada');
    return { ...company, usersCount: company._count.users, employeesCount: company._count.employees };
  }

  async companyAuditLogs(id: string) {
    await this.getCompany(id);
    return this.repository.listCompanyAuditLogs(id);
  }

  async createCompany(actor: JwtUser, dto: CreatePlatformCompanyDto) {
    const adminEmail = dto.adminEmail.trim().toLowerCase();
    const existing = await this.repository.findUserByEmail(adminEmail);
    if (existing) throw new ConflictException('E-mail do admin ja esta em uso');
    const selectedPlan = dto.planId ? await this.repository.getPlan(dto.planId) : null;
    if (dto.planId && !selectedPlan) throw new NotFoundException('Plano nao encontrado ou inativo.');

    const isFree = Boolean(selectedPlan?.isFree);
    const created = await this.repository.createCompanyWithAdmin({
      name: normalizeDisplayName(dto.name),
      document: emptyToNull(dto.document?.replace(/\D/g, '')),
      maxUsers: selectedPlan?.maxUsers ?? dto.maxUsers ?? 6,
      maxEmployees: selectedPlan?.maxEmployees ?? dto.maxEmployees ?? 50,
      adminName: normalizeDisplayName(dto.adminName),
      adminEmail,
      adminPasswordHash: await bcrypt.hash(dto.adminPassword, 12),
      commercialOwnerId: actor.role === 'COMERCIAL' ? actor.sub : null,
      plan: isFree ? 'FREE' : 'PRO',
      billingStatus: isFree ? 'ACTIVE' : 'PENDING_PAYMENT',
      trialEndsAt: undefined,
      platformPlanId: selectedPlan?.id,
    });

    let paymentUrl: string | null = null;
    let billingSetupPending = false;
    try {
      const checkout = await this.platformFinance.ensureCompanyOnboardingBilling(created.company.id);
      paymentUrl = checkout.paymentUrl ?? null;
    } catch (error) {
      billingSetupPending = true;
    }
    return { ...created.company, adminId: created.adminId, paymentUrl, billingSetupPending };
  }

  async updateCompany(actor: JwtUser, id: string, dto: UpdatePlatformCompanyDto) {
    if (actor.role !== 'DEV' && actor.role !== 'COMERCIAL') {
      throw new ForbiddenException('Apenas DEV ou COMERCIAL pode alterar limites/licencas da empresa.');
    }
    const company = await this.getCompany(id);
    if (actor.role === 'COMERCIAL' && company.commercialOwnerId !== actor.sub) {
      throw new ForbiddenException('Comercial so pode alterar empresas sob sua responsabilidade.');
    }
    const status = dto.status;
    const { name, document, plan, billingStatus, trialEndsAt, activeModules, ...rest } = dto;

    // Auto-suspend on PAST_DUE, auto-activate on ACTIVE billing
    const autoStatus = billingStatus === 'PAST_DUE' ? 'SUSPENDED' 
                     : billingStatus === 'ACTIVE' ? 'ACTIVE' 
                     : undefined;
    const autoSuspensionReason = billingStatus === 'PAST_DUE' ? 'inadimplencia'
                               : billingStatus === 'ACTIVE' ? null
                               : undefined;

    const isCustomPlan = plan && !['FREE', 'BASE', 'PRO', 'ENTERPRISE'].includes(plan);

    const data = {
      ...rest,
      ...(name !== undefined ? { name: normalizeDisplayName(name) } : {}),
      ...(document !== undefined ? { document: emptyToNull(document) } : {}),
      ...(status ? { status } : autoStatus !== undefined ? { status: autoStatus } : {}),
      ...((status === 'ACTIVE' || autoStatus === 'ACTIVE') ? { suspensionReason: null } : {}),
      ...(plan ? (isCustomPlan ? { plan: 'PRO', platformPlanId: plan } : { plan: plan as any, platformPlanId: null }) : {}),
      ...(billingStatus ? { billingStatus } : {}),
      ...(trialEndsAt !== undefined ? { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null } : {}),
      ...(activeModules !== undefined ? { activeModules } : {}),
      ...(status === 'CANCELLED' && !dto.suspensionReason ? { suspensionReason: 'solicitacao_voluntaria' } : {}),
      ...(autoSuspensionReason !== undefined && !status ? { suspensionReason: autoSuspensionReason } : {}),
    };
    
    // Notificar admin(s) da empresa sobre inadimplência caso mude para PAST_DUE
    if (billingStatus === 'PAST_DUE' && company.billingStatus !== 'PAST_DUE') {
      await this.notificationsService.createAdminNotice(id, actor.sub, {
        type: 'SYSTEM_ALERT',
        title: 'Aviso de Inadimplência e Bloqueio',
        message: 'Consta um débito pendente na sua assinatura. Seu acesso a módulos foi restrito. Regularize para reativar o acesso integral à plataforma.',
        priority: 'HIGH',
        targetType: 'ROLE',
        targetRole: 'ADMIN',
      }).catch(err => console.error('[PlatformService] Error sending suspension notice:', err));
    }

    return this.repository.updateCompany(id, data);
  }

  async deleteCompany(id: string) {
    await this.repository.deleteCompany(id);
    return { success: true };
  }

  async lookupCnpj(cnpj: string) {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new ConflictException('CNPJ invalido');
    }
    try {
      const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}`);
      if (!response.ok) {
        throw new Error('Falha ao consultar CNPJ');
      }
      const data = (await response.json()) as any;
      if (data.status === 'ERROR') {
        throw new ConflictException(data.message || 'CNPJ rejeitado pela Receita');
      }
      return data;
    } catch (e: any) {
      throw new ConflictException(e.message || 'Erro ao consultar CNPJ');
    }
  }

  async listCompanyUsers(actor: JwtUser, companyId: string) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    return this.repository.listCompanyUsers(companyId);
  }

  async createCompanyUser(actor: JwtUser, companyId: string, dto: CreatePlatformCompanyUserDto) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    this.assertCompanyUserRoleAllowed(actor, dto.role);

    const company = await this.getCompany(companyId);
    const email = dto.email.trim().toLowerCase();
    const existing = await this.repository.findUserByEmail(email);
    if (existing) throw new ConflictException('E-mail ja cadastrado');

    const count = await this.repository.countUsers(companyId);
    const limit = company.subscription?.seatQuantity ?? 1;
    if (count >= limit) {
      throw new ForbiddenException({ code: 'SEAT_LIMIT_REACHED', message: 'A empresa utiliza todas as licencas contratadas.', used: count, limit });
    }

    return this.repository.createCompanyUser({
      companyId,
      name: normalizeDisplayName(dto.name),
      email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: dto.role ?? 'FUNCIONARIO',
    });
  }

  async updateCompanyUser(actor: JwtUser, companyId: string, userId: string, dto: UpdatePlatformCompanyUserDto) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    this.assertCompanyUserRoleAllowed(actor, dto.role);
    const current = await this.repository.findCompanyUser(companyId, userId);
    if (!current) throw new NotFoundException('Usuario nao encontrado');
    this.assertCanTouchTargetUser(actor, current.role);

    const { password, name, email, ...rest } = dto;
    const result = await this.repository.updateCompanyUser(companyId, userId, {
      ...rest,
      ...(name !== undefined ? { name: normalizeDisplayName(name) } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    });
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return this.repository.findCompanyUser(companyId, userId);
  }

  async deleteCompanyUser(actor: JwtUser, companyId: string, userId: string) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    const current = await this.repository.findCompanyUser(companyId, userId);
    if (!current) throw new NotFoundException('Usuario nao encontrado');
    this.assertCanTouchTargetUser(actor, current.role);
    const result = await this.repository.deleteCompanyUser(companyId, userId);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return { deleted: true };
  }

  stats() {
    return this.repository.globalStats();
  }

  private async assertCanManageCompanyUsers(actor: JwtUser, companyId: string) {
    if (actor.role === 'DEV') return;
    if (actor.role !== 'COMERCIAL') throw new ForbiddenException('Perfil sem permissao para gerir usuarios de empresas.');
    const company = await this.getCompany(companyId);
    if (company.commercialOwnerId !== actor.sub) {
      throw new ForbiddenException('Comercial so pode gerir empresas sob sua responsabilidade.');
    }
  }

  private assertCompanyUserRoleAllowed(actor: JwtUser, nextRole?: string) {
    if (!nextRole) return;
    if (PROTECTED_PLATFORM_ROLES.includes(nextRole) && actor.email.toLowerCase() !== PLATFORM_OWNER_EMAIL) {
      throw new ForbiddenException('Apenas o dono da plataforma pode criar Super Admin ou Comercial.');
    }
    if (actor.role === 'COMERCIAL' && PROTECTED_PLATFORM_ROLES.includes(nextRole)) {
      throw new ForbiddenException('Comercial nao pode criar Super Admin ou Comercial.');
    }
  }

  private assertCanTouchTargetUser(actor: JwtUser, targetRole: string) {
    if (actor.email.toLowerCase() === PLATFORM_OWNER_EMAIL) return;
    if (PROTECTED_PLATFORM_ROLES.includes(targetRole)) {
      throw new ForbiddenException('Perfil protegido nao pode ser alterado por este usuario.');
    }
  }
}
```

---

