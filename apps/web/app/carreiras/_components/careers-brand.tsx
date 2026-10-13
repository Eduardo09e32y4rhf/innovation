'use client';

import Link from 'next/link';
import { CompanyLogo } from '@/app/_components/company-logo';
import type { PublicCompany } from '../_lib/public-jobs';

export function CareersLogo({ company, height = 44 }: { company: PublicCompany; height?: number }) {
  return <CompanyLogo name={company.name} logoUrl={company.logoUrl} height={height} />;
}
export function CareersBrand({ company, companyId }: { company: PublicCompany; companyId: string; compact?: boolean }) {
  return <Link href={'/carreiras/' + encodeURIComponent(companyId)} className="inline-flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" aria-label={'Vagas da ' + company.name}>
    <CareersLogo company={company} height={40} /><span className="min-w-0"><span className="block break-words text-sm font-semibold leading-tight text-fg sm:text-base">{company.name}</span>
      <span className="block text-xs text-fg-mut">Portal de carreiras</span></span>
  </Link>;
}export function CareersFooter({ company }: { company: PublicCompany }) {
  return <footer className="border-t border-border bg-bg-elev"><div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-fg-mut sm:flex-row sm:items-center sm:justify-between">
    <p>{company.name === 'Innovation RH' ? 'Innovation RH · Carreiras' : 'Processo seletivo de ' + company.name}</p>
    <nav aria-label="Informações do portal" className="flex flex-wrap gap-2"><Link className="btn btn-ghost" href="/privacidade?de=carreiras">Privacidade</Link><Link className="btn btn-ghost" href="/termos?de=carreiras">Termos</Link><Link className="btn btn-ghost" href="/suporte?de=carreiras">Suporte</Link></nav>
  </div></footer>;
}
