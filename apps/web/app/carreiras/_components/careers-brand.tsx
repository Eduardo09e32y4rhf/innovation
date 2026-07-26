import Link from 'next/link';
import Image from 'next/image';
import { Briefcase } from 'lucide-react';
import {
  companyInitials,
  safeAccentColor,
  type PublicCompany,
} from '../_lib/public-jobs';

type CareersBrandProps = {
  company: PublicCompany;
  companyId: string;
  compact?: boolean;
};

export function CareersBrand({ company, companyId, compact = false }: CareersBrandProps) {
  const accent = safeAccentColor(company.primaryColor);

  return (
    <Link
      href={`/carreiras/${encodeURIComponent(companyId)}`}
      className="group inline-flex min-w-0 items-center gap-3"
      aria-label={`Vagas da ${company.name}`}
    >
      <span
        className={`${compact ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl'} flex shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-white text-sm font-black text-slate-950 shadow-lg`}
      >
        {company.logoUrl ? (
          <Image
            src={company.logoUrl}
            alt={`Logo da ${company.name}`}
            width={48}
            height={48}
            unoptimized
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <span style={{ color: accent }}>
            {companyInitials(company.name) || <Briefcase size={20} />}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black tracking-tight text-white sm:text-base">
          {company.name}
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Portal de carreiras
        </span>
      </span>
    </Link>
  );
}

export function CareersFooter({ company }: { company: PublicCompany }) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          Processo seletivo de <strong className="text-slate-700">{company.name}</strong>
        </p>
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Candidatura protegida e tratada com confidencialidade
        </p>
      </div>
    </footer>
  );
}
