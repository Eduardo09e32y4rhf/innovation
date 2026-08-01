'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { CareersBrand, CareersFooter } from '../_components/careers-brand';
import {
  CareersApiError,
  employmentTypeLabel,
  getPublicJobs,
  safeAccentColor,
  type PublicCompany,
  type PublicJob,
} from '../_lib/public-jobs';

type CareersListProps = {
  companyId: string;
};

const fallbackCompany = (companyId: string): PublicCompany => ({
  id: companyId,
  name: 'Portal de Carreiras',
});

function searchableText(job: PublicJob): string {
  return [
    job.title,
    job.description,
    job.location,
    job.department,
    job.employmentType,
    job.workMode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR');
}

function JobCard({ job, companyId }: { job: PublicJob; companyId: string }) {
  return (
    <Link
      href={`/carreiras/${encodeURIComponent(companyId)}/${encodeURIComponent(job.id)}`}
      className="group relative grid gap-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_50px_-28px_rgba(15,23,42,0.45)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-[var(--career-accent)] opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="min-w-0">
        <span className="mb-3 flex flex-wrap items-center gap-2">
          {job.department && (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-teal-700">
              {job.department}
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
            {employmentTypeLabel(job.employmentType)}
          </span>
        </span>
        <span className="block text-lg font-black tracking-tight text-slate-950 transition-colors group-hover:text-[var(--career-accent)] sm:text-xl">
          {job.title}
        </span>
        <span className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} aria-hidden="true" />
            {job.location || 'Local a combinar'}
          </span>
          {job.workMode && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} aria-hidden="true" />
              {job.workMode}
            </span>
          )}
        </span>
      </span>
      <span className="inline-flex items-center gap-2 text-xs font-black text-slate-900">
        Ver oportunidade
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white transition-transform group-hover:translate-x-1 group-hover:bg-[var(--career-accent)]">
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

function LoadingJobs() {
  return (
    <div className="grid gap-3" aria-label="Carregando vagas">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}

export function CareersList({ companyId }: CareersListProps) {
  const [company, setCompany] = useState<PublicCompany>(() => fallbackCompany(companyId));
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('pt-BR'));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getPublicJobs(companyId)
      .then((result) => {
        if (!active) return;
        setCompany(result.company);
        setJobs(result.jobs);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof CareersApiError
            ? requestError.message
            : 'Não foi possível carregar as vagas neste momento.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [companyId, reloadKey]);

  const locations = useMemo(
    () =>
      Array.from(new Set(jobs.map((job) => job.location).filter(Boolean) as string[])).sort(
        (a, b) => a.localeCompare(b, 'pt-BR'),
      ),
    [jobs],
  );
  const employmentTypes = useMemo(
    () =>
      Array.from(
        new Set(jobs.map((job) => job.employmentType).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [jobs],
  );
  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesQuery = !deferredQuery || searchableText(job).includes(deferredQuery);
        const matchesLocation = !location || job.location === location;
        const matchesType = !employmentType || job.employmentType === employmentType;
        return matchesQuery && matchesLocation && matchesType;
      }),
    [deferredQuery, employmentType, jobs, location],
  );
  const accent = safeAccentColor(company.primaryColor);

  return (
    <main
      className="min-h-screen bg-[#f4f7f6] text-slate-950 selection:bg-teal-200"
      style={{ '--career-accent': accent } as React.CSSProperties}
    >
      <section className="relative overflow-hidden bg-[#071711] text-white">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_15%_10%,var(--career-accent),transparent_32%),radial-gradient(circle_at_85%_80%,#0f766e,transparent_25%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:44px_44px]" />

        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 sm:pb-24 sm:pt-8">
          <header className="flex items-center justify-between">
            <CareersBrand company={company} companyId={companyId} />
            <span className="hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 sm:inline-flex">
              Oportunidades abertas
            </span>
          </header>

          <div className="mt-16 max-w-3xl sm:mt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-teal-100 backdrop-blur">
              <Sparkles size={13} aria-hidden="true" />
              Faça parte do nosso time
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              Seu próximo desafio pode começar aqui.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              {company.description ||
                `Conheça as oportunidades abertas na ${company.name} e encontre uma vaga que combine com o seu talento.`}
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-8 max-w-7xl px-5 pb-20 sm:-mt-10 sm:px-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_22px_70px_-30px_rgba(15,23,42,0.4)] sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_210px]">
            <label className="relative block">
              <span className="sr-only">Buscar vagas</span>
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busque por cargo, área ou palavra-chave"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[var(--career-accent)] focus:bg-white focus:ring-4 focus:ring-teal-950/5"
              />
            </label>
            <label className="relative block">
              <span className="sr-only">Filtrar por local</span>
              <MapPin
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-9 text-sm font-semibold outline-none transition focus:border-[var(--career-accent)] focus:bg-white"
              >
                <option value="">Todos os locais</option>
                {locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative block">
              <span className="sr-only">Filtrar por contratação</span>
              <SlidersHorizontal
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <select
                value={employmentType}
                onChange={(event) => setEmploymentType(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-9 text-sm font-semibold outline-none transition focus:border-[var(--career-accent)] focus:bg-white"
              >
                <option value="">Todos os contratos</option>
                {employmentTypes.map((item) => (
                  <option key={item} value={item}>
                    {employmentTypeLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-12 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--career-accent)]">
              Vagas disponíveis
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Encontre seu lugar
            </h2>
          </div>
          {!loading && !error && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'vaga' : 'vagas'}
            </span>
          )}
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingJobs />
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <RefreshCw size={22} aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-black text-slate-950">
                Não foi possível carregar as oportunidades
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-xs font-black text-white transition hover:bg-[var(--career-accent)]"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Tentar novamente
              </button>
            </div>
          ) : filteredJobs.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} companyId={companyId} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
              <Briefcase size={28} className="mx-auto text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 text-base font-black text-slate-900">
                {jobs.length ? 'Nenhuma vaga encontrada' : 'Nenhuma vaga aberta no momento'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {jobs.length
                  ? 'Ajuste os filtros ou tente buscar por outro termo.'
                  : 'Novas oportunidades podem aparecer em breve. Volte para acompanhar.'}
              </p>
              {jobs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setLocation('');
                    setEmploymentType('');
                  }}
                  className="mt-5 text-xs font-black text-[var(--career-accent)] hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <CareersFooter company={company} />
    </main>
  );
}
