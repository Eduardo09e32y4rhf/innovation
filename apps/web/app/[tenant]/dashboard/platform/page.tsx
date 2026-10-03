'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Activity, AlertTriangle, ArrowUpRight, BarChart3, Building2, CheckCircle2, CircleDollarSign, ClipboardSignature, Clock3, FileKey2, Headset, Plus, ShieldAlert, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from './_components/use-platform-query';
import { api } from '@/app/lib/api';

type LinkItem = { id: string; title: string; description: string; href: string; icon: typeof Building2; tone: string; restricted?: boolean };

const LINK_ITEMS: LinkItem[] = [
  { id: 'companies', title: 'Empresas clientes', description: 'Cadastros, limites e situação de acesso', href: '/companies', icon: Building2, tone: 'text-cyan-600 bg-cyan-500/10' },
  { id: 'intelligence', title: 'Inteligência operacional', description: 'Riscos, anomalias e sinais de churn', href: '/intelligence', icon: Activity, tone: 'text-accent bg-accent/10', restricted: true },
  { id: 'finance', title: 'Financeiro', description: 'Receita, Asaas, cobrança e recebíveis', href: '/finance', icon: WalletCards, tone: 'text-emerald-600 bg-emerald-500/10' },
  { id: 'contracts', title: 'Contratos e propostas', description: 'Negociação, documentos e renovações', href: '/contracts', icon: ClipboardSignature, tone: 'text-blue-600 bg-blue-500/10' },
  { id: 'subscriptions', title: 'Assinaturas e planos', description: 'Recorrência, produtos e limites', href: '/subscriptions', icon: CircleDollarSign, tone: 'text-amber-600 bg-amber-500/10' },
  { id: 'support', title: 'Suporte operacional', description: 'Fila de chamados, SLA e atendimento', href: '/support', icon: Headset, tone: 'text-brand bg-brand/10', restricted: true },
  { id: 'configuration', title: 'Configuração administrativa', description: 'Permissões, integrações e governança', href: '/configuration', icon: FileKey2, tone: 'text-violet-600 bg-violet-500/10', restricted: true },
  { id: 'audit', title: 'Auditoria e logs', description: 'Rastreabilidade de ações sensíveis', href: '/audit', icon: ShieldCheck, tone: 'text-slate-600 bg-slate-500/10', restricted: true },
];

