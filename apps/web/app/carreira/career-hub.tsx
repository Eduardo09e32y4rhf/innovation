'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, Check, CheckCircle2, Circle, X } from 'lucide-react';
import { useCandidateSession } from './_components/candidate-layout';
import { candidateApi, isUnauthorized, setCandidateToken, type CandidateApplication, type CareerJob } from '@/app/carreiras/_lib/candidate-api';
import { profileStrength } from '@/app/carreiras/_lib/profile-insights';
import { jobLocationLine } from '@/app/carreiras/_lib/job-presentation';
import { readableJobTags } from '@/app/carreiras/_lib/jobTagLabels';
import { useSavedJobs } from '@/app/carreiras/_lib/use-candidate-state';

const card = 'rounded-2xl border border-[#e9e4f1] bg-white p-5 shadow-sm sm:p-6';
const button = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5B2BD6] px-4 text-sm font-semibold text-white hover:bg-[#4720ad] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B2BD6]';
const steps = [ ['APPLIED', 'Recebida'], ['SCREENING', 'Em análise'], ['INTERVIEW', 'Entrevista'], ['OFFER', 'Proposta'], ['HIRED', 'Contratado'] ];
const finalApplication = (application: CandidateApplication) => application.isFinal || application.closed || ['HIRED', 'REJECTED'].includes(application.status);

function ApplicationCard({ application }: { application: CandidateApplication }) {
  const index = Math.max(0, steps.findIndex(([status]) => status === application.status));
  return <article className={card}>
    <h3 className="break-words text-lg font-semibold">{application.job}</h3>
    <p className="mt-1 text-sm text-slate-600">{application.company}</p>
    <p className="mt-4 text-sm font-medium text-[#5B2BD6] sm:hidden">{steps[index][1]} · Etapa {index + 1} de 5</p>
    <ol aria-label="Etapas da candidatura" className="mt-5 hidden grid-cols-5 gap-2 sm:grid">
      {steps.map(([status, label], step) => <li key={status} aria-current={index === step ? 'step' : undefined} className={`min-w-0 text-center text-sm ${step <= index ? 'font-semibold text-[#5B2BD6]' : 'text-slate-500'}`}>
        {step <= index ? <CheckCircle2 size={20} className="mx-auto mb-2" aria-hidden="true" /> : <Circle size={20} className="mx-auto mb-2" aria-hidden="true" />}
        <span>{label}</span><span className={`mt-3 block h-1 rounded-full ${step <= index ? 'bg-[#5B2BD6]' : 'bg-slate-100'}`} />
      </li>)}
    </ol>
    {application.interview && <div className="mt-4 rounded-xl bg-violet-50 p-4 text-sm">
      <p className="font-semibold">Entrevista: {new Date(application.interview.scheduledAt).toLocaleString('pt-BR')}</p>
      {application.interview.location && <p className="mt-1">{application.interview.location}</p>}
      {application.interview.meetingUrl && /^https?:\/\//i.test(application.interview.meetingUrl) && <a href={application.interview.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold underline">Entrar na entrevista</a>}
    </div>}
  </article>;
}

function MatchDialog({ job, onClose }: { job: CareerJob; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; if (element && !element.open) element.showModal(); }, []);
  return <dialog ref={dialog} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="match-title" className="w-[calc(100%_-_2rem)] max-w-lg rounded-2xl p-0 text-slate-900 shadow-xl backdrop:bg-black/40">
    <div className="max-h-[85dvh] overflow-auto p-6">
      <div className="flex items-start justify-between gap-4"><h2 id="match-title" className="text-xl font-bold">Por que {job.match.score}%?</h2><button type="button" onClick={onClose} aria-label="Fechar explicação" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-slate-100"><X /></button></div>
      <p className="mt-2 text-sm text-slate-600">{job.title}</p>
      <h3 className="mt-5 font-semibold text-emerald-700">✓ Você tem</h3>
      <ul className="mt-2 space-y-2 text-sm">{job.match.met.length ? job.match.met.map(item => <li key={item}>{item}</li>) : <li>Nenhum requisito confirmado no seu perfil.</li>}</ul>
      <h3 className="mt-5 font-semibold text-rose-700">✕ Falta</h3>
      <ul className="mt-2 space-y-2 text-sm">{job.match.missing.length ? job.match.missing.map(item => <li key={item}>{item}</li>) : <li>Nenhum requisito pendente identificado.</li>}</ul>
      {job.match.partial.length > 0 && <><h3 className="mt-5 font-semibold">Avaliação parcial</h3><ul className="mt-2 space-y-2 text-sm text-slate-600">{job.match.partial.map(item => <li key={item}>{item}</li>)}</ul></>}
      <p className="mt-5 border-t pt-4 text-sm text-slate-600">Requisitos obrigatórios: 50% · Competências: 25% · Experiência e cargo: 15% · Localização e modalidade: 10%.</p>
      <Link href="/carreira/perfil" className={`${button} mt-5`}>Atualizar perfil</Link>
    </div>
  </dialog>;
}

export function CareerHub() {
  const { profile } = useCandidateSession();
  const strength = profile.strength ?? profileStrength(profile);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'recommended' | 'all' | 'saved'>('recommended');
  const [selected, setSelected] = useState<CareerJob | null>(null);
  const { saved, toggleSaved, pending, loading: savedLoading, error: savedError } = useSavedJobs();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [response, catalog] = await Promise.all([candidateApi.applications(), candidateApi.careerJobs()]);
      setApplications(response.applications); setJobs(catalog.jobs);
    } catch (cause) {
      if (isUnauthorized(cause)) setCandidateToken(null);
      setError('Não foi possível carregar seu painel. Tente novamente.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const active = applications.filter(item => !finalApplication(item));
  const history = applications.filter(finalApplication);
  const ordered = [...jobs].sort((a, b) => b.match.score - a.match.score);
  const visible = view === 'recommended' ? ordered.filter(job => job.match.hasProfile && job.match.score >= 70 && !job.match.missingMandatory).slice(0, 5) : view === 'saved' ? ordered.filter(job => saved.includes(job.id)) : ordered;
  const firstName = profile.name?.trim().split(/\s+/)[0] || 'candidato';
  const initials = (profile.name ?? '').trim().split(/\s+/).filter(Boolean).filter((_, index, all) => index === 0 || index === all.length - 1).map(part => part[0]).join('') || '?';
  const complete = strength.items.filter(item => item.done).length;

  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
    <section aria-label="Apresentação do candidato" className={card}>
      <div className="flex items-center gap-4"><span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-violet-100 text-xl font-bold text-[#5B2BD6]">{initials}</span><div className="min-w-0"><h1 className="break-words text-2xl font-bold">Olá, {firstName}</h1><p className="mt-1 text-sm text-slate-600">{[profile.city, profile.state].filter(Boolean).join('/') || 'Adicione sua cidade no perfil'}</p></div></div>
      {profile.about?.trim() ? <p className="mt-4 line-clamp-2 text-base leading-relaxed text-slate-600">{profile.about}</p> : <Link href="/carreira/perfil#resumo" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#5B2BD6] underline">Adicionar resumo</Link>}
      <div className="mt-3 flex flex-wrap gap-2">{profile.skills.slice(0, 4).map(skill => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{skill}</span>)}{profile.skills.length > 4 && <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">+{profile.skills.length - 4}</span>}</div>
    </section>

    <section className={card}><h2 className="text-lg font-bold">Avaliações obrigatórias</h2><p className="mt-2 text-sm text-slate-600">Conclua português, matemática e redação para liberar o envio de candidaturas.</p><Link href="/carreira/avaliacoes" className={`${button} mt-4`}>Acessar avaliações</Link></section>

    <section aria-labelledby="strength-title" className={card}>
      <div className="flex flex-wrap items-center gap-4">
        <div role="progressbar" aria-label="Força do perfil" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={100} className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="none" stroke="#ede9fe" strokeWidth="7" /><circle cx="40" cy="40" r="34" fill="none" stroke="#5B2BD6" strokeWidth="7" strokeLinecap="round" strokeDasharray="213.63" strokeDashoffset={213.63 * (1 - strength.score / 100)} className="transition-all duration-500 motion-reduce:transition-none" /></svg>
          <span className="absolute inset-0 grid place-items-center text-xl font-bold">{strength.score}</span>
        </div>
        <div className="min-w-0 flex-1"><h2 id="strength-title" className="text-lg font-bold">Força do perfil</h2><p className="mt-1 text-sm text-slate-600">{strength.level.name}</p></div>
        <Link href="/carreira/perfil" className={`${button} w-full sm:w-auto`}>Completar perfil</Link>
      </div>
      <ul className="mt-4 space-y-2">{strength.missingItems.slice(0, 3).map(item => <li key={item.key}><Link href={`/carreira/perfil#${item.anchor}`} className="inline-flex min-h-10 items-center text-sm text-[#5B2BD6] underline">{item.key === 'about' ? item.tip : `${item.label} (+${item.points})`}</Link></li>)}</ul>
      <details className="mt-4 border-t pt-4"><summary className="cursor-pointer text-sm font-semibold">Missões de perfil · {complete} de {strength.items.length} concluídas</summary><progress aria-label="Missões concluídas" value={complete} max={strength.items.length} className="mt-4 h-2 w-full accent-[#5B2BD6]" /><ul className="mt-3 grid gap-2 sm:grid-cols-2">{strength.items.map(item => <li key={item.key}><Link href={`/carreira/perfil#${item.anchor}`} className="flex min-h-11 items-center gap-2 text-sm">{item.done ? <Check size={18} className="text-emerald-700" aria-hidden="true" /> : <Circle size={18} className="text-slate-400" aria-hidden="true" />}<span>{item.label} {item.done ? '— concluído' : `(+${item.points})`}</span></Link></li>)}</ul></details>
    </section>

    {error && <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">{error}<button type="button" onClick={() => void load()} className="ml-2 min-h-11 font-semibold underline">Tentar novamente</button></div>}
    <section id="candidaturas" aria-labelledby="applications-title" className="space-y-4">
      <div><h2 id="applications-title" className="text-xl font-bold">Candidaturas ativas</h2><p className="mt-1 text-sm text-slate-600">{loading ? 'Carregando candidaturas…' : `${applications.length} ${applications.length === 1 ? 'candidatura' : 'candidaturas'} · ${active.length} em andamento`}</p></div>
      {loading ? <p role="status" className={card}>Carregando…</p> : active.length ? active.map(item => <ApplicationCard key={item.id} application={item} />) : !error && <div className={card}><p className="text-base">{applications.length ? 'Nenhuma candidatura em andamento' : 'Você ainda não se candidatou'}</p><Link href="/carreiras/vagas" className={`${button} mt-4`}>Ver vagas</Link></div>}
    </section>

    <section aria-labelledby="jobs-title" className="space-y-4">
      <h2 id="jobs-title" className="text-xl font-bold">{view === 'recommended' ? 'Vagas para você' : view === 'saved' ? 'Vagas salvas' : 'Todas as vagas'}</h2>
      <div className="flex flex-wrap gap-2">{([['recommended', 'Para você'], ['all', 'Ver todas as vagas'], ['saved', `Vagas salvas (${saved.length})`]] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${view === id ? 'border-[#5B2BD6] bg-violet-50 text-[#5B2BD6]' : 'border-slate-200 bg-white'}`}>{label}</button>)}</div>
      {savedError && <p role="alert" className="text-sm text-rose-700">{savedError}</p>}
      {loading ? <p role="status" className={card}>Carregando vagas…</p> : visible.length ? <div className="grid gap-4 sm:grid-cols-2">{visible.map(job => {
        const tags = readableJobTags([...job.requirements, job.department, job.seniority]);
        return <article key={job.id} className={`${card} flex flex-col`}>
          <div className="flex items-center gap-3">{job.company?.logoUrl ? <img src={job.company.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" /> : <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-50 font-semibold text-[#5B2BD6]">{job.company?.name?.[0] || 'E'}</span>}<p className="min-w-0 flex-1 break-words text-sm text-slate-600">{job.company?.name}</p><button type="button" disabled={savedLoading || pending.includes(job.id)} aria-pressed={saved.includes(job.id)} aria-label={`${saved.includes(job.id) ? 'Remover vaga salva' : 'Salvar vaga'}: ${job.title}`} onClick={() => void toggleSaved(job.id)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[#5B2BD6] hover:bg-violet-50 disabled:opacity-50"><Bookmark size={20} fill={saved.includes(job.id) ? 'currentColor' : 'none'} /></button></div>
          <h3 className="mt-4 break-words text-lg font-bold">{job.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{jobLocationLine(job)}</p>
          {!!tags.length && <div className="mt-3 flex flex-wrap gap-2">{tags.map(tag => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{tag}</span>)}</div>}
          {job.match.hasProfile && <button type="button" onClick={() => setSelected(job)} className={`mt-4 min-h-11 self-start rounded-xl px-3 text-left text-sm font-semibold ${job.match.score >= 70 ? 'bg-violet-50 text-[#5B2BD6]' : 'bg-slate-100 text-slate-600'}`}>{job.match.score}% · {job.match.score >= 85 ? 'Alta compatibilidade' : job.match.score >= 70 ? 'Boa compatibilidade' : 'Compatibilidade parcial'}</button>}
          <Link href={`/carreiras/${encodeURIComponent(job.companyId)}/${encodeURIComponent(job.id)}`} className={`${button} mt-5`}>Ver vaga</Link>
        </article>;
      })}</div> : !error && <div className={card}><p>{view === 'recommended' ? 'Complete seu perfil para ver vagas melhores' : view === 'saved' ? 'Você ainda não salvou vagas.' : 'Nenhuma vaga aberta no momento.'}</p>{view === 'recommended' && <Link href="/carreira/perfil" className={`${button} mt-4`}>Completar meu perfil</Link>}</div>}
    </section>

    <details className={card}><summary className="cursor-pointer text-lg font-bold">Histórico ({history.length})</summary><div className="mt-5 space-y-4">{history.length ? history.map(item => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><h3 className="break-words font-semibold">{item.job}</h3><p className="mt-1 text-sm text-slate-600">{item.company} · {new Date(item.appliedAt).toLocaleDateString('pt-BR')}</p><span className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${item.status === 'HIRED' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{item.status === 'HIRED' ? 'Contratado 🎉' : item.statusLabel}</span></article>) : <p className="text-sm text-slate-600">Nenhuma candidatura finalizada.</p>}</div></details>
    {selected && <MatchDialog job={selected} onClose={() => setSelected(null)} />}
  </main>;
}
