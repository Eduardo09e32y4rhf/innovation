'use client';

import { useRef } from 'react';
import { LogOut, Search, CalendarClock, Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

export function DashboardTopbar() {
  const { user, signOut } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 sm:px-8">
      {/* Left section: Search */}
      <div className="flex flex-1 items-center gap-4">
        <div className="group relative hidden w-full max-w-md items-center lg:flex">
          <Search size={18} strokeWidth={2.5} className="absolute left-4 text-slate-400 transition-colors group-focus-within:text-[#8A05BE]" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Buscar por colaborador, folha..." 
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-black outline-none transition-all placeholder:text-slate-400 focus:border-[#8A05BE] focus:bg-white focus:ring-4 focus:ring-[#8A05BE]/10"
          />
          <div className="absolute right-4 hidden items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200 sm:flex">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-3">
        {user?.profile !== 'FUNCIONARIO' && (
          <Link href="/dashboard/escala" className="hidden lg:block">
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-black transition-colors hover:border-[#8A05BE] hover:text-[#8A05BE]">
              <CalendarClock size={18} strokeWidth={2.5} />
              <span>Plantões</span>
            </button>
          </Link>
        )}
        
        <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden lg:block" />

        <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:text-[#8A05BE]">
          <Bell size={20} strokeWidth={2.5} />
        </button>

        <button 
          onClick={signOut}
          className="flex h-11 items-center gap-2 rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-black"
        >
          <LogOut size={18} strokeWidth={2.5} />
          <span className="hidden sm:block">Sair</span>
        </button>
      </div>
    </header>
  );
}
