'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { NotificationBell } from './notification-bell';

export function DashboardTopbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex min-h-[76px] items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-8">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Innovation RH System</span>
        <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Gestão de pessoas e jornada</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <label className="hidden h-10 w-64 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 transition-all focus-within:border-teal-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-500/10 sm:flex">
          <span className="text-slate-400">⌕</span>
          <input 
            placeholder="Buscar no sistema..." 
            className="w-full bg-transparent text-[13px] font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
          />
        </label>
        
        <NotificationBell />
        
        {isAuthenticated ? (
          <button 
            type="button" 
            onClick={logout} 
            className="flex h-10 items-center justify-center rounded-full bg-rose-600 px-5 text-[13px] font-bold text-white shadow-sm transition-all duration-200 hover:bg-rose-700 active:scale-95"
          >
            Sair
          </button>
        ) : (
          <Link 
            href="/login" 
            className="flex h-10 items-center justify-center rounded-full bg-slate-900 px-5 text-[13px] font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-95"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
