'use client';
import { EmptyState } from '@/app/components/data-states';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PontoPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant ?? '';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Meu Ponto</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Espelho de ponto e saldo de horas.</p>
        </div>
        <Link href={`/${tenant}/dashboard/time-track/clock-in`} className="crystal-button flex items-center gap-2">
          <Clock size={16} /> Bater Ponto Agora
        </Link>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Horas no mês</p>
          <p className="text-2xl font-black text-slate-900 mt-1">160h</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Saldo de Banco</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">+12h 30m</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Atrasos</p>
          <p className="text-2xl font-black text-slate-900 mt-1">0h 0m</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState message="Sem registros de ponto no mês atual." />
      </div>
    </div>
  );
}
