'use client';

import Link from 'next/link';
import { Building2, Calculator, CreditCard, Headset, LayoutDashboard, Settings2, type LucideIcon } from 'lucide-react';
import { areaHref, type AreaKey, type PlatformArea } from '../_lib/platform-access';

const ICONS: Record<AreaKey, LucideIcon> = {
  'visao-geral': LayoutDashboard, clientes: Building2, financeiro: CreditCard, contabilidade: Calculator, suporte: Headset, sistema: Settings2,
};

/** Menu das áreas: coluna à esquerda no computador; faixa rolável no topo no celular. */
export function PlatformSidebar({ tenant, areas, current }: { tenant: string; areas: PlatformArea[]; current?: AreaKey }) {
  return (
    <nav aria-label="Áreas da Plataforma" className="border-b border-border bg-bg md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 md:sticky md:top-0 md:flex-col md:overflow-visible md:px-3 md:py-4">
        {areas.map((area) => {
          const Icon = ICONS[area.key];
          const active = current === area.key;
          return (
            <li key={area.key} className="shrink-0">
              <Link href={areaHref(tenant, area)} aria-current={active ? 'page' : undefined} title={area.description}
                className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${active ? 'bg-slate-900 text-white shadow' : 'text-fg-sub hover:bg-bg-sub hover:text-fg'}`}>
                <Icon size={17} aria-hidden="true" className="shrink-0" />
                <span className="whitespace-nowrap">{area.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