export default function PlatformDashboard() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const tenant = String(params?.tenant || '');
  const role = String(user?.profile || user?.role || '').toUpperCase();
  const stats = useQuery(() => api.platform.stats(), []);
  const links = useMemo(() => LINK_ITEMS.filter((item) => !item.restricted || role === 'DEV' || (role === 'CEO' && item.id !== 'support')), [role]);
  const data = stats.data;
  const attentionCount = (data?.pastDueCompanies ?? 0) + (data?.suspendedCompanies ?? 0);

  const metrics = [
    { label: 'Empresas', value: data?.companies, detail: 'Base total', icon: Building2, tone: 'text-cyan-600 bg-cyan-500/10' },
    { label: 'Ativas', value: data?.activeCompanies, detail: 'Operando normalmente', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-500/10' },
    { label: 'Usuários', value: data?.users, detail: 'Acessos cadastrados', icon: Users, tone: 'text-blue-600 bg-blue-500/10' },
    { label: 'Funcionários', value: data?.employees, detail: 'Pessoas na base', icon: Users, tone: 'text-brand bg-brand/10' },
    { label: 'Suspensas', value: data?.suspendedCompanies, detail: 'Exigem análise', icon: ShieldAlert, tone: 'text-rose-600 bg-rose-500/10' },
    { label: 'Inadimplentes', value: data?.pastDueCompanies, detail: 'Atenção financeira', icon: AlertTriangle, tone: 'text-amber-600 bg-amber-500/10' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="card-v2 relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="chip-brand inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em]"><BarChart3 size={12} /> Visão executiva</span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-fg sm:text-3xl">O pulso da sua plataforma</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-mut">Acompanhe clientes, receita e sinais operacionais em uma visão única para decidir o próximo movimento.</p>
          </div>
          <button type="button" onClick={() => router.push(`/${tenant}/dashboard/platform/companies`)} className="btn-v2-primary shrink-0"><Plus size={16} /> Nova empresa</button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="card-v2 flex items-center gap-3 p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-v2 ${tone}`}><Icon size={18} /></span>
            <div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-fg-mut">{label}</p><p className="mt-1 text-2xl font-black leading-none text-fg">{stats.loading ? '—' : value ?? 0}</p><p className="mt-1 text-[10px] font-medium text-fg-sub">{detail}</p></div>
          </div>
        ))}
      </section>

      <section className={`card-v2 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between ${attentionCount ? 'border-amber-500/30 bg-amber-500/5' : 'border-brand/20 bg-brand/5'}`}>
        <div className="flex items-start gap-3"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-v2 ${attentionCount ? 'bg-amber-500/10 text-amber-600' : 'bg-brand/10 text-brand'}`}>{attentionCount ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}</span><div><p className="text-xs font-black text-fg">{attentionCount ? 'A plataforma pede atenção' : 'A operação está estável'}</p><p className="mt-1 text-xs text-fg-mut">{attentionCount ? `${data?.pastDueCompanies ?? 0} empresa(s) inadimplente(s) e ${data?.suspendedCompanies ?? 0} suspensa(s) aguardam acompanhamento.` : 'Nenhum alerta financeiro ou de acesso foi identificado nos indicadores atuais.'}</p></div></div>
        <Link href={`/${tenant}/dashboard/platform/${attentionCount ? 'finance' : 'companies'}`} className="btn-v2-outline w-fit">{attentionCount ? 'Revisar pendências' : 'Ver empresas'} <ArrowUpRight size={14} /></Link>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-black text-fg">Mapa de operação</h2><p className="mt-1 text-xs text-fg-mut">Acesse cada frente sem depender de atalhos escondidos.</p></div><span className="chip inline-flex items-center gap-1.5 text-[10px] font-black"><Clock3 size={12} /> {links.length} áreas disponíveis</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {links.map((item) => { const Icon = item.icon; return <Link key={item.id} href={`/${tenant}/dashboard/platform${item.href}`} className="card-v2 group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-v2-md"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-v2 ${item.tone}`}><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-fg group-hover:text-brand">{item.title}</span><span className="mt-1 block text-xs leading-5 text-fg-mut">{item.description}</span></span><ArrowUpRight size={15} className="shrink-0 text-fg-sub transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" /></Link>; })}
        </div>
      </section>

      <section className="card-v2 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-bg-sub/60 px-5 py-4"><div className="flex items-center gap-2"><Activity size={16} className="text-brand" /><h2 className="text-sm font-black text-fg">Ritmo operacional</h2></div><Link href={`/${tenant}/dashboard/platform/audit`} className="text-xs font-bold text-brand hover:underline">Abrir auditoria <ArrowUpRight size={13} className="inline" /></Link></div>
        <div className="grid gap-3 p-5 sm:grid-cols-3"><Signal icon={Building2} label="Clientes ativos" value={data?.activeCompanies ?? 0} detail="Base em operação" /><Signal icon={WalletCards} label="Atenção financeira" value={data?.pastDueCompanies ?? 0} detail="Contas inadimplentes" tone="warning" /><Signal icon={ShieldCheck} label="Saúde de acesso" value={data?.suspendedCompanies ?? 0} detail="Contas suspensas" tone="danger" /></div>
      </section>
    </div>
  );
}

function Signal({ icon: Icon, label, value, detail, tone = 'default' }: { icon: typeof Building2; label: string; value: number; detail: string; tone?: 'default' | 'warning' | 'danger' }) {
  const styles = tone === 'warning' ? 'bg-amber-500/10 text-amber-600' : tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-brand/10 text-brand';
  return <div className="rounded-v2 border border-border bg-bg-sub/50 p-4"><div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-v2 ${styles}`}><Icon size={15} /></span><p className="text-xs font-black text-fg">{label}</p></div><p className="mt-4 text-2xl font-black text-fg">{value}</p><p className="mt-1 text-[10px] font-medium text-fg-sub">{detail}</p></div>;
}
