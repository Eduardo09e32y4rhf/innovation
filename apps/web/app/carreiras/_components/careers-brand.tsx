'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { companyInitials, type PublicCompany } from '../_lib/public-jobs';

export function CareersLogo({ company }: { company: PublicCompany }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-sub text-base font-semibold text-brand" aria-hidden="true">
    {company.logoUrl && failedUrl !== company.logoUrl
      ? <Image src={company.logoUrl} alt="" width={48} height={48} unoptimized className="h-full w-full object-contain p-1" onError={() => setFailedUrl(company.logoUrl ?? null)} />
      : companyInitials(company.name)}
  </span>;
}
export function CareersBrand({ company, companyId }: { company: PublicCompany; companyId: string; compact?: boolean }) {
  return <Link href={'/carreiras/' + encodeURIComponent(companyId)} className="inline-flex min-w-0 items-center gap-3" aria-label={'Vagas da ' + company.name}>
    <CareersLogo company={company} /><span className="min-w-0"><span className="block break-words text-base font-semibold text-fg">{company.name}</span>
      <span className="block text-xs text-fg-mut">Portal de carreiras</span></span>
  </Link>;
}
export function CareersFooter({ company }: { company: PublicCompany }) {
  return <footer className="border-t border-border bg-bg-elev"><div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-fg-mut sm:flex-row sm:items-center sm:justify-between">
    <p>{company.name === 'Innovation RH' ? 'Innovation RH · Carreiras' : 'Processo seletivo de ' + company.name}</p>
    <nav aria-label="Informações do portal" className="flex flex-wrap gap-2"><Link className="btn btn-ghost" href="/privacidade">Privacidade</Link><Link className="btn btn-ghost" href="/termos">Termos</Link><Link className="btn btn-ghost" href="/suporte">Suporte</Link></nav>
  </div></footer>;
}
