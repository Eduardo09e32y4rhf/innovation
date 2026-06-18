'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  Settings,
  Smartphone,
  UserCog,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

type NavItemConfig = { label: string; href: string; icon: LucideIcon; match?: string };

const baseNavItems: NavItemConfig[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Funcionarios', href: '/dashboard/employees', match: '/dashboard/employees' },
  { icon: Clock3, label: 'Ponto', href: '/dashboard/time-track', match: '/dashboard/time-track' },
  { icon: CalendarDays, label: 'Ferias', href: '/dashboard/vacations', match: '/dashboard/vacations' },
  { icon: Smartphone, label: 'WhatsApp', href: '/dashboard/whatsapp', match: '/dashboard/whatsapp' },
  { icon: UserCog, label: 'Usuarios', href: '/dashboard/users', match: '/dashboard/users' },
  { icon: Settings, label: 'Configuracoes', href: '/dashboard/settings', match: '/dashboard/settings' },
];

const devNavItem: NavItemConfig = {
  icon: Building2,
  label: 'Plataforma',
  href: '/dashboard/platform',
  match: '/dashboard/platform',
};

function isActive(pathname: string | null, item: NavItemConfig) {
  const route = item.match ?? item.href;
  if (route === '/dashboard') return pathname === '/dashboard';
  return Boolean(pathname?.startsWith(route));
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isDev = user?.profile === 'dev';
  const navItems = isDev ? [...baseNavItems, devNavItem] : baseNavItems;

  return (
    <aside className="sidebar-shell flex w-full shrink-0 flex-col md:h-screen md:w-[220px]">
      <div className="p-3 md:p-4">
        <div className="sidebar-brand-card flex items-center gap-3 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-white">
            <Zap size={15} strokeWidth={2.2} className="text-[#0D0D0E]" />
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-white/40">
              Innovation RH Connect
            </p>
            <p className="mt-0.5 text-[13px] font-semibold leading-tight text-white">Console RH</p>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:space-y-0.5 md:overflow-visible md:pb-0">
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
      </nav>

      <div className="hidden p-3 pt-0 md:block">
        <div className="sidebar-copilot-card p-4">
          <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/15">
            <Zap size={13} strokeWidth={2} className="text-teal-400" />
          </div>
          <p className="text-[12px] font-semibold leading-tight text-white">MVP vendavel</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
            RH, ponto e WhatsApp para operacao diaria.
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ item, active }: { item: NavItemConfig; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`sidebar-nav-item shrink-0 ${active ? 'sidebar-nav-active' : 'sidebar-nav-idle'}`}>
      <Icon size={14} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
