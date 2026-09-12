'use client';
import { EmptyState } from '@/app/components/data-states';

export default function FeriasPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-black text-slate-900">Minhas Férias</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">Acompanhe seu saldo e faça solicitações.</p>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState message="Sem informações de férias." />
      </div>
    </div>
  );
}
