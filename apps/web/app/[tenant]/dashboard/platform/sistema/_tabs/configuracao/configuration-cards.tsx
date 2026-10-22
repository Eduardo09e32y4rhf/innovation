'use client';

import Link from 'next/link';
import { ArrowUpRight, Building2, CircleDollarSign, CreditCard, History, KeyRound, MessageSquareText, ShieldCheck, type LucideIcon } from 'lucide-react';
import { areaAccess, tabAccess, tabsFor, FINANCEIRO_TABS, SISTEMA_TABS, visibleExtras } from '../../../_lib/platform-access';
import { platformLinks } from '../../../_lib/platform-links';

export interface ConfigCard { key: string; title: string; description: string; href: string; action: string; icon: LucideIcon; meta: string }

interface Counts { companies: number; plans: number; profiles: number | null; withoutGateway: number }

const canTab = (tabs: typeof SISTEMA_TABS, key: string, role: string) => tabsFor(tabs, role).some((tab) => tab.key === key && tabAccess(tab, role) !== 'none');

/** Atalhos de configuração: só aparecem os destinos que o perfil realmente consegue abrir. */
export function buildConfigCards(tenant: string, role: string, counts: Counts): { governance: ConfigCard[]; operation: ConfigCard[] } {
  const links = platformLinks(tenant);
  const governance: ConfigCard[] = [];
  const operation: ConfigCard[] = [];
  if (areaAccess('clientes', role) !== 'none') governance.push({ key: 'clientes', title: 'Clientes', description: 'Cadastro, limites, situação de acesso e dados operacionais de cada empresa.', href: links.clientes(), action: 'Ver clientes', icon: Building2, meta: `${counts.companies} cadastradas` });
  if (canTab(FINANCEIRO_TABS, 'planos', role)) governance.push({ key: 'planos', title: 'Planos e limites', description: 'Preços, quantidade de usuários, módulos e regras comerciais.', href: links.financeiro('planos'), action: 'Ver planos', icon: CreditCard, meta: `${counts.plans} planos` });
  if (canTab(SISTEMA_TABS, 'permissoes', role)) governance.push({ key: 'permissoes', title: 'Permissões', description: 'Políticas por perfil para visualização e operações sensíveis.', href: links.sistema('permissoes'), action: 'Revisar permissões', icon: ShieldCheck, meta: counts.profiles === null ? 'Consulta' : `${counts.profiles} perfis` });
  if (canTab(FINANCEIRO_TABS, 'assinaturas', role)) operation.push({ key: 'assinaturas', title: 'Assinaturas', description: 'Vínculos entre empresas, planos e cobrança recorrente.', href: links.financeiro('assinaturas'), action: 'Acompanhar assinaturas', icon: CircleDollarSign, meta: `${counts.withoutGateway} sem cliente no provedor` });
  if (canTab(SISTEMA_TABS, 'acessos', role)) operation.push({ key: 'acessos', title: 'Acessos', description: 'Quem está conectado agora e as sessões de suporte técnico.', href: links.sistema('acessos'), action: 'Ver acessos', icon: KeyRound, meta: 'Consulta operacional' });
  if (visibleExtras(role, 'sistema').some((extra) => extra.key === 'whatsapp')) operation.push({ key: 'whatsapp', title: 'Integrações e comunicação', description: 'Canais de comunicação da plataforma.', href: `${links.base}/whatsapp`, action: 'Abrir integrações', icon: MessageSquareText, meta: 'Status na própria tela' });
  if (canTab(SISTEMA_TABS, 'auditoria', role)) operation.push({ key: 'auditoria', title: 'Auditoria', description: 'Histórico de alterações por empresa, autor e data.', href: links.sistema('auditoria'), action: 'Consultar auditoria', icon: History, meta: 'Consulta por empresa' });
  return { governance, operation };
}

export function ConfigurationGroup({ title, description, items }: { title: string; description: string; items: ConfigCard[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="text-base font-bold text-fg">{title}</h3>
      <p className="mb-3 mt-0.5 text-sm text-fg-sub">{description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.key} href={item.href} className="group flex min-h-40 flex-col rounded-2xl border border-border bg-bg p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-sub text-fg"><item.icon size={18} aria-hidden="true" /></span>
              <span className="rounded-full bg-bg-sub px-2.5 py-1 text-xs font-semibold text-fg-sub">{item.meta}</span>
            </div>
            <h4 className="mt-3 text-base font-bold text-fg">{item.title}</h4>
            <p className="mt-1 flex-1 text-sm text-fg-sub">{item.description}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-fg">{item.action}<ArrowUpRight size={14} aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PendingList({ tenant, withoutPlan, withoutGateway }: { tenant: string; withoutPlan: number; withoutGateway: number }) {
  const links = platformLinks(tenant);
  const rows = [
    { key: 'plan', title: 'Empresas sem plano', count: withoutPlan, text: 'Defina plano e limites para evitar acesso sem regra comercial.', href: links.clientes() },
    { key: 'gateway', title: 'Empresas sem cliente no provedor de pagamento', count: withoutGateway, text: 'Revise o vínculo antes de operar cobrança recorrente.', href: links.financeiro('assinaturas') },
  ].filter((row) => row.count > 0);
  return (
    <aside className="h-fit rounded-2xl border border-border bg-bg p-4 shadow-sm" aria-label="Pendências">
      <h3 className="text-base font-bold text-fg">Fila administrativa</h3>
      {rows.length === 0 ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Nenhuma pendência: todas as empresas têm plano e vínculo de pagamento.</p> : (
        <ul className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <Link href={row.href} className="block rounded-xl border border-amber-200 bg-amber-50 p-3 hover:border-amber-300">
                <span className="flex items-center justify-between gap-2 text-sm font-bold text-amber-950">{row.title}<span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs">{row.count}</span></span>
                <span className="mt-1 block text-xs text-amber-900/80">{row.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
