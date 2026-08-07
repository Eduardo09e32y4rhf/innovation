'use client';

import { Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

import { useState } from 'react';

export function DashboardTopbar({ onMenu }: { onMenu?: () => void }) {
  const { user, company, logout } = useAuth();
  const router = useRouter();
  const tenant = company?.slug || company?.id || user?.companyId || 'empresa';
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between px-4 sm:h-20 sm:px-8 bg-transparent">
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={onMenu}
        className="btn-icon lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div className="hidden flex-1 lg:block" />
      <div className="flex items-center gap-3">
        <button
          aria-label="Notificações"
          onClick={() => router.push(`/${tenant}/dashboard/notifications`)}
          className="btn-icon bg-white text-zinc-500 hover:text-[var(--color-brand)] border-zinc-200"
        >
          <Bell size={20} strokeWidth={2.5} />
        </button>
        
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-800)] text-sm font-black text-white shadow-sm ring-2 ring-white hover:ring-[var(--color-brand-200)] transition-all"
          >
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-12 z-50 w-48 rounded-[var(--radius-md)] border border-zinc-200 bg-white shadow-[var(--shadow-lg)] py-1 overflow-hidden">
                <div className="px-4 py-2 border-b border-zinc-100 mb-1">
                  <p className="text-sm font-bold text-zinc-900 truncate">{user?.name || 'Usuário'}</p>
                  <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); router.push(`/${tenant}/dashboard/settings`); }}
                  className="w-full text-left px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-[var(--color-brand)] transition-colors"
                >
                  Configurações
                </button>
                <button
                  onClick={() => { logout(); router.push('/login'); }}
                  className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-between"
                >
                  Sair
                  <LogOut size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
