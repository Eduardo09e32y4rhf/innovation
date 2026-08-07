'use client';

import { Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function DashboardTopbar({ onMenu }: { onMenu?: () => void }) {
  const { user, company, logout } = useAuth();
  const router = useRouter();
  const tenant = company?.slug || company?.id || user?.companyId || 'empresa';

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
        <button
          onClick={() => { logout(); router.push('/login'); }}
          className="btn btn-outline border-zinc-200 bg-white shadow-sm"
        >
          <LogOut size={16} strokeWidth={2.5} />
          <span className="hidden sm:block">Sair</span>
        </button>
      </div>
    </header>
  );
}
