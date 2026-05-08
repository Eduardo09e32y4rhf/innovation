'use client';

import { Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function DashboardTopbar() {
  const pathname = usePathname();
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
        <button className="btn-outline">
          {isSettings ? 'Ambiente local' : 'Entrar'}
        </button>
      </div>
    </header>
  );
}
