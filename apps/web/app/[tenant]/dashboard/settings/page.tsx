'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LoadingState } from '@/app/components/data-states';
import { PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { resolveUserRole } from '@/app/lib/user-role';
import { CompanyFinanceSection } from './_components/company-finance-section';
import { PlatformPlansSection } from './_components/platform-plans-section';
import { AccessSection } from './_hub/access-section';
import { AccountSection } from './_hub/account-section';
import { CompanySection } from './_hub/company-section';
import { DataSection } from './_hub/data-section';
import { HolidaysSection } from './_hub/holidays-section';
import { SECTION_LABEL, SECTION_POLICY, type SettingsSection } from './_hub/types';

const ALIASES: Record<string, SettingsSection> = { seguranca: 'conta', geral: 'conta', rh: 'acessos', planos: 'planos' };

function Hub() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { tenant = '' } = useParams<{ tenant: string }>();

  if (!user) return <LoadingState label="Carregando configurações…" />;
  const role = resolveUserRole(user);
  const sections = SECTION_POLICY[role] ?? ['conta'];
  const raw = params.get('section') ?? '';
  const requested = (ALIASES[raw] ?? raw) as SettingsSection;
  const active = sections.includes(requested) ? requested : sections[0];
  const canEditCompany = ['DEV', 'ADMIN', 'RH'].includes(role);

  const go = (section: SettingsSection) => router.replace(`?section=${section}`, { scroll: false });

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 px-3 py-4 sm:px-5 lg:px-6">
      <PageHeader title="Configurações" subtitle={sections.length > 1 ? 'Sua conta e a empresa em um só lugar.' : 'Gerencie sua conta.'} />

      <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        {sections.length > 1 && (
          <nav aria-label="Seções de configuração" className="-mx-1 overflow-x-auto px-1 md:mx-0 md:px-0">
            <ul className="flex gap-1 md:flex-col">
              {sections.map((section) => (
                <li key={section}>
                  <button type="button" onClick={() => go(section)} aria-current={active === section ? 'page' : undefined}
                    className={`min-h-11 w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition ${active === section ? 'bg-purple-50 text-purple-700' : 'text-fg-sub hover:bg-bg-sub hover:text-fg'}`}>
                    {SECTION_LABEL[section]}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <main className={`min-w-0 ${sections.length > 1 ? '' : 'md:col-span-2'}`}>
          {active === 'conta' && <AccountSection />}
          {active === 'empresa' && <CompanySection canEdit={canEditCompany} />}
          {active === 'feriados' && <HolidaysSection />}
          {active === 'acessos' && <AccessSection tenant={tenant} />}
          {active === 'financeiro' && <CompanyFinanceSection tenant={tenant} />}
          {active === 'planos' && <PlatformPlansSection tenant={tenant} />}
          {active === 'dados' && <DataSection />}
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingState label="Carregando configurações…" />}>
      <Hub />
    </Suspense>
  );
}
