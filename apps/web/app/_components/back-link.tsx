'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const ORIGINS: Record<string, { href: string; label: string }> = {
  carreiras: { href: '/carreiras', label: 'Voltar para as vagas' },
};

function Inner({ fallbackHref, fallbackLabel, className }: { fallbackHref: string; fallbackLabel: string; className?: string }) {
  const origin = ORIGINS[useSearchParams().get('de') ?? ''];
  const target = origin ?? { href: fallbackHref, label: fallbackLabel };
  return <Link href={target.href} className={className}><ArrowLeft size={16} /> {target.label}</Link>;
}

/** Link "voltar" que respeita de onde a pessoa veio (?de=carreiras volta ao portal de vagas, não à landing). */
export function BackLink(props: { fallbackHref: string; fallbackLabel: string; className?: string }) {
  return <Suspense fallback={<Link href={props.fallbackHref} className={props.className}><ArrowLeft size={16} /> {props.fallbackLabel}</Link>}><Inner {...props} /></Suspense>;
}
