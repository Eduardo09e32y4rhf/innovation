'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@/app/hooks/use-data';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';
import { NotificationBell } from './notification-bell';

export function DashboardTopbar() {
  const { isAuthenticated, logout } = useAuth();
  const company = useQuery(() => api.companies.me(), []);

  return (
    <header className="dash-topbar flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm">
          {company.data?.logoUrl ? (
            <img src={company.data.logoUrl} alt="Logo da empresa" className="h-full w-full object-contain p-1.5" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500 to-cyan-600 text-[11px] font-black text-white">
              RH
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
            {company.data?.name || 'INNOVATION RH'}
          </p>
          <h1 className="truncate text-[18px] font-black leading-tight text-slate-950">
            {company.data?.legalName || 'Gestão de pessoas e jornada'}
          </h1>
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-500">
            <span>{company.data?.document || '12345678000199'}</span>
            <span>•</span>
            <span>{company.data?.address || 'São Paulo/SP'}</span>
            <span>•</span>
            <span>{company.data?.phone || '11999999'}</span>
            <span>•</span>
            <span>{company.data?.email || 'admin@innovationrh.com'}</span>
          </p>
        </div>
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
