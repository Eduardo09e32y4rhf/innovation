'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, Briefcase, Check, ChevronRight, CircleUserRound, Heart, Home, MapPin, Search, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/app/contexts/I18nContext';
import { useLanguage, type Language } from '@/app/contexts/LanguageContext';
import { useCandidateSession } from './_components/account-shell';
import { candidateApi, type CandidateApplication, type CandidateInvite, type CareerJob, type CareerMatch } from '../_lib/candidate-api';
import { employmentTypeLabel, publicSalaryLabel, workModeLabel } from '../_lib/public-jobs';
import { translatedJob } from '../_lib/job-translations';

type Tab = 'panel' | 'jobs' | 'saved';
type Translator = (key: string, vars?: Record<string, string | number>) => string;

function CareerJobCard({ job, saved, language, t, onSave, onOpen }: {
  job: CareerJob; saved: boolean; language: Language; t: Translator;
  onSave: () => void; onOpen: () => void;
}) {
  const title = translatedJob(job, language).title;
  const score = job.match.score;
  const ringColor = job.match.level === 'ideal' ? '#19a875' : job.match.level === 'bad' ? '#e15769' : '#7441df';
  const tags = job.match.requirements.slice(0, 3);
  return (
    <article className="group rounded-2xl border border-[#e9e4f1] bg-white p-4 shadow-[0_5px_20px_rgba(48,24,87,.035)] transition hover:-translate-y-0.5 hover:border-[#cfc0eb] hover:shadow-[0_12px_30px_rgba(48,24,87,.09)] dark:border-white/10 dark:bg-[#1b1730] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f0eafa] text-lg font-extrabold text-[#6a3de0]">{job.company?.name?.slice(0, 1) || 'i'}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[#827895]">{job.company?.name || t('Empresa')}</p>
          <h3 className="mt-1 line-clamp-2 font-bold leading-snug text-[#211638] dark:text-white">{title}</h3>
        </div>
        <button type="button" aria-pressed={saved} aria-label={t(saved ? 'Remover vaga salva' : 'Salvar vaga')} onClick={onSave} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#6a3de0] hover:bg-[#f5f1fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6a3de0]"><Heart size={19} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="my-4 flex items-center gap-3">
        <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full border-[5px] bg-white text-sm font-extrabold dark:bg-[#1b1730]" style={{ borderColor: ringColor, color: ringColor }} aria-label={`${t('Compatibilidade')} ${score}%`}>{score}%</div>
        <div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-xs"><span className="font-semibold text-[#39275e] dark:text-white">{t(score >= 80 ? 'Boa compatibilidade' : 'Compatibilidade do perfil')}</span><span className="text-[#827895]">{score}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eeeaf4]"><div className="h-full rounded-full bg-[#7544e2]" style={{ width: `${score}%` }} /></div></div>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-[#716780]">
        <span className="rounded-full bg-[#f6f4f9] px-2.5 py-1"><MapPin size={12} className="mr-1 inline" />{job.location || t('Local não informado')}</span>
        {workModeLabel(job.workMode) && <span className="rounded-full bg-[#f6f4f9] px-2.5 py-1">{t(workModeLabel(job.workMode)!)}</span>}
        {job.employmentType && <span className="rounded-full bg-[#f6f4f9] px-2.5 py-1">{t(employmentTypeLabel(job.employmentType))}</span>}
      </div>
      {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tags.map((item) => <span key={item.label} className={`rounded-full px-2.5 py-1 text-[10px] ${item.met ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{item.met ? '✓' : '×'} {item.label}</span>)}</div>}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f0edf5] pt-3"><span className="text-sm font-bold text-[#211638] dark:text-white">{publicSalaryLabel(job) || t('A combinar')}</span><button type="button" onClick={onOpen} className="min-h-10 rounded-lg bg-[#6a3de0] px-4 text-xs font-bold text-white transition hover:bg-[#572dc4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6a3de0]">{t('Ver detalhes')}</button></div>
    </article>
  );
}

function ProfileRing({ score, t }: { score: number; t: Translator }) {
  return <div className="relative grid h-[86px] w-[86px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#fff ${score}%, rgba(255,255,255,.22) 0)` }} role="img" aria-label={`${t('Força do perfil')}: ${score}%`}><div className="grid h-[70px] w-[70px] place-items-center rounded-full bg-[#5425b7] text-center"><span className="text-xl font-extrabold leading-none">{score}</span><span className="mt-0.5 text-[9px] text-white/75">{t('de 100')}</span></div></div>;
}

export function CareerHub() {
  const { t } = useI18n();
  const { language } = useLanguage();
  const { profile } = useCandidateSession();
  const [tab, setTab] = useState<Tab>('panel');
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [invites, setInvites] = useState<CandidateInvite[]>([]);
  const [missions, setMissions] = useState<{ key: string; title: string; xp: number; done: boolean }[]>([]);
  const [xp, setXp] = useState(profile.xp ?? 350);
  const [query, setQuery] = useState('');
  const [allApplications, setAllApplications] = useState(false);
  const [selected, setSelected] = useState<CareerJob | null>(null);
  const [simulated, setSimulated] = useState<CareerMatch | null>(null);
  const [simBusy, setSimBusy] = useState(false);
  const [simEdu, setSimEdu] = useState('');
  const [simCnh, setSimCnh] = useState<string[]>([]);
  const [simSkills, setSimSkills] = useState<string[]>([]);
  const [simSkillDraft, setSimSkillDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [jobsResult, savedResult, applicationsResult, inviteResult, missionResult] = await Promise.allSettled([
      candidateApi.careerJobs(), candidateApi.savedJobs(), candidateApi.applications(), candidateApi.invites(), candidateApi.missions(),
    ]);
    if (jobsResult.status === 'fulfilled') setJobs(jobsResult.value.jobs);
    else setError(jobsResult.reason instanceof Error ? jobsResult.reason.message : t('Não foi possível carregar seu painel.'));
    if (savedResult.status === 'fulfilled') setSaved(savedResult.value.jobs.map((job) => job.id));
    if (applicationsResult.status === 'fulfilled') setApplications(applicationsResult.value.applications);
    if (inviteResult.status === 'fulfilled') setInvites(inviteResult.value.filter((invite) => invite.status === 'SENT'));
    if (missionResult.status === 'fulfilled') { setMissions(missionResult.value.missions); setXp(missionResult.value.xp); }
    setLoading(false);
  }, [t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [selected]);
  useEffect(() => {
    if (window.location.hash === '#candidaturas') { setAllApplications(true); setTimeout(() => document.getElementById('candidaturas')?.scrollIntoView(), 0); }
  }, []);

  const orderedJobs = useMemo(() => jobs
    .filter((job) => !query || `${job.title} ${job.company?.name ?? ''} ${job.location ?? ''}`.toLocaleLowerCase(language).includes(query.toLocaleLowerCase(language)))
    .sort((a, b) => b.match.score - a.match.score), [jobs, query, language]);
  const visibleJobs = tab === 'saved' ? orderedJobs.filter((job) => saved.includes(job.id)) : orderedJobs;
  const best = orderedJobs[0];
  const inProgress = applications.filter((item) => !['REJECTED', 'HIRED'].includes(item.status) && !item.closed).length;
  const score = profile.completeness.percent;
  const level = Math.max(1, Math.floor(xp / 500) + 1);
  const xpInLevel = xp % 500;
  const firstName = profile.name?.trim().split(/\s+/)[0] || t('candidato');
  const subtitle = [profile.profession, [profile.city, profile.state].filter(Boolean).join(' · ')].filter(Boolean).join(' · ');
  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite');

  const toggleSave = async (jobId: string) => {
    const wasSaved = saved.includes(jobId);
    setSaved((current) => wasSaved ? current.filter((id) => id !== jobId) : [...current, jobId]);
    try { if (wasSaved) await candidateApi.unsaveJob(jobId); else await candidateApi.saveJob(jobId); }
    catch { setSaved((current) => wasSaved ? [...current, jobId] : current.filter((id) => id !== jobId)); }
  };
  const openDetails = (job: CareerJob) => {
    setSelected(job); setSimulated(null); setSimEdu(profile.education.at(-1)?.level ?? '');
    setSimCnh(profile.driverLicenseCategory); setSimSkills(profile.skills);
  };
  const runSimulation = async () => {
    if (!selected) return;
    setSimBusy(true);
    try { setSimulated(await candidateApi.simulateMatch(selected.id, { edu: simEdu || undefined, cnh: simCnh, skills: simSkills })); }
    catch { setSimulated(null); }
    finally { setSimBusy(false); }
  };
  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'panel', label: t('Painel'), icon: Home }, { id: 'jobs', label: t('Vagas'), icon: Briefcase }, { id: 'saved', label: t('Salvas'), icon: Bookmark },
  ];
  const applicationItems = allApplications ? applications : applications.slice(0, 3);

  return (
    <main className="mx-auto min-h-[75vh] max-w-[1180px] px-4 pb-28 pt-5 text-[#241b38] dark:text-white sm:px-7 sm:pt-7">
      {tab === 'panel' ? <>
        <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(112deg,#25104f_0%,#5122ae_61%,#814be6_100%)] p-5 text-white shadow-[0_18px_45px_rgba(65,32,135,.2)] sm:p-7">
          <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0"><p className="text-sm text-white/70">{greeting},</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-[30px]">{firstName}!</h1><p className="mt-1 text-sm text-white/75">{subtitle || t('Vamos encontrar seu próximo passo profissional.')}</p><div className="mt-4 flex flex-wrap gap-2">{profile.skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-medium">{skill}</span>)}</div></div>
            <div className="flex items-center gap-4 sm:gap-5"><ProfileRing score={score} t={t} /><div className="max-w-[190px]"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/65">{t('Força do perfil')}</p><p className="mt-1 text-xl font-extrabold">{t(score >= 85 ? 'Avançado' : score >= 60 ? 'Perfil em destaque' : 'Vamos fortalecer seu perfil')}</p><p className="mt-1 text-xs leading-5 text-white/75">{t('Falta pouco para seu perfil virar destaque para o RH.')}</p><Link href="/carreiras/conta/perfil" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-xs font-bold text-[#5224b1] shadow-sm">{t('Melhorar meu perfil')} <ChevronRight size={15} /></Link></div></div>
          </div>
        </section>

        <section aria-label={t('Resumo da conta')} className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: t('Candidaturas'), value: applications.length, hint: t('No total'), icon: Briefcase },
            { label: t('Em andamento'), value: inProgress, hint: t('Processos ativos'), icon: Sparkles },
            { label: t('Convites'), value: invites.length, hint: t('De empresas'), icon: Check },
            { label: t('Vagas para você'), value: jobs.length, hint: t('Conforme seu perfil'), icon: Heart },
          ].map(({ label, value, hint, icon: Icon }) => <div key={label} className="rounded-2xl border border-[#e9e4f1] bg-white p-4 shadow-[0_5px_20px_rgba(48,24,87,.035)] dark:border-white/10 dark:bg-[#1b1730]"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#827895]">{label}</span><Icon size={16} className="text-[#7441df]" /></div><p className="mt-2 text-2xl font-extrabold text-[#24143d] dark:text-white">{loading ? '–' : value}</p><p className="mt-0.5 text-[10px] text-[#827895]">{hint}</p></div>)}
        </section>

        {error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button onClick={() => void load()} className="font-bold underline">{t('Tentar novamente')}</button></div>}

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-7">
            <section aria-labelledby="recommended-jobs">
              <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="recommended-jobs" className="text-lg font-extrabold tracking-tight">{t('Vagas para você')}</h2><p className="mt-1 text-xs text-[#827895]">{t('Ordenadas pela compatibilidade do seu perfil.')}</p></div><button type="button" onClick={() => setTab('jobs')} className="shrink-0 text-xs font-bold text-[#6a3de0]">{t('Ver todas')} →</button></div>
              {loading ? <div className="grid gap-3 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-60 animate-pulse rounded-2xl bg-[#eeeaf4] motion-reduce:animate-none" />)}</div> : best ? <div className="grid gap-3 md:grid-cols-2">{orderedJobs.slice(0, 4).map((job) => <CareerJobCard key={job.id} job={job} saved={saved.includes(job.id)} language={language} t={t} onSave={() => void toggleSave(job.id)} onOpen={() => openDetails(job)} />)}</div> : <div className="rounded-2xl border border-dashed border-[#cdbde8] bg-white p-8 text-center dark:border-white/15 dark:bg-[#1b1730]"><Briefcase size={23} className="mx-auto text-[#7441df]" /><p className="mt-3 text-sm font-semibold">{t('Nenhuma oportunidade aberta agora. Volte em breve.')}</p><Link href="/carreiras/vagas" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#6a3de0] px-4 text-xs font-bold text-white">{t('Explorar vagas')}</Link></div>}
            </section>

            <section id="candidaturas" aria-labelledby="applications-title" className="scroll-mt-5">
              <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="applications-title" className="text-lg font-extrabold tracking-tight">{t('Minhas candidaturas')}</h2><p className="mt-1 text-xs text-[#827895]">{t('Acompanhe o andamento dos seus processos seletivos.')}</p></div>{applications.length > 3 && <button type="button" onClick={() => setAllApplications((value) => !value)} className="shrink-0 text-xs font-bold text-[#6a3de0]">{t(allApplications ? 'Mostrar menos' : 'Ver todas')}</button>}</div>
              {applicationItems.length ? <div className="space-y-2">{applicationItems.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e9e4f1] bg-white p-4 shadow-[0_5px_20px_rgba(48,24,87,.025)] dark:border-white/10 dark:bg-[#1b1730]"><div className="min-w-0"><p className="truncate text-sm font-bold">{item.job}</p><p className="mt-1 text-xs text-[#827895]">{item.company} · {t('enviada em')} {new Date(item.appliedAt).toLocaleDateString(language)}</p></div><span className="rounded-full bg-[#f0eafa] px-3 py-1.5 text-[10px] font-bold text-[#5b29be]">{t(item.statusLabel)}</span></article>)}</div> : <div className="rounded-2xl border border-[#e9e4f1] bg-white p-5 text-sm text-[#716780] dark:border-white/10 dark:bg-[#1b1730]">{t('Você ainda não se candidatou a nenhuma vaga.')} <Link href="/carreiras/vagas" className="ml-1 font-bold text-[#6a3de0]">{t('Explorar vagas')} →</Link></div>}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[#e9e4f1] bg-white p-5 shadow-[0_5px_20px_rgba(48,24,87,.035)] dark:border-white/10 dark:bg-[#1b1730]">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#827895]">{t('Jornada profissional')}</p><h2 className="mt-1 text-base font-extrabold">{t('Nível')} {level}</h2></div><span className="rounded-full bg-[#f0eafa] px-3 py-1 text-xs font-extrabold text-[#6a3de0]">{xp} XP</span></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eeeaf4]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#9b7cf0,#6a3de0)]" style={{ width: `${xpInLevel / 5}%` }} /></div><p className="mt-2 text-[11px] text-[#827895]">{500 - xpInLevel} XP {t('para o próximo nível')}</p>
            </section>

            <section className="rounded-2xl border border-[#e9e4f1] bg-white p-5 shadow-[0_5px_20px_rgba(48,24,87,.035)] dark:border-white/10 dark:bg-[#1b1730]"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#827895]">{t('Seu próximo passo')}</p><h2 className="mt-1 text-base font-extrabold">{t('Missões de perfil')}</h2></div><Sparkles size={18} className="text-[#7441df]" /></div><p className="mt-1 text-xs leading-5 text-[#827895]">{t('Cada etapa fortalece seu perfil e aumenta suas chances.')}</p><div className="mt-4 space-y-2">{missions.map((mission) => <div key={mission.key} className="flex items-center gap-3 rounded-xl border border-[#f0edf5] p-3 dark:border-white/10"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${mission.done ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f0eafa] text-[#6a3de0]'}`}>{mission.done ? <Check size={16} /> : <Sparkles size={15} />}</span><span className="min-w-0 flex-1 text-xs font-semibold">{t(mission.title)}</span><span className="shrink-0 text-[10px] font-extrabold text-[#6a3de0]">+{mission.xp}</span></div>)}</div><Link href="/carreiras/conta/perfil" className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#f2edfb] text-xs font-bold text-[#5b29be]">{t('Melhorar meu perfil')} <ChevronRight size={14} /></Link></section>

            <section className="rounded-2xl bg-[#281455] p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-white/60">{t('Dica do RH')}</p><p className="mt-2 text-sm font-semibold leading-6">{t('Mantenha suas experiências e competências atualizadas para receber recomendações melhores.')}</p><Link href="/carreiras/conta/perfil" className="mt-3 inline-flex items-center text-xs font-bold text-white">{t('Revisar meu perfil')} <ChevronRight size={14} /></Link></section>
          </aside>
        </div>
      </> : <>
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#7441df]">{tab === 'saved' ? t('Suas oportunidades favoritas') : t('Oportunidades para você')}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">{tab === 'saved' ? t('Vagas salvas') : t('Encontre sua vaga')}</h1><p className="mt-1 text-sm text-[#827895]">{t('Ordenadas pela compatibilidade do seu perfil.')}</p></div><Link href="/carreiras/vagas" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#e8e2f0] bg-white px-3 text-xs font-bold text-[#5b29be]"><Search size={15} />{t('Abrir marketplace')}</Link></header>
        <label className="mb-4 flex min-h-12 items-center gap-3 rounded-xl border border-[#e8e2f0] bg-white px-4 shadow-sm dark:border-white/10 dark:bg-[#1b1730]"><Search size={17} className="text-[#6a3de0]" /><input className="w-full bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Cargo, empresa ou cidade')} /></label>
        {loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={t('Carregando vagas')}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-60 animate-pulse rounded-2xl bg-[#eeeaf4] motion-reduce:animate-none" />)}</div> : visibleJobs.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleJobs.map((job) => <CareerJobCard key={job.id} job={job} saved={saved.includes(job.id)} language={language} t={t} onSave={() => void toggleSave(job.id)} onOpen={() => openDetails(job)} />)}</div> : <div className="rounded-2xl border border-dashed border-[#cdbde8] bg-white p-10 text-center dark:border-white/15 dark:bg-[#1b1730]"><Bookmark size={24} className="mx-auto text-[#7441df]" /><p className="mt-3 text-sm font-semibold">{tab === 'saved' ? t('Você ainda não salvou vagas.') : t('Nenhuma vaga encontrada. Ajuste a busca ou tente novamente mais tarde.')}</p></div>}
      </>}

      <nav aria-label={t('Navegação do candidato')} className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e9e4f1] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-[#171329]/95"><div className="mx-auto grid max-w-[640px] grid-cols-3">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)} className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6a3de0] ${tab === id ? 'text-[#6a3de0]' : 'text-[#817890]'}`}><span className="relative"><Icon size={19} />{id === 'saved' && saved.length > 0 && <span className="absolute -right-3 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#6a3de0] px-1 text-[9px] font-bold text-white">{saved.length}</span>}</span>{label}</button>)}</div></nav>

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="career-sheet-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 text-[#241b38] dark:bg-[#1b1730] dark:text-white sm:rounded-3xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#827895]">{selected.company?.name}</p><h2 id="career-sheet-title" className="mt-1 text-xl font-bold">{translatedJob(selected, language).title}</h2></div><button type="button" aria-label={t('Fechar')} onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-full bg-[#f5f3f8]"><X size={18} /></button></div><div className="my-5 rounded-2xl bg-[#f5f1fc] p-4 dark:bg-white/5"><p className="text-xs font-semibold">{t('Compatibilidade do seu perfil')}</p><p className="mt-1 text-3xl font-bold text-[#6a3de0]">{(simulated ?? selected.match).score}%</p><p className="mt-2 text-xs">{(simulated ?? selected.match).missing.length ? t('Faltam estes requisitos: {items}', { items: (simulated ?? selected.match).missing.join(', ') }) : t('Você atende aos requisitos mapeados para esta vaga.')}</p></div><h3 className="font-semibold">{t('Requisitos da vaga')}</h3><ul className="mt-2 space-y-2">{selected.match.requirements.map((item) => <li key={item.label} className="flex items-center gap-2 text-sm"><span className={item.met ? 'text-emerald-700' : 'text-rose-700'}>{item.met ? '✓' : '×'}</span><span>{item.label}</span><small className="ml-auto text-[#827895]">{item.must ? t('Obrigatório') : t('Diferencial')}</small></li>)}</ul><div className="mt-5 rounded-2xl border border-[#e9e4f1] p-4 dark:border-white/10"><h3 className="font-semibold">{t('E se eu…?')}</h3><p className="mt-1 text-xs text-[#827895]">{t('Simule sua compatibilidade usando um perfil hipotético com os dados atuais.')}</p><label className="mt-3 block text-xs font-medium">{t('Escolaridade hipotética')}<select value={simEdu} onChange={(event) => setSimEdu(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[#e9e4f1] bg-white px-3 text-sm"><option value="">{t('Usar escolaridade do perfil')}</option>{['Ensino fundamental', 'Ensino médio', 'Técnico', 'Superior', 'Pós-graduação'].map((item) => <option key={item}>{item}</option>)}</select></label><p className="mt-3 text-xs font-medium">{t('CNH hipotética')}</p><div className="mt-2 flex flex-wrap gap-1.5">{['A', 'B', 'AB', 'C', 'D', 'E', 'AC', 'AD', 'AE'].map((item) => <button key={item} type="button" aria-pressed={simCnh.includes(item)} onClick={() => setSimCnh((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} className={`rounded-full border px-2.5 py-1 text-xs ${simCnh.includes(item) ? 'border-[#6a3de0] bg-[#f0eafa] text-[#6a3de0]' : 'border-[#e9e4f1]'}`}>{item}</button>)}</div><form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); const value = simSkillDraft.trim(); if (value && !simSkills.includes(value)) setSimSkills((current) => [...current, value]); setSimSkillDraft(''); }}><input value={simSkillDraft} onChange={(event) => setSimSkillDraft(event.target.value)} placeholder={t('Adicionar habilidade')} className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#e9e4f1] px-3 text-sm" /><button className="rounded-lg bg-[#f0eafa] px-3 text-xs font-semibold text-[#6a3de0]">{t('Adicionar')}</button></form><div className="mt-2 flex flex-wrap gap-1.5">{simSkills.map((skill) => <button key={skill} type="button" onClick={() => setSimSkills((current) => current.filter((item) => item !== skill))} className="rounded-full bg-[#f0eafa] px-2.5 py-1 text-xs text-[#6a3de0]">{skill} ×</button>)}</div><button type="button" disabled={simBusy} onClick={() => void runSimulation()} className="mt-3 min-h-11 rounded-lg border border-[#6a3de0] px-4 text-sm font-semibold text-[#6a3de0] disabled:opacity-50">{simBusy ? t('Calculando…') : t('Simular perfil')}</button></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => void toggleSave(selected.id)} aria-pressed={saved.includes(selected.id)} className="grid h-12 w-12 place-items-center rounded-xl border border-[#e9e4f1] text-[#6a3de0]"><Heart fill={saved.includes(selected.id) ? 'currentColor' : 'none'} /></button><Link href={`/carreiras/${encodeURIComponent(selected.companyId)}/${encodeURIComponent(selected.id)}`} className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#6a3de0] px-4 text-sm font-bold text-white">{t('Candidatar-se')} <ChevronRight size={17} /></Link></div></section></div>}
    </main>
  );
}
