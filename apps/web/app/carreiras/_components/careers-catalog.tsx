'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { CareersBrand, CareersFooter, CareersLogo } from './careers-brand';
import { getAllPublicJobs, getPublicJobs, employmentTypeLabel, type PublicCompany, type PublicJob } from '../_lib/public-jobs';

export function CareersCatalog({ companyId }: { companyId?: string }) {
  const [company, setCompany] = useState<PublicCompany>({ id: companyId || '', name: companyId ? 'Portal de carreiras' : 'Innovation RH' });
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [contract, setContract] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [page, setPage] = useState(1);
  const query = useDeferredValue(search.trim().toLocaleLowerCase('pt-BR'));
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const load = async () => {
      try {
        if (companyId) {
          const result = await getPublicJobs(companyId);
          if (active) { setCompany(result.company); setJobs(result.jobs); }
        } else {
          const result = await getAllPublicJobs();
          if (active) { setCompanies(result.companies); setJobs(result.jobs); }
        }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as oportunidades.'); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [companyId, reload]);
  useEffect(() => { setPage(1); }, [query, location, contract, companyFilter, companyId]);
  const locations = useMemo(() => Array.from(new Set(jobs.map(job => job.location).filter(Boolean) as string[])).sort(), [jobs]);
  const contracts = useMemo(() => Array.from(new Set(jobs.map(job => job.employmentType).filter(Boolean) as string[])).sort(), [jobs]);
  const filtered = useMemo(() => jobs.filter(job => (!location || job.location === location) && (!contract || job.employmentType === contract) && (!companyFilter || job.companyId === companyFilter)
    && (!query || [job.title, job.description, job.location, job.department, job.employmentType, job.workMode, job.company?.name].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(query))), [jobs, location, contract, companyFilter, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  function clear() { setSearch(''); setLocation(''); setContract(''); setCompanyFilter(''); setPage(1); }
  return <div className="min-h-screen bg-bg text-fg">
    <a className="sr-only focus:not-sr-only focus:block focus:p-4" href="#career-content">Ir para as oportunidades</a>
    <header className="border-b border-border bg-bg-elev"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
      {companyId ? <CareersBrand company={company} companyId={companyId} /> : <Link href="/carreiras" className="text-lg font-semibold text-brand">Innovation RH · Carreiras</Link>}
      <Link className="btn btn-outline" href={companyId ? '/carreiras' : '/'}>{companyId ? 'Ver todas as empresas' : 'Conheça a plataforma'}</Link>
    </div></header>
    <main id="career-content" className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader title={companyId ? 'Oportunidades na ' + company.name : 'Encontre sua próxima oportunidade'} subtitle={company.description || 'Explore vagas abertas e envie sua candidatura pelo portal.'} />
      <section className="card-v2 space-y-4 p-4" aria-label="Filtros de oportunidades">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1"><span className="block text-sm font-medium">Buscar vagas</span><input type="search" className="input-v2 min-h-11 text-base sm:text-sm" placeholder="Cargo, área ou palavra-chave" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <label className="space-y-1"><span className="block text-sm font-medium">Local</span><select className="input-v2 min-h-11 text-base sm:text-sm" value={location} onChange={e => setLocation(e.target.value)}><option value="">Todos os locais</option>{locations.map(value => <option key={value}>{value}</option>)}</select></label>
          {companyId ? <label className="space-y-1"><span className="block text-sm font-medium">Contratação</span><select className="input-v2 min-h-11 text-base sm:text-sm" value={contract} onChange={e => setContract(e.target.value)}><option value="">Todos os contratos</option>{contracts.map(value => <option key={value} value={value}>{employmentTypeLabel(value)}</option>)}</select></label>
            : <label className="space-y-1"><span className="block text-sm font-medium">Empresa</span><select className="input-v2 min-h-11 text-base sm:text-sm" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}><option value="">Todas as empresas</option>{companies.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>}
        </div>
        <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={clear}>Limpar filtros</Button>{search && <Button type="button" variant="ghost" onClick={() => setSearch('')}>Limpar busca</Button>}</div>
      </section>
      {loading ? <p role="status" className="card-v2 p-6">Carregando oportunidades...</p> : error ? <section className="card-v2 space-y-3 p-6"><p role="alert">{error}</p><Button type="button" onClick={() => setReload(value => value + 1)}>Tentar novamente</Button></section> : <>
        {!companyId && <section aria-label="Empresas com vagas" className="space-y-3">
          <h2 className="text-lg font-semibold">Empresas com oportunidades</h2>
          <Button type="button" variant="outline" aria-pressed={!companyFilter} onClick={() => setCompanyFilter('')}>Todas as empresas ({jobs.length} vagas)</Button>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{companies.map(item => <article key={item.id} className="card-v2 min-w-0 space-y-3 p-4">
            <div className="flex items-center gap-3"><CareersLogo company={item} /><h3 className="break-words font-semibold">{item.name}</h3></div>
            {item.description && <p className="text-sm text-fg-mut">{item.description}</p>}
            <p className="text-sm">{jobs.filter(job => job.companyId === item.id).length} vagas abertas</p>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" aria-pressed={companyFilter === item.id} onClick={() => setCompanyFilter(current => current === item.id ? '' : item.id)}>Filtrar vagas</Button><Link className="btn btn-ghost" href={'/carreiras/' + encodeURIComponent(item.id)}>Ver empresa</Link></div>
          </article>)}</div>
        </section>}
        <section aria-label="Vagas encontradas" className="space-y-4"><h2 className="text-lg font-semibold" role="status">{filtered.length} oportunidades encontradas</h2>
          {!filtered.length ? <div className="card-v2 space-y-3 p-6"><p>{jobs.length ? 'Nenhuma vaga corresponde aos filtros.' : 'Nenhuma vaga aberta no momento.'}</p><Button type="button" variant="outline" onClick={clear}>Limpar filtros</Button></div>
            : <div className="grid gap-4 lg:grid-cols-2">{filtered.slice((currentPage - 1) * 12, currentPage * 12).map(job => <article key={job.id} className="card-v2 min-w-0 space-y-3 p-5">
              {!companyId && <p className="text-sm text-fg-mut">{job.company?.name || 'Empresa'}</p>}
              <h3 className="break-words text-lg font-semibold">{job.title}</h3>
              <p className="text-sm text-fg-mut">{job.location || 'Local não informado'} · {employmentTypeLabel(job.employmentType)}</p>
              {job.department && <p className="text-sm">{job.department}</p>}{job.workMode && <p className="text-sm">{job.workMode}</p>}
              {job.salaryRange && <p className="text-sm">{job.salaryRange}</p>}
              <p className="line-clamp-3 text-sm text-fg-mut">{job.description}</p>
              <Link className="btn btn-outline" href={'/carreiras/' + encodeURIComponent(companyId || job.companyId) + '/' + encodeURIComponent(job.id)}>Ver oportunidade e candidatar-se</Link>
            </article>)}</div>}
          {pages > 1 && <nav aria-label="Paginação das vagas" className="flex flex-wrap items-center justify-between gap-2"><Button type="button" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button><span className="text-sm">Página {currentPage} de {pages}</span><Button type="button" variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Próxima</Button></nav>}
        </section>
      </>}
    </main><CareersFooter company={company} />
  </div>;
}
