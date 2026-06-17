'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

export function DashboardTopbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="dash-topbar flex-col items-start gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
          Innovation RH Connect
        </p>
        <h1 className="mt-0.5 text-[18px] font-bold leading-tight text-gray-900">
          Operacao de RH, ponto e WhatsApp
        </h1>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2.5">
        <div className="search-box w-full sm:w-[250px]">
          <Search size={14} className="shrink-0 text-gray-400" />
          <input placeholder="Buscar pessoa ou modulo" />
        </div>
        {isAuthenticated ? (
          <button type="button" onClick={logout} className="btn-outline">
            Sair
          </button>
        ) : (
          <Link href="/login" className="btn-outline">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
