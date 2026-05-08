'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, FileText, ArrowLeftRight, Calculator } from 'lucide-react';

const tabs = [
  { href: '/dashboard/finance/overview',    label: 'Visão Geral',  icon: LayoutDashboard },
  { href: '/dashboard/finance/bank',        label: 'Banco / DDA',  icon: Building2       },
  { href: '/dashboard/finance/boletos',     label: 'Boletos',      icon: FileText        },
  { href: '/dashboard/finance/lancamentos', label: 'Lançamentos',  icon: ArrowLeftRight  },
  { href: '/dashboard/finance/propostas',   label: 'Propostas',    icon: Calculator      },
];

export default function FinanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* ─── Header ─────────────────────────────── */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400 mb-1.5">Módulo</p>
        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight leading-none">Financeiro</h1>
        <p className="text-[13px] text-gray-500 mt-2">
          Gestão completa: banco, boletos, lançamentos e propostas.
        </p>
      </div>

      {/* ─── Tab bar ────────────────────────────── */}
      <div className="flex items-center gap-0.5 border-b-2 border-gray-100 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = pathname === tab.href
            || (pathname === '/dashboard/finance/pricing' && tab.href.includes('overview'));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2.5 px-5 py-3.5 text-[13.5px] font-semibold border-b-2 transition-all -mb-0.5 ${
                active
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
