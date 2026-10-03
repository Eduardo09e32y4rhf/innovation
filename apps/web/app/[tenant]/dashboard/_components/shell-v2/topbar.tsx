'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Settings2, Sun } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { cn } from '@/app/lib/cn';

export function TopbarV2({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const params = useParams();
  const { user, company, logout } = useAuth();
  const tenant = String(params?.tenant ?? company?.slug ?? company?.id ?? user?.companyId ?? 'empresa');
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}
    setDark(isDark);
  };

  const initials = (user?.name || user?.email || 'U')
    .split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-30 mb-4 pt-3">
      <div className="glass rounded-v2-2xl flex h-14 items-center gap-2 px-2 sm:px-3 shadow-v2-sm">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={onMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-v2-md text-fg-mut hover:bg-bg-sub hover:text-fg lg:hidden"
        >
          <Menu size={18} />
        </button>

        <button
          type="button"
          onClick={() => router.push(`/${tenant}/dashboard/search`)}
          className="hidden md:flex h-10 flex-1 max-w-md items-center gap-2 rounded-v2-md border border-border bg-bg-elev px-3 text-left text-[13px] font-medium text-fg-sub transition-colors hover:border-border-strong"
        >
          <Search size={15} />
          <span className="truncate">Buscar pessoas, escalas, fÃ©rias...</span>
          <kbd className="ml-auto hidden lg:inline rounded bg-bg-sub px-1.5 py-0.5 text-[10px] font-bold text-fg-mut">
            âŒ˜K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-v2-md text-fg-mut hover:bg-bg-sub hover:text-fg"
            aria-label="Alternar tema"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/${tenant}/dashboard/notifications`)}
            className="relative flex h-10 w-10 items-center justify-center rounded-v2-md text-fg-mut hover:bg-bg-sub hover:text-fg"
            aria-label="NotificaÃ§Ãµes"
          >
            <Bell size={16} />
          </button>

          {company?.name && (
            <span className="hidden lg:inline-flex chip chip-brand max-w-[200px] truncate">
              {company.name}
            </span>
          )}

          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex h-10 items-center gap-2 rounded-v2-md border border-border bg-bg-elev px-1.5 transition-colors hover:border-border-strong"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-v2-sm bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-black text-white">
                {initials}
              </span>
              <ChevronDown size={14} className="hidden text-fg-sub sm:block" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div
                  role="menu"
                  className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-v2-lg border border-border bg-bg-elev p-1 shadow-v2-xl animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="border-b border-border/60 px-3 py-3">
                    <p className="truncate text-sm font-black text-fg">{user?.name || 'UsuÃ¡rio'}</p>
                    <p className="truncate text-xs text-fg-mut">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      router.push(`/${tenant}/dashboard/settings`);
                    }}
                    className="flex w-full items-center gap-2 rounded-v2-md px-3 py-2.5 text-left text-[13px] font-bold text-fg-mut hover:bg-bg-sub hover:text-fg"
                  >
                    <Settings2 size={15} /> ConfiguraÃ§Ãµes
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      router.push('/login');
                    }}
                    className="flex w-full items-center gap-2 rounded-v2-md px-3 py-2.5 text-left text-[13px] font-bold text-danger hover:bg-danger/10"
                  >
                    <LogOut size={15} /> Sair
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