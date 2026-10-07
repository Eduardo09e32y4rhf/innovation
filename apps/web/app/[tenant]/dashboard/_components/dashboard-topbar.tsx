'use client';

import { useState } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings2,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { cn } from '@/app/lib/cn';

export function DashboardTopbar({
  onMenu,
}: {
  onMenu?: () => void;
}) {
  const router = useRouter();
  const params = useParams();
  const { user, company, logout } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);

  const tenant = String(
    params?.tenant ||
      company?.slug ||
      company?.id ||
      user?.companyId ||
      'empresa',
  );

  const initials = (user?.name || user?.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  function goTo(path: string) {
    router.push(`/${tenant}${path}`);
    setProfileOpen(false);
  }

  async function handleLogout() {
    if (await logout()) router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 mb-4 pt-3">
      <div className="glass flex h-[64px] items-center gap-2 rounded-v2-2xl px-2 shadow-v2-sm sm:px-3">
        {/* Botão mobile */}
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={onMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-v2-md border border-border bg-bg-elev text-fg-mut transition hover:border-brand-300 hover:text-brand-600 lg:hidden"
        >
          <Menu size={19} />
        </button>

        {/* Busca */}
        <div className="relative w-full max-w-[422px]">
          <Search
            size={16}
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-sub"
          />

          <input
            type="search"
            aria-label="Buscar"
            placeholder="Buscar pessoas, escalas, férias..."
            className="input-v2 h-10 !pl-10 !text-[12px] !font-semibold !bg-bg-sub/60 focus:!bg-bg-elev"
          />
        </div>

        {/* Ações da direita */}
        <div className="ml-auto flex items-center gap-2">
          {/* Notificações */}
          <button
            type="button"
            aria-label="Notificações"
            onClick={() => goTo('/dashboard/notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-v2-md border border-border bg-bg-elev text-fg-mut transition hover:border-brand-300 hover:text-brand-600"
          >
            <Bell size={18} strokeWidth={1.8} />
          </button>

          {/* Perfil */}
          <div className="relative">
            <button
              type="button"
              aria-label="Abrir perfil"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((v) => !v)}
              className="flex h-10 items-center gap-2 rounded-v2-md border border-border bg-bg-elev px-2 transition hover:border-brand-300"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-v2-sm bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-black text-white">
                {initials}
              </span>

              <ChevronDown
                size={15}
                className={cn(
                  'text-fg-sub transition-transform duration-200',
                  profileOpen && 'rotate-180',
                )}
              />
            </button>

            {profileOpen && (
              <>
                <button
                  type="button"
                  aria-label="Fechar menu"
                  className="fixed inset-0 z-40 h-full w-full cursor-default"
                  onClick={() => setProfileOpen(false)}
                />

                <div
                  role="menu"
                  className={cn(
                    'absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-v2-lg',
                    'border border-border bg-bg-elev p-1.5 shadow-v2-xl',
                    'animate-in fade-in slide-in-from-top-2 duration-150',
                  )}
                >
                  <div className="border-b border-border/60 px-3 py-3">
                    <p className="truncate text-sm font-black text-fg">
                      {user?.name || 'Usuário'}
                    </p>
                    <p className="truncate text-xs text-fg-mut">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => goTo('/dashboard/settings')}
                    className="flex w-full items-center gap-2 rounded-v2-md px-3 py-2.5 text-left text-[13px] font-bold text-fg-mut transition hover:bg-brand-500/8 hover:text-brand-700"
                  >
                    <Settings2 size={16} />
                    Configurações
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-v2-md px-3 py-2.5 text-left text-[13px] font-bold text-danger transition hover:bg-danger/10"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
