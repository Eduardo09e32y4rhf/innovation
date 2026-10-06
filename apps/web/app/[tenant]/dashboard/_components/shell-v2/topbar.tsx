'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bell, HelpCircle, Menu, Moon, Search, Sun, PanelLeftClose } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useAppearance } from '@/app/contexts/AppearanceContext';
import { UserMenu } from '@/app/components/ui/user-menu';
import { useWorkspace } from './workspace-context';
import { CommandMenu } from './command-menu';
import { tenantRoute } from './nav-config';
import { openGuidedTour } from '../tour/guided-tour';

export function TopbarV2({ onMenu }: { onMenu: () => void }) {
  const { company: authCompany } = useAuth();
  const { company, items } = useWorkspace();
  const { dark, setAppearance } = useAppearance();
  const params = useParams();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcut, setShortcut] = useState('Ctrl+K');
  const tenant = String(params?.tenant || authCompany?.slug || authCompany?.id || '');
  useEffect(() => {
    setShortcut(/Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘K' : 'Ctrl+K');
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setSearchOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const name = company?.name || authCompany?.name || 'Área de trabalho';
  const canOpenNotifications = items.some((item) => item.id === 'management');
  return <>
    <header className="workspace-topbar sticky top-0 z-30 flex items-center gap-2 px-3 sm:px-5 lg:px-6">
      <button type="button" aria-label="Abrir ou recolher menu principal" onClick={onMenu} className="btn-icon shrink-0 border-0">
        <Menu size={20} className="lg:hidden" aria-hidden="true" /><PanelLeftClose size={20} className="hidden lg:block" aria-hidden="true" />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg md:hidden" title={name}>{name}</span>
      <button type="button" onClick={() => setSearchOpen(true)} aria-label="Buscar páginas e ações" className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-bg-elev p-3 text-fg-mut md:w-[min(38vw,420px)] md:justify-start">
        <Search size={18} className="shrink-0" aria-hidden="true" /><span className="hidden min-w-0 flex-1 truncate text-left text-sm md:block">Buscar páginas e ações</span><kbd className="hidden rounded bg-bg-sub px-1.5 py-0.5 text-xs lg:block">{shortcut}</kbd>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <span title={name} className="mr-3 hidden max-w-[220px] truncate text-sm text-fg-mut desktop:block">{name}</span>
        <button type="button" onClick={openGuidedTour} aria-label="Abrir o passo a passo: como usar" title="Como usar" className="btn-icon border-0"><HelpCircle size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => setAppearance(dark ? 'light' : 'dark')} aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'} className="btn-icon hidden border-0 sm:inline-flex">{dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
        {canOpenNotifications && <button type="button" onClick={() => router.push(tenantRoute(tenant, '/dashboard/management/notifications'))} aria-label="Abrir comunicados e notificações" className="btn-icon border-0"><Bell size={18} aria-hidden="true" /></button>}
        <UserMenu />
      </div>
    </header>
    <CommandMenu open={searchOpen} onClose={() => setSearchOpen(false)} />
  </>;
}
