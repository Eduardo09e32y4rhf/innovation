'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft, CreditCard, KeyRound, LayoutDashboard,
  Mail, Plug, ShieldCheck, Settings, Smartphone, Users,
  Zap, Search, type LucideIcon,
} from 'lucide-react';

type NavItemConfig = { label: string; href: string; icon: LucideIcon; match?: string; };
type NavSection = { label: string; match?: string; items: NavItemConfig[]; };

const navSections: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Painel',       href: '/dashboard' },
      { icon: Users,           label: 'RH',           href: '/dashboard/rh/pipeline',           match: '/dashboard/rh/pipeline' },
      { icon: Search,          label: 'Talentos',     href: '/dashboard/rh/talents',            match: '/dashboard/rh/talents' },
      { icon: CreditCard,      label: 'Financeiro',   href: '/dashboard/finance/overview',      match: '/dashboard/finance' },
      { icon: Smartphone,      label: 'WhatsApp',     href: '/dashboard/whatsapp/accounts',     match: '/dashboard/whatsapp' },
      { icon: Settings,        label: 'Configurações', href: '/dashboard/settings/integrations', match: '/dashboard/settings' },
    ],
  },
  {
    label: 'Configurações',
    match: '/dashboard/settings',
    items: [
      { icon: ArrowLeft,   label: 'Voltar',            href: '/dashboard' },
      { icon: Settings,    label: 'Geral',             href: '/dashboard/settings/general' },
      { icon: Users,       label: 'Usuários',          href: '/dashboard/settings/users' },
      { icon: CreditCard,  label: 'Plano',             href: '/dashboard/settings/billing' },
      { icon: Plug,        label: 'Integrações',       href: '/dashboard/settings/integrations' },
      { icon: KeyRound,    label: 'API Keys',          href: '/dashboard/settings/api-keys' },
      { icon: Smartphone,  label: 'WhatsApp',          href: '/dashboard/settings/whatsapp' },
      { icon: Mail,        label: 'E-mail',            href: '/dashboard/settings/email' },
      { icon: ShieldCheck, label: 'Segurança',         href: '/dashboard/settings/security' },
    ],
  },
];

function isActive(pathname: string | null, item: NavItemConfig) {
  const route = item.match ?? item.href;
  if (route === '/dashboard') return pathname === '/dashboard';
  return Boolean(pathname?.startsWith(route));
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const isSettings = pathname?.startsWith('/dashboard/settings');
  const section = navSections.find(s => isSettings ? !!s.match : !s.match) ?? navSections[0];

  return (
    <aside className="sidebar-shell flex w-full shrink-0 flex-col md:h-screen md:w-[220px]">
      {/* Brand */}
      <div className="p-3 md:p-4">
        <div className="sidebar-brand-card flex items-center gap-3 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-white shrink-0">
            <Zap size={15} strokeWidth={2.2} className="text-[#0D0D0E]" />
          </div>
          <div>
            <p className="text-[9px] font-semibold tracking-[0.18em] text-white/40 uppercase leading-none">Inovação IA</p>
            <p className="text-[13px] font-semibold text-white leading-tight mt-0.5">
              {isSettings ? 'Configurações' : 'Console'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:space-y-0.5 md:overflow-visible md:pb-0">
        {section.items.map(item => (
          <NavItem key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
      </nav>

      {/* Copilot */}
      <div className="hidden p-3 pt-0 md:block">
        <div className="sidebar-copilot-card p-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/15 mb-3">
            <Zap size={13} strokeWidth={2} className="text-teal-400" />
          </div>
          <p className="text-[12px] font-semibold text-white leading-tight">
            {isSettings ? 'Governança segura' : 'Copiloto operacional'}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
            {isSettings
              ? 'Tokens, permissões e auditoria por RLS.'
              : 'IA, RH, financeiro e canais em uma única visão.'}
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ item, active }: { item: NavItemConfig; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`sidebar-nav-item shrink-0 ${active ? 'sidebar-nav-active' : 'sidebar-nav-idle'}`}
    >
      <Icon size={14} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
