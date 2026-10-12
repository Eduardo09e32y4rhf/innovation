'use client';

import { ArrowRight, Briefcase, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { employmentTypeLabel, getPublicJobsCatalog, workModeLabel, type PublicJob } from '../../carreiras/_lib/public-jobs';

/** Vitrine do portal de vagas na landing: mostra vagas abertas de verdade e leva para /carreiras. */
export function PortalVagas() {
  const [jobs, setJobs] = useState<PublicJob[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [term, setTerm] = useState('');

  useEffect(() => {
    let alive = true;
    getPublicJobsCatalog().then((result) => { if (alive) setJobs(result.jobs); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const shown = useMemo(() => {
    const text = term.trim().toLocaleLowerCase('pt-BR');
    return (jobs ?? []).filter((job) => !text || [job.title, job.location, job.department, job.company?.name].some((value) => value?.toLocaleLowerCase('pt-BR').includes(text))).slice(0, 6);
  }, [jobs, term]);

  return <div>
    <div className="mx-auto flex max-w-xl items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 backdrop-blur">
      <Search size={16} className="text-white/60" aria-hidden="true" />
      <input value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Buscar vagas" placeholder="Buscar por cargo, cidade ou empresa" className="min-h-12 w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none" />
    </div>

    {jobs === null && !failed && <p className="mt-8 text-center text-sm text-white/60">Carregando vagas…</p>}
    {failed && <p className="mt-8 text-center text-sm text-white/70">Não conseguimos listar as vagas agora. <Link href="/carreiras" className="font-semibold underline">Abra o portal de vagas</Link>.</p>}
    {jobs && shown.length === 0 && <p className="mt-8 text-center text-sm text-white/70">{jobs.length === 0 ? 'Nenhuma vaga aberta no momento. Volte em breve.' : 'Nenhuma vaga encontrada para essa busca.'}</p>}

    {shown.length > 0 && <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((job) => {
        const meta = [job.location, workModeLabel(job.workMode), job.employmentType ? employmentTypeLabel(job.employmentType) : null].filter(Boolean);
        return <li key={job.id}>
          <Link href={`/carreiras/${job.companyId}/${job.id}`} className="lp-card flex h-full flex-col rounded-2xl border border-white/15 bg-white/5 p-5 transition hover:border-white/40">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600"><Briefcase size={18} aria-hidden="true" /></span>
            <h3 className="mt-4 text-lg font-semibold leading-snug">{job.title}</h3>
            {job.company?.name && <p className="mt-0.5 text-sm text-amber-200">{job.company.name}</p>}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/65">{job.location && <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{job.location}</span>}{meta.filter((item) => item !== job.location).map((item) => <span key={String(item)}>{item}</span>)}</p>
            <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-white">Ver vaga e candidatar <ArrowRight size={14} aria-hidden="true" /></span>
          </Link>
        </li>;
      })}
    </ul>}

    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link href="/carreiras" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-[var(--color-brand-800)] transition hover:-translate-y-0.5">Ver todas as vagas <ArrowRight size={16} aria-hidden="true" /></Link>
      <Link href="/cadastro" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-7 text-sm font-semibold hover:bg-white/10">Sou empresa: quero publicar vagas</Link>
    </div>
  </div>;
}
