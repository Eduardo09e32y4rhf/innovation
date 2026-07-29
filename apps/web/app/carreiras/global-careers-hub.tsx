'use client';

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Filter,
  Globe,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { CareersFooter } from './_components/careers-brand';
import {
  employmentTypeLabel,
  getAllPublicJobs,
  safeAccentColor,
  type PublicCompany,
  type PublicJob,
} from './_lib/public-jobs';

export function GlobalCareersHub() {
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');

  const deferredSearch = useDeferredValue(search);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAllPublicJobs();
      setCompanies(result.companies);
      setJobs(result.jobs);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar o portal de oportunidades no momento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (j.location && j.location.trim()) {
        set.add(j.location.trim());
      }
    }
    return Array.from(set).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = deferredSearch.toLocaleLowerCase('pt-BR').trim();
    return jobs.filter((job) => {
      if (selectedCompanyId !== 'ALL' && job.companyId !== selectedCompanyId) {
        return false;
      }
      if (selectedLocation !== 'ALL' && job.location !== selectedLocation) {
        return false;
      }
      if (!q) return true;
      const text = [
        job.title,
        job.description,
        job.location,
        job.department,
        job.employmentType,
        job.workMode,
        job.company?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return text.includes(q);
    });
  }, [jobs, deferredSearch, selectedCompanyId, selectedLocation]);

  const companyJobsCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of jobs) {
      map[j.companyId] = (map[j.companyId] || 0) + 1;
    }
    return map;
  }, [jobs]);

  return (
    <div className="min-h-screen bg-[#040810] text-slate-100 selection:bg-teal-500/30 selection:text-teal-200">
      {/* Background Glow & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
      <div className="absolute top-[-10%] left-[20%] h-[45rem] w-[45rem] rounded-full bg-teal-500/10 blur-[180px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] h-[35rem] w-[35rem] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur-2xl sticky top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/carreiras" className="flex items-center gap-3 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(45,212,191,0.3)] transition-transform group-hover:scale-105">
              <ShieldCheck size={22} strokeWidth={2.5} />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black uppercase tracking-[0.2em] text-white">
                Innovation <span className="text-teal-400">Plataforma</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Portal Oficial de Oportunidades
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-bold text-teal-300">
              <Sparkles size={14} className="text-teal-400 animate-pulse" />
              Ecossistema Multi-Empresas
            </span>
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
            >
              Conheça a Plataforma →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-12 text-center lg:pt-24 lg:pb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-400 backdrop-blur-md mb-6">
          <Trophy size={14} className="text-amber-400" />
          Construa o Futuro nas Melhores Empresas
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl max-w-5xl mx-auto leading-[1.08]">
          Seu próximo grande desafio pode começar <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-slate-100 bg-clip-text text-transparent">aqui.</span>
        </h1>
        <p className="mt-6 text-base text-slate-400 sm:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
          Conectamos talentos excepcionais a empresas verificadas em todo o país. Processos seletivos transparentes, triagem inteligente com IA e admissão 100% digital sem papelada.
        </p>

        {/* Gamified Process Banner Preview */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-5xl mx-auto bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl text-left">
          <div className="flex items-center gap-3 p-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-teal-300 font-black text-sm">1</span>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">Inscrição & Triagem</p>
              <p className="text-[10px] text-slate-400">Análise inteligente IA</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-cyan-300 font-black text-sm">2</span>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">Avaliação RH</p>
              <p className="text-[10px] text-slate-400">Perfil & Cultura</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sky-300 font-black text-sm">3</span>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">Entrevista / Teste</p>
              <p className="text-[10px] text-slate-400">Desafio prático</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-violet-300 font-black text-sm">4</span>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">Papo com Gestor</p>
              <p className="text-[10px] text-slate-400">Alinhamento final</p>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center gap-3 p-2 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-emerald-300 font-black text-sm">5</span>
            <div>
              <p className="text-[11px] font-bold text-teal-300 leading-tight">Aprovação & ASO</p>
              <p className="text-[10px] text-slate-400">Admissão digital</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-10 max-w-4xl mx-auto rounded-3xl border border-white/15 bg-white/[0.05] p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busque por cargo, área, tecnologia ou empresa..."
                className="w-full rounded-2xl bg-slate-900/80 border border-white/10 py-3.5 pl-11 pr-4 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full appearance-none rounded-2xl bg-slate-900/80 border border-white/10 py-3.5 pl-10 pr-8 text-sm font-semibold text-slate-200 focus:border-teal-500 focus:outline-none"
              >
                <option value="ALL">Todas as localidades</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setSearch('');
                setSelectedCompanyId('ALL');
                setSelectedLocation('ALL');
              }}
              className="h-full rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/10 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Limpar Filtros
            </button>
          </div>

          {/* Company Pills Filter */}
          {companies.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                <Building2 size={13} /> Empresas:
              </span>
              <button
                onClick={() => setSelectedCompanyId('ALL')}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  selectedCompanyId === 'ALL'
                    ? 'bg-white text-slate-950 shadow-[0_0_15px_rgba(15,23,42,0.15)]'
                    : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 border border-white/10'
                }`}
              >
                Todas ({jobs.length})
              </button>
              {companies.map((comp) => {
                const count = companyJobsCountMap[comp.id] || 0;
                const isSelected = selectedCompanyId === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompanyId(isSelected ? 'ALL' : comp.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-white text-slate-950 shadow-[0_0_15px_rgba(15,23,42,0.15)]'
                        : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 border border-white/10'
                    }`}
                  >
                    {comp.logoUrl ? (
                      <img src={comp.logoUrl} alt={comp.name} className="h-5 w-5 rounded-full object-contain bg-slate-950 p-0.5 ring-1 ring-white/10" />
                    ) : (
                      <span className="h-4 w-4 rounded-full bg-slate-800 text-teal-300 text-[10px] flex items-center justify-center font-black">
                        {comp.name.charAt(0)}
                      </span>
                    )}
                    <span>{comp.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-white/10 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw size={36} className="mx-auto animate-spin text-teal-400 mb-4" />
            <p className="text-sm font-semibold text-slate-400">Carregando ecossistema de oportunidades...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-center max-w-md mx-auto">
            <p className="text-rose-400 font-bold mb-4">{error}</p>
            <button
              onClick={loadData}
              className="rounded-xl bg-rose-500 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-rose-600 transition"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {/* Companies Grid Section (if no search is blocking) */}
            {selectedCompanyId === 'ALL' && !search && companies.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                      Empresas Parceiras & Clientes Verificados
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Conheça as organizações oficiais que confiam no nosso ecossistema de capital humano.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {companies.map((comp) => {
                    const count = companyJobsCountMap[comp.id] || 0;
                    return (
                      <div
                        key={comp.id}
                        onClick={() => setSelectedCompanyId(comp.id)}
                        className="group relative cursor-pointer rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:border-teal-500/50 hover:bg-white/[0.05] hover:shadow-[0_10px_30px_rgba(45,212,191,0.1)] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {comp.logoUrl ? (
                                <img
                                  src={comp.logoUrl}
                                  alt={comp.name}
                                  className="h-14 w-14 rounded-2xl object-contain bg-slate-950 p-2 border border-white/10 shadow-md"
                                />
                              ) : (
                                <div
                                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br font-black text-white text-lg shadow-md"
                                  style={{ backgroundColor: safeAccentColor(comp.primaryColor) }}
                                >
                                  {comp.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <h3 className="text-lg font-black text-white group-hover:text-teal-300 transition-colors">
                                  {comp.name}
                                </h3>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={12} /> {comp.city ? `${comp.city}, ${comp.state || ''}` : 'Brasil / Remoto'}
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full bg-teal-500/10 border border-teal-500/20 px-3 py-1 text-xs font-black text-teal-300">
                              {count} vaga{count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                            {comp.description || 'Empresa verificada utilizando a plataforma Innovation RH Connect para atração de talentos com IA e gestão de colaboradores.'}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-teal-400 group-hover:translate-x-1 transition-transform">
                          <span>Explorar oportunidades</span>
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Jobs List Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {selectedCompanyId !== 'ALL'
                      ? `Vagas em ${companies.find((c) => c.id === selectedCompanyId)?.name || 'Empresa Selecionada'}`
                      : 'Oportunidades Abertas em Todo o Ecossistema'}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Exibindo <span className="font-bold text-white">{filteredJobs.length}</span> oportunidade{filteredJobs.length !== 1 ? 's' : ''} pronta{filteredJobs.length !== 1 ? 's' : ''} para candidatura.
                  </p>
                </div>
                {selectedCompanyId !== 'ALL' && (
                  <button
                    onClick={() => setSelectedCompanyId('ALL')}
                    className="text-xs font-bold uppercase tracking-wider text-teal-400 hover:underline"
                  >
                    ← Ver todas as empresas
                  </button>
                )}
              </div>

              {filteredJobs.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center max-w-lg mx-auto">
                  <Briefcase size={48} className="mx-auto text-slate-600 mb-4" />
                  <h3 className="text-lg font-black text-white">Nenhuma vaga encontrada</h3>
                  <p className="text-sm text-slate-400 mt-2">
                    Não encontramos oportunidades que correspondam aos filtros ou termo pesquisado.
                  </p>
                  <button
                    onClick={() => {
                      setSearch('');
                      setSelectedCompanyId('ALL');
                      setSelectedLocation('ALL');
                    }}
                    className="mt-6 rounded-xl bg-teal-500 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-teal-400 transition"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  {filteredJobs.map((job) => {
                    const comp = job.company || companies.find((c) => c.id === job.companyId) || {
                      id: job.companyId,
                      name: 'Empresa Cliente',
                      logoUrl: null,
                      primaryColor: null,
                    };
                    return (
                      <Link
                        key={job.id}
                        href={`/carreiras/${encodeURIComponent(comp.id)}/${encodeURIComponent(job.id)}`}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/40 hover:bg-white/[0.06] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                      >
                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-teal-400 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
                        <div>
                          {/* Company Header inside Job Card */}
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                            <div className="flex items-center gap-2.5">
                              {comp.logoUrl ? (
                                <img
                                  src={comp.logoUrl}
                                  alt={comp.name}
                                  className="h-9 w-9 rounded-xl object-contain bg-slate-950 p-1"
                                />
                              ) : (
                                <div
                                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-teal-300 font-black text-xs"
                                >
                                  {comp.name.charAt(0)}
                                </div>
                              )}
                              <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                                {comp.name}
                              </span>
                            </div>
                            <span className="rounded-full bg-slate-900/90 border border-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              {employmentTypeLabel(job.employmentType)}
                            </span>
                          </div>

                          {/* Job Title & Dept */}
                          <div className="mb-4">
                            {job.department && (
                              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-teal-400 mb-1">
                                {job.department}
                              </span>
                            )}
                            <h3 className="text-xl font-black tracking-tight text-white group-hover:text-teal-300 transition-colors">
                              {job.title}
                            </h3>
                            <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {job.description || 'Oportunidade oficial em nosso portal de talentos.'}
                            </p>
                          </div>
                        </div>

                        {/* Job Meta Footer */}
                        <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-400">
                          <div className="flex items-center gap-4">
                            <span className="inline-flex items-center gap-1.5 text-slate-300">
                              <MapPin size={14} className="text-teal-400" />
                              {job.location || 'Local a combinar'}
                            </span>
                            {job.salaryRange && (
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                                💰 {job.salaryRange}
                              </span>
                            )}
                          </div>

                          <span className="inline-flex items-center gap-2 text-xs font-black text-teal-400 group-hover:translate-x-1 transition-transform">
                            Candidatar-se
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-slate-950">
                              <ArrowRight size={14} />
                            </span>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/80 py-10 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-teal-400" />
            <span className="font-bold text-white">Innovation RH Connect</span> — Plataforma Oficial de Gente & Gestão
          </div>
          <p>© {new Date().getFullYear()} Todos os direitos reservados. Triagem justa e em conformidade com a LGPD.</p>
        </div>
      </footer>
    </div>
  );
}
