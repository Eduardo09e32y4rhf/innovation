'use client';
import { EmptyState } from '@/app/components/data-states';
import { LayoutDashboard, CheckCircle, Ticket } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ClientesPage() {
  const params = useParams<{ tenant: string }>();

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">Portal do Cliente</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Acompanhe as entregas e SLAs do seu projeto.</p>
        </div>
        <button className="crystal-button">Abrir Chamado</button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Projetos Ativos</p>
          <p className="text-2xl font-black text-slate-900 mt-1">0</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Entregas no Prazo (SLA)</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">100%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Chamados Abertos</p>
          <p className="text-2xl font-black text-amber-600 mt-1">0</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState message="Nenhum ticket ou projeto ativo." />
      </div>
    </div>
  );
}
