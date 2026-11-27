'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { PortalLogo } from '@/app/carreiras/_components/portal-chrome';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { useI18n } from '@/app/contexts/I18nContext';

const NAV = [
  { href: '/carreira', label: 'Painel' },
  { href: '/carreiras/vagas', label: 'Vagas' },
  { href: '/carreira/perfil', label: 'Meu perfil' },
];

export function CandidateHeader({ signOut }: { signOut: () => Promise<void> }) {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
        <header className="border-b border-[#e9e5f0] bg-white">
          <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex sm:min-h-[80px] sm:justify-between sm:gap-4 sm:px-9">
            <PortalLogo />
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <LanguageSwitcher compactOnMobile />
              <button type="button" onClick={() => void signOut()} className="inline-flex min-h-11 w-11 items-center justify-center rounded-[10px] border border-[#d5cceb] hover:bg-[#f1ecfb] sm:w-auto sm:gap-2 sm:px-4 sm:text-sm sm:font-semibold" aria-label={t('Sair')} title={t('Sair')}>
                <LogOut aria-hidden="true" size={17} />
                <span className="sr-only sm:not-sr-only">{t('Sair')}</span>
              </button>
            </div>
            <nav aria-label={t('Área do candidato')} className="col-span-2 flex min-w-0 gap-1.5 overflow-x-auto border-t border-[#e9e5f0] pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:col-span-1 sm:border-0 sm:pt-0">
                {NAV.map((item) => {
                  const active = pathname === item.href;
                  return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-[10px] px-3 text-sm font-semibold sm:min-h-11 sm:px-4 ${active ? 'bg-[#f0eafa] text-[#5b29be]' : 'hover:bg-[#f1ecfb]'}`}>{t(item.label)}</Link>;
                })}
            </nav>
          </div>
        </header>
  );
}
