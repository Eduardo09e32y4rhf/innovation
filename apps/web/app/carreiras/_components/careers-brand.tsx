import Link from 'next/link';
import Image from 'next/image';
import { Briefcase } from 'lucide-react';
import { companyInitials, safeAccentColor, type PublicCompany } from '../_lib/public-jobs';

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
        className={`relative shrink-0 overflow-hidden border border-white/15 shadow-[0_12px_30px_-14px_rgba(15,23,42,.8)] ${
          compact ? 'h-12 w-12 rounded-2xl' : 'h-14 w-14 rounded-[18px]'
        } bg-slate-950`}
      >
        <span
          className="absolute inset-0 opacity-80"
          style={{ background: `linear-gradient(135deg, ${accent}25, #020617)` }}
        />
        {company.logoUrl ? (
          <Image
            src={company.logoUrl}
            alt={`Logo da ${company.name}`}
            width={56}
            height={56}
            unoptimized
            className="relative z-10 h-full w-full object-contain p-2"
          />
        ) : (
          <span
            className="relative z-10 flex h-full w-full items-center justify-center text-base font-black"
            style={{ color: accent }}
          >
            {companyInitials(company.name) || <Briefcase size={20} />}
          </span>
        )}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-sm font-black tracking-tight text-white sm:text-base">
          {company.name}
        </span>
        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
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
