'use client';

import { ArrowUpRight, Bookmark, Briefcase, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CareersLogo } from './careers-brand';
import { PortalFooter } from './portal-chrome';
import { getAllPublicJobs, getPublicJobs, employmentTypeLabel, publicSalaryLabel, workModeLabel, type PublicCompany, type PublicJob } from '../_lib/public-jobs';

const SAVED_KEY = 'innovation-careers-saved';
const tag = 'rounded-md bg-[#f5f3f8] px-2 py-1 text-[11px] text-[#71667e]';

function toggleIn(list: string[], value: string) { return list.includes(value) ? list.filter(item => item !== value) : [...list, value]; }

/** Portal de vagas: papel claro, roxo Innovation, busca em destaque, filtros à esquerda e cartões de vaga. */
export function CareersCatalog({ companyId }: { companyId?: string }) {
  const [company, setCompany] = useState<PublicCompany>({ id: companyId || '', name: companyId ? 'Portal de carreiras' : 'Innovation RH' });
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [modes, setModes] = useState<string[]>([]);
  const [contracts, setContracts] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const query = useDeferredValue(search.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR'));

  useEffect(() => {
    try { const data = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); if (Array.isArray(data)) setSaved(data.filter(item => typeof item === 'string')); } catch { /* sem armazenamento: segue sem favoritos */ }
  }, []);
  function toggleSaved(id: string) {
    setSaved(current => {
      const next = toggleIn(current, id);
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* ignora */ }
      return next;
    });
  }

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
  useEffect(() => { setPage(1); }, [query, location, companyFilter, modes, contracts, levels, onlySaved, companyId]);

  const locations = useMemo(() => Array.from(new Set(jobs.map(job => job.location).filter(Boolean) as string[])).sort(), [jobs]);
  const modeOptions = useMemo(() => Array.from(new Set(jobs.map(job => job.workMode).filter(Boolean) as string[])).sort(), [jobs]);
  const contractOptions = useMemo(() => Array.from(new Set(jobs.map(job => job.employmentType).filter(Boolean) as string[])).sort(), [jobs]);
  const levelOptions = useMemo(() => Array.from(new Set(jobs.map(job => job.seniority).filter(Boolean) as string[])).sort(), [jobs]);
  const areas = useMemo(() => Array.from(new Set(jobs.map(job => job.department).filter(Boolean) as string[])).slice(0, 5), [jobs]);
  const companiesWithJobs = useMemo(() => companies.filter(item => jobs.some(job => job.companyId === item.id)), [companies, jobs]);
  const count = (pick: (job: PublicJob) => string | null | undefined, value: string) => jobs.filter(job => pick(job) === value).length;

  const filtered = useMemo(() => jobs.filter(job => (!location || job.location === location) && (!companyFilter || job.companyId === companyFilter)
    && (!modes.length || (job.workMode && modes.includes(job.workMode))) && (!contracts.length || (job.employmentType && contracts.includes(job.employmentType)))
    && (!levels.length || (job.seniority && levels.includes(job.seniority))) && (!onlySaved || saved.includes(job.id))
    && (!query || [job.title, job.description, job.location, job.department, job.employmentType, job.workMode, job.company?.name].filter(Boolean).join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').includes(query))),
  [jobs, location, companyFilter, modes, contracts, levels, onlySaved, saved, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const hasFilter = Boolean(search || location || companyFilter || modes.length || contracts.length || levels.length || onlySaved);
  function clear() { setSearch(''); setLocation(''); setCompanyFilter(''); setModes([]); setContracts([]); setLevels([]); setOnlySaved(false); setPage(1); }
  const check = (label: string, checked: boolean, total: number, onChange: () => void) => <label key={label} className="my-3 flex cursor-pointer items-center gap-2.5 text-xs text-[#6b6478]"><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#7240da]" />{label}<span className="ml-auto text-[10px] text-[#8d869a]">{total}</span></label>;

  return <div className="min-h-screen bg-[#fbfafc] text-[#241b38]">
    <a className="sr-only focus:not-sr-only focus:block focus:p-4" href="#career-content">Ir para as oportunidades</a>
    <div className="mx-auto max-w-[1200px] px-5 sm:px-9">
      <header className="flex min-h-[64px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#e9e5f0] py-3 sm:min-h-[88px]">
        <Link href={companyId ? '/carreiras/' + encodeURIComponent(companyId) : '/carreiras'} className="flex items-center gap-3" aria-label="Portal de vagas Innovation RH">
          <span className="grid h-9 w-9 -rotate-[8deg] place-items-center rounded-xl bg-[#7240da] text-2xl font-bold text-white" aria-hidden="true">i</span>
          <span className="text-lg font-extrabold tracking-tight sm:text-xl">{companyId ? company.name : <>innovation<span className="text-[#7240da]">.</span></>}<small className="mt-0.5 block text-[10px] font-medium tracking-[2.4px] text-[#736d80]">{companyId ? 'PORTAL DE CARREIRAS' : 'RH · CARREIRAS'}</small></span>
        </Link>
        <nav aria-label="Navegação" className="flex items-center gap-4 text-[13px] sm:gap-7">
          <a href="#career-content" className="hidden text-[#7240da] sm:inline">Explorar vagas</a>
          {companyId && <Link href="/carreiras" className="hidden sm:inline">Todas as empresas</Link>}
          <Link href="/carreiras/conta" className="inline-flex min-h-11 items-center rounded-lg bg-[#7240da] px-4 font-semibold text-white hover:bg-[#5b29be]">Login</Link>
        </nav>
      </header>

      <section className="grid items-center gap-6 pb-8 pt-8 sm:gap-9 sm:pb-10 sm:pt-16 md:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold tracking-[2px] text-[#7240da]"><span className="h-[7px] w-[7px] rounded-full bg-[#8955e2]" /> NOVOS CAMINHOS COMEÇAM AQUI</p>
          <h1 className="my-5 max-w-[590px] text-[clamp(32px,9vw,40px)] sm:text-[clamp(40px,4.7vw,62px)] font-bold leading-[1.06] tracking-[-0.05em]">{companyId ? <>Venha trabalhar na <em className="relative not-italic text-[#7240da]">{company.name}<span aria-hidden="true" className="absolute -bottom-1.5 left-0 right-0 h-[5px] rounded-full bg-[#d5c1fb]" /></em></> : <>Seu talento merece<br />um <em className="relative not-italic text-[#7240da]">novo capítulo.<span aria-hidden="true" className="absolute -bottom-1.5 left-0 right-0 h-[5px] rounded-full bg-[#d5c1fb]" /></em></>}</h1>
          <p className="mt-4 max-w-[430px] text-[15px] leading-[1.7] text-[#736d80] sm:mt-6">{company.description || 'Encontre oportunidades que combinam com você. O próximo passo da sua carreira começa aqui.'}</p>
          {!loading && !error && <p className="mt-5 flex items-center gap-2.5 text-xs text-[#736d80]"><span className="text-[#7240da]">↗</span><span><b className="text-[#241b38]">{jobs.length} oportunidade{jobs.length === 1 ? '' : 's'}</b> para explorar. Qual será a sua?</span></p>}
        </div>
        <div aria-hidden="true" className="relative mx-auto hidden h-[290px] w-full max-w-[420px] place-items-center md:grid">
          <div className="relative h-[260px] w-[260px] rounded-full border border-[#e2d7f3] bg-[radial-gradient(circle,#e6d9fa_0,#f0e8fc_51%,transparent_52%)] after:absolute after:inset-[27px] after:rounded-full after:border after:border-dashed after:border-[#ccb9ed]"><span className="absolute left-[65px] top-[55px] -rotate-[10deg] text-[137px] leading-none text-[#7240da]">↗</span></div>
          <div className="absolute left-0 top-6 flex -rotate-[5deg] items-center gap-3 rounded-2xl border border-[#ede7f6] bg-white px-4 py-4 shadow-[0_15px_40px_#4222690e]"><span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#f0e8fc] text-[#7240da]"><Sparkles size={18} /></span><div><strong className="block text-[13px]">Talento encontra oportunidade.</strong><small className="mt-1.5 block text-[11px] text-[#736d80]">Uma conexão. Um novo começo.</small></div></div>
          <div className="absolute bottom-6 right-0 flex rotate-[5deg] items-center gap-3 rounded-2xl border border-[#ede7f6] bg-white px-4 py-4 shadow-[0_15px_40px_#4222690e]"><span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#f0e8fc] text-[#7240da]"><ArrowUpRight size={18} /></span><div><strong className="block text-[13px]">Seu próximo passo</strong><small className="mt-1.5 block text-[11px] text-[#736d80]">Explore. Descubra. Candidate-se.</small></div></div>
        </div>
      </section>

      <form role="search" aria-label="Buscar vagas" onSubmit={event => { event.preventDefault(); document.getElementById('career-content')?.scrollIntoView({ behavior: 'smooth' }); }} className="grid items-center gap-2 rounded-[13px] border border-[#e1d9ee] bg-white p-2.5 shadow-[0_8px_25px_#42226908] md:grid-cols-[1.7fr_1fr_auto]">
        <label className="flex min-w-0 items-center gap-3 border-b border-[#e9e5f0] px-4 py-2 md:border-b-0 md:border-r"><Search size={19} className="shrink-0 text-[#7240da]" aria-hidden="true" /><input type="search" value={search} onChange={e => setSearch(e.target.value)} aria-label="Cargo, área ou palavra-chave" placeholder="Qual oportunidade você procura?" className="w-full min-w-0 bg-transparent py-2 text-base outline-none placeholder:text-[#8a8495] sm:text-sm" /></label>
        <label className="flex min-w-0 items-center gap-3 px-4 py-2"><MapPin size={19} className="shrink-0 text-[#7240da]" aria-hidden="true" /><select value={location} onChange={e => setLocation(e.target.value)} aria-label="Localização" className="w-full min-w-0 bg-transparent py-2 text-base outline-none sm:text-sm"><option value="">Todas as localizações</option>{locations.map(value => <option key={value}>{value}</option>)}</select></label>
        <button type="submit" className="min-h-12 rounded-[9px] bg-[#7240da] px-6 text-[13px] font-semibold text-white transition hover:bg-[#5b29be]">Encontrar vagas ↗</button>
      </form>

      {areas.length > 0 && <div className="mb-9 mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[#736d80]"><span>Explore por área:</span>{areas.map(area => <button key={area} type="button" onClick={() => setSearch(area)} className="rounded-md bg-[#f0ecf5] px-3 py-1.5 text-[#635b73] hover:bg-[#e6def2]">{area}</button>)}<button type="button" onClick={clear} className="rounded-md bg-[#f0ecf5] px-3 py-1.5 text-[#635b73] hover:bg-[#e6def2]">Todas as vagas ↗</button></div>}

      <div id="career-content" className="mt-8 grid scroll-mt-4 gap-9 border-t border-[#e9e5f0] pb-12 pt-8 md:grid-cols-[230px_1fr]">
        <div>
          <button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)} className="mb-4 flex w-full items-center gap-2 rounded-lg bg-[#eee5fc] px-4 py-3 text-left text-[#7240da] md:hidden"><SlidersHorizontal size={15} aria-hidden="true" /> {filtersOpen ? 'Fechar filtros −' : 'Filtros de busca +'}</button>
          <aside className={(filtersOpen ? 'block' : 'hidden') + ' md:block'} aria-label="Filtros">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-base font-semibold">Refine sua busca</h2><button type="button" onClick={clear} className="py-1.5 text-[11px] text-[#7240da]">Limpar tudo</button></div>
            {!companyId && companiesWithJobs.length > 0 && <div className="mb-5 border-b border-[#e9e5f0] pb-5"><h3 className="mb-3.5 text-xs font-semibold">Empresa</h3><select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} aria-label="Filtrar por empresa" className="w-full rounded-lg border border-[#e9e5f0] bg-white px-2 py-2.5 text-[11px] text-[#736d80]"><option value="">Todas as empresas</option>{companiesWithJobs.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
            {modeOptions.length > 0 && <div className="mb-5 border-b border-[#e9e5f0] pb-4"><h3 className="text-xs font-semibold">Modelo de trabalho</h3>{modeOptions.map(value => check(workModeLabel(value) ?? value, modes.includes(value), count(job => job.workMode, value), () => setModes(current => toggleIn(current, value))))}</div>}
            {contractOptions.length > 0 && <div className="mb-5 border-b border-[#e9e5f0] pb-4"><h3 className="text-xs font-semibold">Tipo de contratação</h3>{contractOptions.map(value => check(employmentTypeLabel(value), contracts.includes(value), count(job => job.employmentType, value), () => setContracts(current => toggleIn(current, value))))}</div>}
            {levelOptions.length > 0 && <div className="mb-5 border-b border-[#e9e5f0] pb-4"><h3 className="text-xs font-semibold">Nível de experiência</h3>{levelOptions.map(value => check(value, levels.includes(value), count(job => job.seniority, value), () => setLevels(current => toggleIn(current, value))))}</div>}
            {!companyId && companyFilter && (() => { const item = companies.find(entry => entry.id === companyFilter); return item ? <div className="hidden rounded-xl bg-[#f0eafa] p-5 md:block"><CareersLogo company={item} /><h3 className="mt-3 text-sm font-semibold leading-snug">{item.name}</h3>{item.description && <p className="mb-3 mt-2 text-[11px] leading-relaxed text-[#736d80]">{item.description}</p>}<Link href={'/carreiras/' + encodeURIComponent(item.id)} className="text-[11px] font-semibold text-[#7240da]">Ver empresa ↗</Link></div> : null; })()}
          </aside>
        </div>

        <section aria-label="Vagas encontradas">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><h2 className="text-[22px] font-semibold tracking-tight">Encontre seu lugar <span className="ml-1 rounded-md bg-[#eee5fc] px-2 py-1 align-middle text-[13px] text-[#7240da]">{filtered.length}</span></h2><p role="status" aria-live="polite" className="mt-1.5 text-xs text-[#736d80]">{loading ? 'Carregando oportunidades...' : filtered.length + ' oportunidade' + (filtered.length === 1 ? ' encontrada' : 's encontradas')}</p></div>
            <button type="button" aria-pressed={onlySaved} onClick={() => setOnlySaved(value => !value)} className={'min-h-11 shrink-0 rounded-lg border bg-white px-3 text-[12px] ' + (onlySaved ? 'border-[#7240da] text-[#7240da]' : 'border-[#e9e5f0] text-[#736d80]')}>Vagas salvas {saved.length}</button>
          </div>

          {error ? <div className="space-y-3 rounded-2xl border border-[#e9e5f0] bg-white p-8 text-center"><p role="alert" className="text-sm">{error}</p><button type="button" onClick={() => setReload(value => value + 1)} className="rounded-lg bg-[#7240da] px-5 py-3 text-sm font-semibold text-white">Tentar novamente</button></div>
            : loading ? <div className="space-y-4" aria-hidden="true">{[0, 1, 2].map(i => <div key={i} className="h-44 animate-pulse rounded-2xl border border-[#e9e5f0] bg-white" />)}</div>
            : !filtered.length ? <div className="rounded-2xl border border-dashed border-[#cfbde9] bg-white px-4 py-12 text-center"><Briefcase size={26} className="mx-auto text-[#7240da]" aria-hidden="true" /><h3 className="mt-3 font-semibold">Nenhuma vaga por aqui… ainda.</h3><p className="mb-4 mt-2 text-xs text-[#736d80]">{jobs.length ? 'Tente outra palavra-chave ou remova os filtros.' : 'Nenhuma vaga aberta no momento. Volte em breve.'}</p>{hasFilter && <button type="button" onClick={clear} className="rounded-lg bg-[#7240da] px-5 py-3 text-[13px] font-semibold text-white">Limpar filtros</button>}</div>
            : <ul className="grid gap-4">{filtered.slice((currentPage - 1) * 12, currentPage * 12).map(job => {
              const salary = publicSalaryLabel(job); const mode = workModeLabel(job.workMode); const isSaved = saved.includes(job.id);
              const href = '/carreiras/' + encodeURIComponent(companyId || job.companyId) + '/' + encodeURIComponent(job.id);
              return <li key={job.id}><article className="rounded-[14px] border border-[#e9e5f0] bg-white p-5 transition hover:border-[#c7b0ed] hover:shadow-[0_8px_22px_#482d6b10] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3 text-[11px] text-[#736d80]">{job.company ? <CareersLogo company={job.company} /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-[#e6dcf4] bg-[#f1ecfa] font-bold text-[#7240da]">{(job.company?.name ?? company.name).charAt(0)}</span>}<span className="truncate">{job.company?.name || company.name}</span></div>
                  <button type="button" onClick={() => toggleSaved(job.id)} aria-pressed={isSaved} aria-label={(isSaved ? 'Remover dos favoritos: ' : 'Salvar vaga: ') + job.title} className={'grid h-9 w-9 place-items-center rounded-lg ' + (isSaved ? 'bg-[#eee5fc] text-[#7240da]' : 'text-[#8b819b] hover:bg-[#f5f3f8]')}><Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" /></button>
                </div>
                <h3 className="mb-2.5 mt-4 max-w-[610px] break-words text-[19px] font-semibold leading-snug tracking-tight"><Link href={href} className="hover:text-[#7240da]">{job.title}</Link></h3>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#736d80]"><span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{job.location || 'Local não informado'}</span><span className="inline-flex items-center gap-1"><Briefcase size={13} aria-hidden="true" />{employmentTypeLabel(job.employmentType)}</span></p>
                <div className="my-4 flex flex-wrap gap-2">{mode && <span className={'rounded-md px-2 py-1 text-[11px] ' + (job.workMode === 'REMOTO' ? 'bg-[#eaf4ee] text-[#327450]' : 'bg-[#f0e8fd] text-[#7650ac]')}>{mode}</span>}{job.seniority && <span className={tag}>{job.seniority}</span>}{job.department && <span className={tag}>{job.department}</span>}</div>
                <p className="line-clamp-3 max-w-[620px] text-xs leading-[1.7] text-[#736d80]">{job.description}</p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0edf5] pt-4">
                  <div className="text-[17px] font-bold">{salary || 'A combinar'}<small className="mt-1 block text-[10px] font-normal text-[#736d80]">Remuneração informada na vaga</small></div>
                  <Link href={href} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#f2ecfc] px-4 text-xs font-bold text-[#7240da] transition hover:bg-[#7240da] hover:text-white sm:w-auto">Ver vaga e candidatar-se ↗</Link>
                </div>
              </article></li>;
            })}</ul>}

          {pages > 1 && <nav aria-label="Paginação das vagas" className="mt-5 flex flex-wrap items-center justify-between gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="min-h-11 rounded-lg border border-[#e9e5f0] bg-white px-5 text-xs font-semibold text-[#7240da] disabled:opacity-40">Anterior</button><span className="text-xs text-[#736d80]">Página {currentPage} de {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="min-h-11 rounded-lg border border-[#e9e5f0] bg-white px-5 text-xs font-semibold text-[#7240da] disabled:opacity-40">Próxima</button></nav>}

          <div className="mt-6 flex items-center justify-between gap-5 rounded-xl bg-[#eee8f8] px-5 py-5 sm:px-6"><div><h3 className="mb-1 text-[15px] font-semibold">Grandes histórias começam com um primeiro passo.</h3><p className="text-[11px] leading-relaxed text-[#736d80]">Explore os detalhes de cada vaga e encontre seu próximo desafio.</p></div><span aria-hidden="true" className="text-3xl text-[#7240da]">↗</span></div>
        </section>
      </div>


    </div>
    <PortalFooter />
  </div>;
}

