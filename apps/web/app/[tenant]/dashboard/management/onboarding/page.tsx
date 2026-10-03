'use client';

import { UserRoundPlus } from 'lucide-react';
import { EmptyState } from '@/app/components/data-states';

export default function OnboardingPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="card-v2 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-600">Integração</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-fg">Onboarding digital</h2>
          <p className="mt-1 text-sm font-medium text-fg-mut">Acompanhe a admissão e a integração de novos colaboradores.</p>
        </div>
        <button type="button" className="btn-v2-primary shrink-0">
          <UserRoundPlus size={15} /> Novo onboarding
        </button>
      </header>

      <div className="card-v2 min-h-[260px] p-5">
        <EmptyState message="Nenhum processo de onboarding ativo." />
      </div>
    </div>
  );
}
