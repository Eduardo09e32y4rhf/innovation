'use client';

import { Activity, AlertTriangle, Building2, Shield, Users } from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';

export function PlatformStats() {
  const stats = useQuery(() => api.platform.stats(), []);

  return (
    <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {[
        { label: 'Empresas', value: stats.data?.companies, icon: Building2 },
        { label: 'Ativas', value: stats.data?.activeCompanies, icon: Activity },
        { label: 'Usuários', value: stats.data?.users, icon: Users },
        { label: 'Funcionários', value: stats.data?.employees, icon: Users },
        { label: 'Suspensas', value: stats.data?.suspendedCompanies, icon: Shield },
        { label: 'Inadimplentes', value: stats.data?.pastDueCompanies, icon: AlertTriangle },
      ].map(({ label, value, icon: Icon }) => (
        <div key={label} className="ops-card rounded-[8px] border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <div className="icon-chip icon-chip-teal"><Icon size={15} strokeWidth={1.8} /></div>
          </div>
          <p className="text-2xl font-black text-slate-950">{value ?? '-'}</p>
        </div>
      ))}
    </section>
  );
}
