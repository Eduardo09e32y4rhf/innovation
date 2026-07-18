'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { NotificationBell } from './notification-bell';

export function DashboardTopbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="dash-topbar flex-col items-start gap-3 sm:flex-row sm:items-center relative z-50">
      <div className="min-w-0">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#8a8a91]">
          Innovation RH System
        </p>
        <h1 className="mt-[3px] text-[20px] font-bold tracking-[-0.03em] text-[#0b0b0c]">
          Gestão de pessoas e jornada
        </h1>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
        <NotificationBell />
        {isAuthenticated ? (
          <button type="button" onClick={logout} className="btn-outline h-10 min-w-[92px] px-4 text-xs">
            <LogOut size={14} />
            Sair
          </button>
        ) : (
          <Link href="/login" className="btn-outline h-10 min-w-[92px] px-4 text-xs">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
