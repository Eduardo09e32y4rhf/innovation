'use client';

import { ArrowRight, ArrowUpRight, Briefcase, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { employmentTypeLabel, getPublicJobsCatalog, workModeLabel, type PublicJob } from '../../carreiras/_lib/public-jobs';

/**
 * Faixa clara "Procurando emprego?" no fim da landing: contrasta com o resto (escuro, voltado a quem paga)
 * e leva o candidato ao portal. Mostra vagas abertas de verdade.
 */
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
    return (jobs ?? []).filter((job) => !text || [job.title, job.location, job.department, job.company?.name].some((value) => value?.toLocaleLowerCase('pt-BR').includes(text))).slice(0, 4);
  }, [jobs, term]);

  const total = jobs?.length ?? 0;

  return <div className="relative isolate overflow-hidden rounded-[28px] bg-[#fbfafc] text-[#241b38] shadow-[0_30px_90px_-20px_rgba(217,70,239,.55)] ring-1 ring-white/40">
    <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#e6d9fa] blur-3xl" />
    <div aria-hidden="true" className="absolute -bottom-24 -left-16 -z-10 h-64 w-64 rounded-full bg-amber-200/60 blur-3xl" />
    <span aria-hidden="true" className="pointer-events-none absolute -right-4 -top-16 -z-10 select-none text-[300px] font-black leading-none text-[#efe7fb]">↗</span>

    <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
      <div className="flex flex-col justify-center">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#7240da] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[2px] text-white">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" /></span>
          Vagas abertas agora{total > 0 ? ` · ${total}` : ''}
        </p>
        <h2 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Procurando <span className="relative text-[#7240da]">emprego?<span aria-hidden="true" className="absolute -bottom-1.5 left-0 right-0 h-[6px] rounded-full bg-[#d5c1fb]" /></span></h2>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#736d80]">Aqui é a porta de entrada para quem quer ser contratado. Veja as vagas das empresas que usam a plataforma, envie o currículo e acompanhe cada passo da candidatura. <b className="text-[#241b38]">Para o candidato é grátis.</b></p>

        <label className="mt-6 flex max-w-md items-center gap-3 rounded-xl border border-[#e1d9ee] bg-white px-4 shadow-[0_8px_25px_#42226908]">
          <Search size={18} className="shrink-0 text-[#7240da]" aria-hidden="true" />
          <input value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Buscar vagas" placeholder="Cargo, cidade ou empresa" className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-[#8a8495] sm:text-sm" />
        </label>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/carreiras" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#7240da] px-7 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(114,64,218,.7)] transition hover:-translate-y-0.5 hover:bg-[#5b29be]">Ver todas as vagas <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden="true" /></Link>
          <Link href="/cadastro" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#e1d9ee] bg-white px-6 text-sm font-semibold text-[#7240da] transition hover:border-[#c7b0ed]">Sou empresa: publicar vagas</Link>
        </div>
      </div>

      <div className="min-w-0">
        {jobs === null && !failed && <div className="space-y-3" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />)}</div>}
        {failed && <p className="rounded-2xl bg-white p-6 text-sm text-[#736d80]">Não conseguimos listar as vagas agora. <Link href="/carreiras" className="font-semibold text-[#7240da] underline">Abra o portal de vagas</Link>.</p>}
        {jobs && shown.length === 0 && <div className="rounded-2xl border border-dashed border-[#cfbde9] bg-white p-8 text-center text-sm text-[#736d80]"><Briefcase size={24} className="mx-auto mb-2 text-[#7240da]" aria-hidden="true" />{jobs.length === 0 ? 'Nenhuma vaga aberta no momento. Volte em breve.' : 'Nenhuma vaga encontrada para essa busca.'}</div>}

        {shown.length > 0 && <ul className="space-y-3">
          {shown.map((job, index) => {
            const meta = [job.location, workModeLabel(job.workMode), job.employmentType ? employmentTypeLabel(job.employmentType) : null].filter(Boolean).join(' · ');
            return <li key={job.id}>
              <Link href={`/carreiras/${job.companyId}/${job.id}`} className="group flex items-center gap-4 rounded-2xl border border-[#e9e5f0] bg-white p-4 shadow-[0_6px_20px_#482d6b0a] transition hover:-translate-y-0.5 hover:border-[#c7b0ed] hover:shadow-[0_14px_30px_#482d6b18]" style={{ transform: `rotate(${index % 2 ? 0.4 : -0.4}deg)` }}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#e6dcf4] bg-[#f1ecfa] text-lg font-bold text-[#7240da]">{(job.company?.name ?? job.title).charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{job.title}</span>
                  <span className="block truncate text-xs text-[#7240da]">{job.company?.name}</span>
                  {meta && <span className="mt-1 flex items-center gap-1 truncate text-[11px] text-[#736d80]"><MapPin size={11} aria-hidden="true" />{meta}</span>}
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f2ecfc] text-[#7240da] transition group-hover:bg-[#7240da] group-hover:text-white"><ArrowUpRight size={16} aria-hidden="true" /></span>
              </Link>
            </li>;
          })}
          {total > shown.length && !term && <li className="pt-1 text-center text-xs text-[#736d80]">e mais {total - shown.length} vaga(s) no portal</li>}
        </ul>}
      </div>
    </div>
  </div>;
}
