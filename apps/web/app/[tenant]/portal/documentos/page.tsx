'use client';
import { EmptyState } from '@/app/components/data-states';

export default function DocumentosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-black text-slate-900">Meus Documentos</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">Documentos admissionais e informes.</p>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState message="Nenhum documento disponível para download." />
      </div>
    </div>
  );
}
