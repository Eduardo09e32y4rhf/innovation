'use client';

import { useRef } from 'react';
import { LogOut, Search, CalendarClock, Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function DashboardTopbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 sm:px-8">
      {/* Left section: Empty to maintain space */}
      <div className="flex flex-1 items-center gap-4">
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-3">

        <button 
          onClick={() => {
            const tenant = user?.companyId || 'empresa';
            router.push(`/${tenant}/dashboard/notifications`);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:text-[#8A05BE]"
        >
          <Bell size={20} strokeWidth={2.5} />
        </button>

        <button 
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="flex h-11 items-center gap-2 rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-black"
        >
          <LogOut size={18} strokeWidth={2.5} />
          <span className="hidden sm:block">Sair</span>
        </button>
      </div>
    </header>
  );
}
