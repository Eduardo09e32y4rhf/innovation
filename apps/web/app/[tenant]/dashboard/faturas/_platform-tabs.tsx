'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { AssinaturasView } from './_assinaturas';
import { CuponsView } from './_cupons';
import { PlanosView } from './_planos';
import PlatformInvoicesView from './_platform-view';
import { FATURAS_TAB_LABEL, resolveFaturasTab, visibleFaturasTabs } from './_tabs';

/** Visao da plataforma: faturas, assinaturas, planos e cupons na mesma tela (a aba vem da URL: ?aba=). */
export default function PlatformFaturas() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const tabs = visibleFaturasTabs(role);
  const tab = resolveFaturasTab(params.get('aba'), role);

  function open(next: string) {
    const query = new URLSearchParams(params.toString());
    query.set('aba', next);
    router.replace(`?${query.toString()}`, { scroll: false });
  }

  return (
    <div className="min-w-0">
      {tabs.length > 1 && (
        <nav aria-label="Seções de Faturas" className="-mx-1 overflow-x-auto px-3 pt-4 sm:px-5 lg:px-6">
          <ul className="flex min-w-max gap-1.5">
            {tabs.map((item) => (
              <li key={item}>
                <button type="button" aria-current={tab === item ? 'page' : undefined} onClick={() => open(item)}
                  className={`min-h-11 rounded-full px-4 text-sm font-bold transition ${tab === item ? 'bg-slate-900 text-white shadow' : 'border border-border text-fg-sub hover:bg-bg-sub hover:text-fg'}`}>
                  {FATURAS_TAB_LABEL[item]}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {tab === 'faturas' && <PlatformInvoicesView />}
      {tab === 'assinaturas' && <AssinaturasView params={{ tenant }} />}
      {tab === 'planos' && <PlanosView params={{ tenant }} />}
      {tab === 'cupons' && <CuponsView />}
    </div>
  );
}