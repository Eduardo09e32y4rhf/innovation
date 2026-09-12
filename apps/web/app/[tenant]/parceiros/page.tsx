'use client';
import { EmptyState } from '@/app/components/data-states';
import { FileText, DollarSign, MessageSquare } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ParceirosPage() {
  const params = useParams<{ tenant: string }>();

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">Portal do Parceiro</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Acompanhe suas notas fiscais e recebimentos.</p>
        </div>
        <button className="crystal-button">Enviar Nota Fiscal</button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Receber neste mês</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">R$ 0,00</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">NF em Análise</p>
          <p className="text-2xl font-black text-amber-600 mt-1">0</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Contratos Ativos</p>
          <p className="text-2xl font-black text-slate-900 mt-1">0</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState message="Nenhuma nota fiscal ou pagamento recente." />
      </div>
    </div>
  );
}
