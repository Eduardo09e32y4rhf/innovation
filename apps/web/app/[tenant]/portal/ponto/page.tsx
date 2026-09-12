'use client';
import { EmptyState } from '@/app/components/data-states';

export default function PontoPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-black text-slate-900">Meu Ponto</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">Espelho de ponto e saldo de horas.</p>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState message="Sem registros de ponto no mês atual." />
      </div>
    </div>
  );
}
