'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, Briefcase, Check, ChevronRight, CircleUserRound, Heart, Home, MapPin, Search, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/app/contexts/I18nContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useCandidateSession } from './_components/account-shell';
import { candidateApi, type CareerJob, type CareerMatch } from '../_lib/candidate-api';
import { publicSalaryLabel, workModeLabel } from '../_lib/public-jobs';
import { translatedJob } from '../_lib/job-translations';

type Tab = 'panel' | 'jobs' | 'saved';

export function CareerHub({ initialTab = 'panel' }: { initialTab?: Tab }) {
  const { t } = useI18n();
  const { language } = useLanguage();
  const { profile } = useCandidateSession();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [applications, setApplications] = useState<{ id: string; job: string; company: string; statusLabel: string }[]>([]);
  const [applicationCount, setApplicationCount] = useState(0);
  const [missions, setMissions] = useState<{ key: string; title: string; xp: number; done: boolean }[]>([]);
  const [xp, setXp] = useState(profile.xp ?? 350);
  const [query, setQuery] = useState('');
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
    try {
      const [jobResult, savedResult, applicationResult, missionResult] = await Promise.all([
        candidateApi.careerJobs(), candidateApi.savedJobs(), candidateApi.applications(), candidateApi.missions(),
      ]);
      setJobs(jobResult.jobs); setSaved(savedResult.jobs.map((job) => job.id));
      setApplications(applicationResult.applications.slice(0, 3)); setApplicationCount(applicationResult.applications.length);
      setMissions(missionResult.missions); setXp(missionResult.xp);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('Não foi possível carregar seu painel.')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [selected]);

  const orderedJobs = useMemo(() => jobs.filter((job) => !query || `${job.title} ${job.company?.name ?? ''} ${job.location ?? ''}`.toLocaleLowerCase(language).includes(query.toLocaleLowerCase(language))).sort((a, b) => b.match.score - a.match.score), [jobs, query, language]);
  const visibleJobs = tab === 'saved' ? orderedJobs.filter((job) => saved.includes(job.id)) : orderedJobs;
  const best = orderedJobs[0];
  const toggleSave = async (jobId: string) => {
    const isSaved = saved.includes(jobId);
    setSaved((current) => isSaved ? current.filter((id) => id !== jobId) : [...current, jobId]);
    try { if (isSaved) await candidateApi.unsaveJob(jobId); else await candidateApi.saveJob(jobId); }
    catch { setSaved((current) => isSaved ? [...current, jobId] : current.filter((id) => id !== jobId)); }
  };
  const runSimulation = async () => {
    if (!selected) return;
    setSimBusy(true);
    try {
      setSimulated(await candidateApi.simulateMatch(selected.id, { edu: simEdu || undefined, cnh: simCnh, skills: simSkills }));
    } catch { setSimulated(null); }
    finally { setSimBusy(false); }
  };
  const applicationsCount = applicationCount;
  const profileScore = profile.completeness.percent;
  const level = Math.max(1, Math.floor(xp / 500) + 1);
  const xpInLevel = xp % 500;

  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'panel', label: t('Painel'), icon: Home }, { id: 'jobs', label: t('Vagas'), icon: Briefcase }, { id: 'saved', label: t('Salvas'), icon: Bookmark },
  ];
  const JobCard = ({ job }: { job: CareerJob }) => {
    const display = translatedJob(job, language);
    const score = job.match.score;
    const tone = job.match.level === 'ideal' ? 'text-emerald-700 border-emerald-500' : job.match.level === 'bad' ? 'text-rose-700 border-rose-500' : 'text-[#6a3de0] border-[#6a3de0]';
    return <article className="rounded-2xl border border-[#e9e5f0] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1b1730] sm:p-5">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f0eafa] text-lg font-bold text-[#6a3de0]">{job.company?.name?.slice(0, 1) || 'i'}</span><div className="min-w-0 flex-1"><p className="truncate text-xs text-[#736d80]">{job.company?.name || t('Empresa')}</p><h3 className="mt-1 font-semibold leading-snug">{display.title}</h3></div><button type="button" aria-pressed={saved.includes(job.id)} aria-label={t(saved.includes(job.id) ? 'Remover vaga salva' : 'Salvar vaga')} onClick={() => void toggleSave(job.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#6a3de0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6a3de0]"><Heart size={19} fill={saved.includes(job.id) ? 'currentColor' : 'none'} /></button></div>
      <div className="my-4 flex items-center gap-3"><span className={`grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full border-[5px] text-sm font-bold ${tone}`} aria-label={`${t('Compatibilidade')} ${score}%`}>{score}%</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{score >= 80 ? t('Boa compatibilidade') : t('Compatibilidade do perfil')}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eeeaf4]"><div className="h-full rounded-full bg-[#6a3de0]" style={{ width: `${score}%` }} /></div></div></div>
      <div className="flex flex-wrap gap-2 text-[11px] text-[#736d80]"><span className="rounded-full bg-[#f5f3f8] px-2.5 py-1"><MapPin size={12} className="mr-1 inline" />{job.location || t('Local não informado')}</span>{workModeLabel(job.workMode) && <span className="rounded-full bg-[#f5f3f8] px-2.5 py-1">{t(workModeLabel(job.workMode)!)}</span>}</div>
      {!!job.match.requirements.length && <div className="mt-3 flex flex-wrap gap-1.5">{job.match.requirements.slice(0, 4).map((item) => <span key={item.label} className={`rounded-full px-2 py-1 text-[10px] ${item.met ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{item.met ? '✓' : '×'} {item.label}</span>)}</div>}
      <div className="mt-4 flex items-center justify-between border-t border-[#f0edf5] pt-3"><span className="text-sm font-bold">{publicSalaryLabel(job) || t('A combinar')}</span><button type="button" onClick={() => { setSelected(job); setSimulated(null); setSimEdu(profile.education.at(-1)?.level ?? ''); setSimCnh(profile.driverLicenseCategory); setSimSkills(profile.skills); }} className="min-h-10 rounded-lg bg-[#6a3de0] px-4 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6a3de0]">{t('Ver detalhes')}</button></div>
    </article>;
  };

  return <main className="mx-auto min-h-[75vh] max-w-[980px] px-4 pb-28 pt-5 text-[#241b38] dark:text-white sm:px-7 sm:pt-8">
    <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-sm text-[#736d80]">{tab === 'panel' ? t('Olá, {name}', { name: profile.name?.split(/\s+/)[0] || t('candidato') }) : tab === 'saved' ? t('Suas oportunidades favoritas') : t('Oportunidades para você')}</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{tab === 'panel' ? t('Seu próximo passo') : tab === 'saved' ? t('Vagas salvas') : t('Encontre sua vaga')}</h1></div><Link href="/carreiras/conta/perfil" aria-label={t('Meu perfil')} className="grid h-11 w-11 place-items-center rounded-full border border-[#e9e5f0] bg-white text-[#6a3de0] dark:border-white/10 dark:bg-[#1b1730]"><CircleUserRound size={20} /></Link></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button onClick={() => void load()} className="ml-2 font-semibold underline">{t('Tentar novamente')}</button></div>}
    {tab === 'panel' && <>
      <section className="grid gap-3 sm:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl bg-gradient-to-br from-[#6a3de0] to-[#4622a8] p-5 text-white"><div className="flex items-center gap-4"><div className="grid h-[74px] w-[74px] shrink-0 place-items-center rounded-full border-[5px] border-white/35 text-lg font-bold">{profileScore}%</div><div><p className="text-xs text-white/75">{t('Perfil profissional')}</p><h2 className="mt-1 text-xl font-bold">{t('Nível')} {level}</h2><p className="mt-1 text-xs text-white/75">{xp} XP {t('acumulados')}</p></div></div><div className="mt-5 h-2 overflow-hidden rounded bg-white/20"><div className="h-full bg-white" style={{ width: `${xpInLevel / 5}%` }} /></div><p className="mt-2 text-[11px] text-white/75">{500 - xpInLevel} XP {t('para o próximo nível')}</p><Link href="/carreiras/conta/perfil" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-xs font-bold text-[#5b29be]">{t('Completar perfil')} <ChevronRight size={15} /></Link></div>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[#e9e5f0] bg-white p-4 dark:border-white/10 dark:bg-[#1b1730]"><p className="text-xs text-[#736d80]">{t('Candidaturas')}</p><p className="mt-2 text-2xl font-bold">{applicationsCount}</p></div><div className="rounded-2xl border border-[#e9e5f0] bg-white p-4 dark:border-white/10 dark:bg-[#1b1730]"><p className="text-xs text-[#736d80]">{t('Vagas salvas')}</p><p className="mt-2 text-2xl font-bold">{saved.length}</p></div><div className="col-span-2 rounded-2xl border border-[#e9e5f0] bg-white p-4 dark:border-white/10 dark:bg-[#1b1730]"><p className="text-xs text-[#736d80]">{t('Seu perfil está')}</p><p className="mt-2 text-xl font-bold">{profileScore}% <span className="text-sm font-medium text-[#736d80]">{t('completo')}</span></p><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eeeaf4]"><div className="h-full bg-[#6a3de0]" style={{ width: `${profileScore}%` }} /></div></div></div></section>
      <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{t('Sua melhor chance agora')}</h2><button type="button" onClick={() => setTab('jobs')} className="text-xs font-semibold text-[#6a3de0]">{t('Ver todas')}</button></div>{loading ? <div className="h-40 animate-pulse rounded-2xl bg-[#f0edf5]" aria-hidden="true" /> : best ? <JobCard job={best} /> : <div className="rounded-2xl border border-dashed border-[#cdbde8] p-7 text-center text-sm">{t('Nenhuma oportunidade aberta agora. Volte em breve.')}</div>}</section>
      <section className="mt-7"><h2 className="mb-3 text-lg font-bold">{t('Missões de perfil')}</h2><div className="grid gap-2 sm:grid-cols-3">{missions.map((mission) => <div key={mission.key} className="flex items-center gap-3 rounded-xl border border-[#e9e5f0] bg-white p-3 dark:border-white/10 dark:bg-[#1b1730]"><span className={`grid h-9 w-9 place-items-center rounded-full ${mission.done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f0eafa] text-[#6a3de0]'}`}>{mission.done ? <Check size={17} /> : <Sparkles size={16} />}</span><span className="min-w-0 flex-1 text-xs font-medium">{t(mission.title)}</span><b className="shrink-0 text-xs text-[#6a3de0]">+{mission.xp} XP</b></div>)}</div></section>
      <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{t('Candidaturas recentes')}</h2><Link href="/carreiras/conta/candidaturas" className="text-xs font-semibold text-[#6a3de0]">{t('Acompanhar')}</Link></div>{applications.length ? <div className="space-y-2">{applications.map((item) => <article key={item.id} className="flex items-center justify-between rounded-xl border border-[#e9e5f0] bg-white p-4 dark:border-white/10 dark:bg-[#1b1730]"><span><b className="block text-sm">{item.job}</b><small className="text-xs text-[#736d80]">{item.company}</small></span><span className="rounded-full bg-[#f0eafa] px-3 py-1 text-[11px] text-[#6a3de0]">{item.statusLabel}</span></article>)}</div> : <p className="rounded-xl border border-[#e9e5f0] bg-white p-4 text-sm text-[#736d80] dark:border-white/10 dark:bg-[#1b1730]">{t('Suas candidaturas aparecerão aqui.')}</p>}</section>
    </>}
    {tab !== 'panel' && <><div className="mb-4 flex gap-2"><label className="flex min-h-12 flex-1 items-center gap-2 rounded-xl border border-[#e9e5f0] bg-white px-4 dark:border-white/10 dark:bg-[#1b1730]"><Search size={17} className="text-[#6a3de0]" /><input className="w-full bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Cargo, empresa ou cidade')} /></label><Link href="/carreiras/vagas" className="grid h-12 w-12 place-items-center rounded-xl border border-[#e9e5f0] bg-white text-[#6a3de0] dark:border-white/10 dark:bg-[#1b1730]" aria-label={t('Abrir marketplace')}><Briefcase size={18} /></Link></div>{loading ? <div className="grid gap-3 sm:grid-cols-2" aria-label={t('Carregando vagas')}>{[0,1,2,3].map((id) => <div key={id} className="h-64 animate-pulse rounded-2xl bg-[#f0edf5] motion-reduce:animate-none" />)}</div> : visibleJobs.length ? <div className="grid gap-3 sm:grid-cols-2">{visibleJobs.map((job) => <JobCard key={job.id} job={job} />)}</div> : <div className="rounded-2xl border border-dashed border-[#cdbde8] p-8 text-center"><Bookmark className="mx-auto text-[#6a3de0]" /><p className="mt-3 text-sm">{tab === 'saved' ? t('Você ainda não salvou vagas.') : t('Nenhuma vaga encontrada. Ajuste a busca ou tente novamente mais tarde.')}</p></div>}</>}
    <nav aria-label={t('Navegação do candidato')} className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e9e5f0] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-[#171329]/95"><div className="mx-auto grid max-w-[640px] grid-cols-3">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)} className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6a3de0] ${tab === id ? 'text-[#6a3de0]' : 'text-[#736d80]'}`}><span className="relative"><Icon size={19} />{id === 'saved' && saved.length > 0 && <span className="absolute -right-3 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#6a3de0] px-1 text-[9px] font-bold text-white">{saved.length}</span>}</span>{label}</button>)}</div></nav>
    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="career-sheet-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 text-[#241b38] dark:bg-[#1b1730] dark:text-white sm:rounded-3xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#736d80]">{selected.company?.name}</p><h2 id="career-sheet-title" className="mt-1 text-xl font-bold">{translatedJob(selected, language).title}</h2></div><button type="button" aria-label={t('Fechar')} onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-full bg-[#f5f3f8]"><X size={18} /></button></div><div className="my-5 rounded-2xl bg-[#f5f1fc] p-4 dark:bg-white/5"><p className="text-xs font-semibold">{t('Compatibilidade do seu perfil')}</p><p className="mt-1 text-3xl font-bold text-[#6a3de0]">{(simulated ?? selected.match).score}%</p><p className="mt-2 text-xs">{(simulated ?? selected.match).missing.length ? t('Faltam estes requisitos: {items}', { items: (simulated ?? selected.match).missing.join(', ') }) : t('Você atende aos requisitos mapeados para esta vaga.')}</p></div><h3 className="font-semibold">{t('Requisitos da vaga')}</h3><ul className="mt-2 space-y-2">{selected.match.requirements.map((item) => <li key={item.label} className="flex items-center gap-2 text-sm"><span className={item.met ? 'text-emerald-700' : 'text-rose-700'}>{item.met ? '✓' : '×'}</span><span>{item.label}</span><small className="ml-auto text-[#736d80]">{item.must ? t('Obrigatório') : t('Diferencial')}</small></li>)}</ul><div className="mt-5 rounded-2xl border border-[#e9e5f0] p-4 dark:border-white/10"><h3 className="font-semibold">{t('E se eu…?')}</h3><p className="mt-1 text-xs text-[#736d80]">{t('Simule sua compatibilidade usando um perfil hipotético com os dados atuais.')}</p><label className="mt-3 block text-xs font-medium">{t('Escolaridade hipotética')}<select value={simEdu} onChange={(event) => setSimEdu(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[#e9e5f0] bg-white px-3 text-sm"><option value="">{t('Usar escolaridade do perfil')}</option>{['Ensino fundamental', 'Ensino médio', 'Técnico', 'Superior', 'Pós-graduação'].map((item) => <option key={item}>{item}</option>)}</select></label><p className="mt-3 text-xs font-medium">{t('CNH hipotética')}</p><div className="mt-2 flex flex-wrap gap-1.5">{['A','B','AB','C','D','E','AC','AD','AE'].map((item) => <button key={item} type="button" aria-pressed={simCnh.includes(item)} onClick={() => setSimCnh((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} className={`rounded-full border px-2.5 py-1 text-xs ${simCnh.includes(item) ? 'border-[#6a3de0] bg-[#f0eafa] text-[#6a3de0]' : 'border-[#e9e5f0]'}`}>{item}</button>)}</div><form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); const value = simSkillDraft.trim(); if (value && !simSkills.includes(value)) setSimSkills((current) => [...current, value]); setSimSkillDraft(''); }}><input value={simSkillDraft} onChange={(event) => setSimSkillDraft(event.target.value)} placeholder={t('Adicionar habilidade')} className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#e9e5f0] px-3 text-sm" /><button className="rounded-lg bg-[#f0eafa] px-3 text-xs font-semibold text-[#6a3de0]">{t('Adicionar')}</button></form><div className="mt-2 flex flex-wrap gap-1.5">{simSkills.map((skill) => <button key={skill} type="button" onClick={() => setSimSkills((current) => current.filter((item) => item !== skill))} className="rounded-full bg-[#f0eafa] px-2.5 py-1 text-xs text-[#6a3de0]">{skill} ×</button>)}</div><button type="button" disabled={simBusy} onClick={() => void runSimulation()} className="mt-3 min-h-11 rounded-lg border border-[#6a3de0] px-4 text-sm font-semibold text-[#6a3de0] disabled:opacity-50">{simBusy ? t('Calculando…') : t('Simular perfil')}</button></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => void toggleSave(selected.id)} aria-pressed={saved.includes(selected.id)} className="grid h-12 w-12 place-items-center rounded-xl border border-[#e9e5f0] text-[#6a3de0]"><Heart fill={saved.includes(selected.id) ? 'currentColor' : 'none'} /></button><Link href={`/carreiras/${encodeURIComponent(selected.companyId)}/${encodeURIComponent(selected.id)}`} className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#6a3de0] px-4 text-sm font-bold text-white">{t('Candidatar-se')} <ChevronRight size={17} /></Link></div></section></div>}
  </main>;
}
