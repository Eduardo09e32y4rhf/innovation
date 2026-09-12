'use client';

import { useState } from 'react';
import { EmptyState } from '@/app/components/data-states';

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <header className="page-header items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Gestão</p>
          <h1 className="text-2xl font-black text-slate-950">Onboarding Digital</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Acompanhe a admissão e integração de novos colaboradores.</p>
        </div>
        <button type="button" className="crystal-button">Novo Onboarding</button>
      </header>
      
      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState message="Nenhum processo de onboarding ativo." />
      </div>
    </div>
  );
}
