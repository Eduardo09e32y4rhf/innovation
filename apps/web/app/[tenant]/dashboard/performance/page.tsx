'use client';
import { EmptyState } from '@/app/components/data-states';
import { Target, Star, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<'okr' | 'reviews'>('okr');

  return (
    <div className="space-y-6">
      <header className="page-header items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Desempenho</p>
          <h1 className="text-2xl font-black text-slate-950">Avaliação e OKRs</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Acompanhe as metas e avaliações de desempenho do seu time.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-outline">Nova Avaliação</button>
          <button type="button" className="crystal-button">Novo OKR</button>
        </div>
      </header>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('okr')}
          className={`pb-3 text-sm font-black transition-colors ${activeTab === 'okr' ? 'border-b-2 border-violet-600 text-violet-700' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <span className="flex items-center gap-2"><Target size={16} /> Objetivos e OKRs</span>
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-sm font-black transition-colors ${activeTab === 'reviews' ? 'border-b-2 border-violet-600 text-violet-700' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <span className="flex items-center gap-2"><Star size={16} /> Avaliações 360º</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">OKRs Ativos</p>
          <p className="text-2xl font-black text-slate-900 mt-1">0</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Avaliações Pendentes</p>
          <p className="text-2xl font-black text-amber-600 mt-1">0</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold text-slate-500 uppercase">Colaboradores Avaliados</p>
          <p className="text-2xl font-black text-slate-900 mt-1">0%</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {activeTab === 'okr' ? (
          <EmptyState message="Nenhum OKR definido para este ciclo." />
        ) : (
          <EmptyState message="Nenhum ciclo de avaliação ativo." />
        )}
      </div>
    </div>
  );
}
