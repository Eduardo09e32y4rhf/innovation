'use client';

import { EmptyState, LoadingState, ErrorState } from '@/app/components/data-states';
import { Download } from 'lucide-react';
import { useState } from 'react';

// Simulando API para o funcionário por enquanto, já que depende da sessão
export default function HoleritesPage() {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-black text-slate-900">Meus Holerites</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">Acesse seus recibos de pagamento mensais.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState message="Nenhum holerite disponível no momento." />
      </div>
    </div>
  );
}
