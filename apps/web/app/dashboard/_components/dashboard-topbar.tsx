'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

export function DashboardTopbar() {
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();
  const isSettings = pathname?.startsWith('/dashboard/settings');

  return (
    <header className="dash-topbar">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
          {isSettings ? 'Espaço de trabalho' : 'Painel principal'}
        </p>
        <h1 className="text-[18px] font-bold text-gray-900 leading-tight mt-0.5">
          {isSettings ? 'Configurações' : 'Operação da empresa'}
        </h1>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="search-box">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input placeholder="Buscar módulo, pessoa ou transação" />
        </div>
        {isSettings ? (
          <span className="btn-outline">Ambiente local</span>
        ) : isAuthenticated ? (
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
