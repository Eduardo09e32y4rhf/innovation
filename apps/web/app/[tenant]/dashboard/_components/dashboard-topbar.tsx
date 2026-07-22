'use client';

import { Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function DashboardTopbar({ onMenu }: { onMenu?: () => void }) {
  const { user, company, logout } = useAuth();
  const router = useRouter();
  const tenant = company?.slug || company?.id || user?.companyId || 'empresa';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:h-20 sm:px-8">
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={onMenu}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
      >
        <Menu size={22} />
      </button>
      <div className="hidden flex-1 lg:block" />
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          aria-label="Notificações"
          onClick={() => router.push(`/${tenant}/dashboard/notifications`)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:text-[#8A05BE]"
        >
          <Bell size={20} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => { logout(); router.push('/login'); }}
          className="flex h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-black sm:px-4"
        >
          <LogOut size={18} strokeWidth={2.5} />
          <span className="hidden sm:block">Sair</span>
        </button>
      </div>
    </header>
  );
}
