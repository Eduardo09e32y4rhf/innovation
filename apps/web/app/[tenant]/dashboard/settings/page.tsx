'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { resolveUserRole } from '@/app/lib/user-role';
import { CompanySection } from './_hub/company-section';
import { DataSection } from './_hub/data-section';
import { HolidaysSection } from './_hub/holidays-section';
import { AccountSection } from './_hub/profile-section';
import { SecuritySection } from './_hub/security-section';
import { cardClass, ROLE_LABELS, SECTION_GROUPS, SECTION_META, SECTION_POLICY, type SettingsSection } from './_hub/types';

const ALIASES: Record<string, SettingsSection> = { security: 'seguranca', geral: 'conta', rh: 'acessos' };

function Hub() {
  const { user, company } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { tenant = '' } = useParams<{ tenant: string }>();

  if (!user) return <LoadingState label="Carregando configurações…" />;
  const role = resolveUserRole(user);
  const allowed = SECTION_POLICY[role] ?? ['conta', 'seguranca'];
  const raw = params.get('section') ?? '';
  const requested = (ALIASES[raw] ?? raw) as SettingsSection;
  const active = allowed.includes(requested) ? requested : allowed[0];
  const canEditCompany = ['DEV', 'ADMIN', 'RH'].includes(role);
  const go = (section: SettingsSection) => router.replace(`?section=${section}`, { scroll: false });
  const meta = SECTION_META[active];
  const initials = (user.name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-3 py-4 sm:px-5 lg:px-6">
      <header className="flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-800 p-5 text-white shadow-lg sm:p-7">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-black">{initials}</span>
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight">Configurações</h1>
          <p className="truncate text-sm text-white/80">{user.name} · {ROLE_LABELS[role] ?? role}{company?.name ? ` · ${company.name}` : ''}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <nav aria-label="Seções de configuração" className="space-y-4">
          {SECTION_GROUPS.map((group) => {
            const items = group.items.filter((item) => allowed.includes(item));
            if (!items.length) return null;
            return (
              <div key={group.title}>
                <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-widest text-fg-mut">{group.title}</p>
                <ul className="flex gap-1.5 overflow-x-auto lg:flex-col">
                  {items.map((item) => {
                    const Icon = SECTION_META[item].icon;
                    const on = active === item;
                    return (
                      <li key={item} className="shrink-0">
                        <button type="button" onClick={() => go(item)} aria-current={on ? 'page' : undefined}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${on ? 'bg-purple-600 text-white shadow' : 'text-fg-sub hover:bg-bg-sub hover:text-fg'}`}>
                          <Icon size={17} aria-hidden="true" /> <span className="whitespace-nowrap">{SECTION_META[item].label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <main className="min-w-0 space-y-4">
          <div><h2 className="text-xl font-bold text-fg">{meta.label}</h2><p className="text-sm text-fg-sub">{meta.hint}</p></div>
          {active === 'conta' && <AccountSection />}
          {active === 'seguranca' && <SecuritySection />}
          {active === 'empresa' && <CompanySection canEdit={canEditCompany} />}
          {active === 'feriados' && <HolidaysSection />}
          {active === 'acessos' && (
            <section className={`${cardClass} space-y-3`}>
              <p className="text-sm text-fg-sub">Criar acessos, atrelar a funcionários, mudar a visão, bloquear, cancelar ou excluir usuários, gerar senha provisória e ver o histórico de cada pessoa ficam na tela de Usuários.</p>
              <Link href={`/${tenant}/dashboard/users`} className="btn btn-primary btn-md inline-flex">Abrir Usuários <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </section>
          )}
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
