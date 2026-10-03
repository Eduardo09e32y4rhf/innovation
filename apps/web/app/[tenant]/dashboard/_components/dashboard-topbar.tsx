'use client';

import { Bell, ChevronDown, LogOut, Menu, Search, Settings2 } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export function DashboardTopbar({ onMenu }: { onMenu?: () => void }) {
  const { user, company, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tenant = String(params?.tenant ?? company?.slug ?? company?.id ?? user?.companyId ?? 'empresa');
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = (user?.name || user?.email || 'U').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 bg-[var(--background)]/85 px-4 backdrop-blur-xl sm:px-8">
      <button type="button" aria-label="Abrir menu" onClick={onMenu} className="btn-icon border-0 bg-white shadow-sm lg:hidden"><Menu size={20} /></button>
      <div className="relative hidden max-w-xl flex-1 md:block">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input aria-label="Buscar" placeholder="Buscar pessoas, escalas, férias..." className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button aria-label="Notificações" onClick={() => router.push(`/${tenant}/dashboard/notifications`)} className="btn-icon border-0 bg-white text-slate-500 shadow-sm hover:text-violet-600 dark:bg-white/5 dark:text-slate-300"><Bell size={19} /></button>
        <div className="relative">
          <button type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)} className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 shadow-sm dark:border-white/10 dark:bg-white/5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-black text-white">{initials}</span><ChevronDown size={15} className="hidden text-slate-400 sm:block" />
          </button>
          {profileOpen && <><div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} /><div role="menu" className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-white/10 dark:bg-slate-900"><div className="border-b border-slate-100 px-3 py-3 dark:border-white/10"><p className="truncate text-sm font-black text-slate-900 dark:text-white">{user?.name || 'Usuário'}</p><p className="truncate text-xs text-slate-500">{user?.email}</p></div><button onClick={() => { setProfileOpen(false); router.push(`/${tenant}/dashboard/settings`); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-white/10"><Settings2 size={15} /> Configurações</button><button onClick={() => { logout(); router.push('/login'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"><LogOut size={15} /> Sair</button></div></>}
        </div>
      </div>
    </header>
  );
}

