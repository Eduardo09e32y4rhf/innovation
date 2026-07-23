'use client';

import { Activity, AlertTriangle, Building2, Shield, Users } from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformStats as PlatformStatsData } from '@/app/lib/api';

const STAT_ITEMS: { label: string; key: keyof PlatformStatsData; icon: typeof Building2 }[] = [
  { label: 'Empresas', key: 'companies', icon: Building2 },
  { label: 'Ativas', key: 'activeCompanies', icon: Activity },
  { label: 'Usuários', key: 'users', icon: Users },
  { label: 'Funcionários', key: 'employees', icon: Users },
  { label: 'Suspensas', key: 'suspendedCompanies', icon: Shield },
  { label: 'Inadimplentes', key: 'pastDueCompanies', icon: AlertTriangle },
];

export function PlatformStats() {
  const stats = useQuery(() => api.platform.stats(), []);

  return (
    <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {STAT_ITEMS.map(({ label, key, icon: Icon }) => (
        <div key={label} className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <Icon size={16} strokeWidth={1.8} className="text-slate-300" />
          </div>
          <p className="text-[28px] font-bold leading-none text-slate-950">{stats.data?.[key] ?? '-'}</p>
        </div>
      ))}
    </section>
  );
}
