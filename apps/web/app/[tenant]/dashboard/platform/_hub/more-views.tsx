'use client';

import { ArrowUpRight, Building2, FileKey2, Headset, Megaphone, ScrollText, ShieldCheck, UsersRound, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { date, dateTime, errorText, money } from './format';

export function CommercialView({ companyId, base }: { companyId?: string; base: string }) {
  const contracts = useQuery(() => api.manualContracts.list(companyId ? { companyId } : undefined), [companyId]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-outline btn-md" href={`${base}/contracts`}>Gerenciar contratos <ArrowUpRight size={14} aria-hidden="true" /></Link>
        <Link className="btn btn-outline btn-md" href={`${base}/proposals`}>Propostas <ArrowUpRight size={14} aria-hidden="true" /></Link>
        <Link className="btn btn-outline btn-md" href={`${base.replace(/\/platform$/, '')}/faturas?aba=assinaturas`}>Assinaturas <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
      {contracts.error && <ErrorState message={contracts.error} onRetry={contracts.refetch} />}
      {contracts.loading && !contracts.data ? <LoadingState label="Carregando contratos…" /> : (contracts.data ?? []).length === 0 ? <EmptyState message="Nenhum contrato manual." /> : (
        <div className="card-v2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">Contratos</caption>
            <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Empresa', 'Situação', 'Valor', 'Vigência', ''].map((label, index) => <th key={index} scope="col" className="px-3 py-2.5 font-medium">{label}</th>)}</tr></thead>
            <tbody>{(contracts.data ?? []).map((contract: any) => (
              <tr key={contract.id} className="border-b border-border last:border-0"><th scope="row" className="px-3 py-2.5 text-left font-medium">{contract.company?.name ?? '—'}</th><td className="px-3 py-2.5">{String(contract.status).toLowerCase()}</td><td className="px-3 py-2.5 tabular-nums">{money(contract.agreedAmount)}</td><td className="px-3 py-2.5 text-fg-sub">{date(contract.startsAt)}{contract.endsAt ? ` a ${date(contract.endsAt)}` : ''}</td>
                <td className="px-3 py-2.5 text-right"><Button size="sm" variant="outline" onClick={async () => { try { await api.manualContracts.downloadPdf(contract.id); } catch (cause) { toast.error(errorText(cause, 'Não foi possível baixar o PDF.')); } }}>PDF</Button></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SupportView({ companyId, base }: { companyId?: string; base: string }) {
  const tickets = useQuery(() => api.platformSupport.list({ ...(companyId ? { companyId } : {}), limit: 20 }), [companyId]);
  const rows: any[] = Array.isArray(tickets.data) ? tickets.data : (tickets.data as any)?.items ?? [];
  return (
    <div className="space-y-4">
      <Link className="btn btn-outline btn-md inline-flex" href={`${base}/support`}>Abrir central de suporte completa <ArrowUpRight size={14} aria-hidden="true" /></Link>
      {tickets.error && <ErrorState message={tickets.error} onRetry={tickets.refetch} />}
      {tickets.loading && !tickets.data ? <LoadingState label="Carregando chamados…" /> : rows.length === 0 ? <EmptyState message="Nenhum chamado." /> : (
        <ul className="card-v2 divide-y divide-border">
          {rows.map((ticket) => (
            <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><span className="min-w-0"><span className="font-medium">{ticket.ticketNumber} · {ticket.title}</span><span className="block text-xs text-fg-sub">{ticket.company?.name ?? ticket.requesterEmail} · {dateTime(ticket.createdAt)}</span></span><span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs">{ticket.status} · {ticket.priority}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AuditView({ companyId }: { companyId?: string }) {
  const logs = useQuery(() => api.platform.finance.billingAuditLogs({ companyId, limit: 60 }), [companyId]);
  if (logs.error) return <ErrorState message={logs.error} onRetry={logs.refetch} />;
  if (logs.loading && !logs.data) return <LoadingState label="Carregando auditoria…" />;
  const rows = logs.data ?? [];
  if (rows.length === 0) return <EmptyState message="Nenhum registro de auditoria." />;
  return (
    <div className="card-v2 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">Auditoria</caption>
        <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Quando', 'Empresa', 'Ação', 'Por'].map((label) => <th key={label} scope="col" className="px-3 py-2.5 font-medium">{label}</th>)}</tr></thead>
        <tbody>{rows.map((log) => (
          <tr key={log.id} className="border-b border-border last:border-0"><td className="whitespace-nowrap px-3 py-2 text-fg-sub">{dateTime(log.createdAt)}</td><td className="px-3 py-2">{log.company?.name ?? '—'}</td><td className="px-3 py-2 font-medium">{log.action.replace(/_/g, ' ').toLowerCase()}</td><td className="px-3 py-2 text-fg-sub">{log.user?.name ?? 'sistema'}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const LINKS: { href: string; label: string; text: string; icon: LucideIcon }[] = [
  { href: '/permissions', label: 'Permissões globais', text: 'Perfis e políticas', icon: ShieldCheck },
  { href: '/access', label: 'Acessos técnicos', text: 'Sessões e modo suporte', icon: UsersRound },
  { href: '/proposals', label: 'Propostas', text: 'Pipeline comercial', icon: ScrollText },
  { href: '/whatsapp', label: 'WhatsApp', text: 'Canais de mensagem', icon: Megaphone },
  { href: '/intelligence', label: 'Inteligência', text: 'Riscos e sinais da base', icon: Building2 },
  { href: '/configuration', label: 'Configuração global', text: 'Parâmetros da plataforma', icon: FileKey2 },
  { href: '/support', label: 'Central de suporte', text: 'Fila, SLA e atendimento', icon: Headset },
];

export function SettingsView({ base }: { base: string }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {LINKS.map((item) => (
        <li key={item.href}>
          <Link href={`${base}${item.href}`} className="card-v2 flex items-start gap-3 p-4 transition hover:border-purple-400">
            <item.icon size={20} className="mt-0.5 shrink-0 text-purple-700" aria-hidden="true" />
            <span><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-fg-sub">{item.text}</span></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
