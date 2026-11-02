'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { candidateApi, isUnauthorized, setCandidateToken, type CandidateApplication, type CandidateInvite } from '../_lib/candidate-api';
import { matchJobs, monthLabel, profileStrength, type JobMatch } from '../_lib/profile-insights';
import { employmentTypeLabel, getPublicJobsCatalog, workModeLabel } from '../_lib/public-jobs';
import { useCandidateSession } from './_components/account-shell';

const STEPS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'] as const;
const STEP_LABEL: Record<string, string> = { APPLIED: 'Recebida', SCREENING: 'Em análise', INTERVIEW: 'Entrevista', OFFER: 'Proposta', HIRED: 'Contratação' };
const POLL_MS = 30_000;
const card = 'rounded-[18px] border border-[#ebe6f3] bg-white shadow-[0_1px_2px_rgba(30,17,69,0.04)]';

/** Entrevista marcada: data (fuso de quem esta vendo), formato e o que fazer (entrar no link ou ver o mapa). */
function InterviewCard({ interview }: { interview: NonNullable<CandidateApplication['interview']> }) {
  const date = new Date(interview.scheduledAt);
  const online = interview.mode === 'ONLINE';
  const when = date.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="rounded-[14px] border border-[#e4d9f4] bg-[#f8f5fd] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#5b29be]">Entrevista marcada · {online ? 'online' : 'presencial'}</p>
      <p className="mt-1 text-base font-bold text-[#1e1145]">{when.charAt(0).toUpperCase() + when.slice(1)}</p>
      {interview.durationMinutes ? <p className="text-sm text-[#5b5473]">Cerca de {interview.durationMinutes} minutos.</p> : null}
      {!online && interview.location ? <p className="mt-1 break-words text-sm text-[#241b38]">{interview.location}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {online && interview.meetingUrl ? <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-[10px] bg-[#7240da] px-4 text-sm font-semibold text-white hover:bg-[#5b29be]">Entrar na reunião</a> : null}
        {!online && interview.location ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(interview.location)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-[10px] border border-[#d9cdee] bg-white px-4 text-sm font-semibold text-[#5b29be] hover:bg-[#f0eafa]">Como chegar</a> : null}
      </div>
    </div>
  );
}

function Stepper({ status }: { status: string }) {
  const rejected = status === 'REJECTED';
  const current = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Etapas da candidatura">
      {STEPS.map((step, index) => {
        const done = !rejected && current >= index;
        const active = !rejected && current === index;
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="space-y-1.5">
            <span className={`block h-1.5 rounded-full ${done ? 'bg-[#7240da]' : 'bg-[#ece8f5]'}`} />
            <span className={`block truncate text-[11px] ${active ? 'font-bold text-[#241b38]' : 'text-[#7a7290]'}`}>{STEP_LABEL[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Funnel({ rows, status }: { rows: NonNullable<CandidateApplication['funnel']>; status: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count ?? 0));
  return (
    <div className="space-y-2" role="group" aria-label="Quantas pessoas estão em cada etapa desta vaga">
      <p className="text-xs font-semibold text-[#5b5473]">Pessoas em cada etapa agora</p>
      {rows.map((row) => (
        <div key={row.status} className="grid grid-cols-[minmax(0,130px)_1fr_auto] items-center gap-3 text-xs">
          <span className={row.status === status ? 'font-bold' : ''}>{row.stage}{row.status === status ? ' · você' : ''}</span>
          <span className="h-2 overflow-hidden rounded-full bg-[#ece8f5]"><span className={`block h-full rounded-full ${row.status === status ? 'bg-[#7240da]' : 'bg-[#c9b8f0]'}`} style={{ width: `${row.count === null ? 8 : Math.max(6, Math.round((row.count / max) * 100))}%` }} /></span>
          <span className="min-w-[72px] text-right font-semibold">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const radius = 44;
  const length = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Força do perfil: ${score} de 100`}>
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
      <circle cx="50" cy="50" r={radius} fill="none" stroke="url(#ring)" strokeWidth="8" strokeLinecap="round" strokeDasharray={length} strokeDashoffset={length * (1 - score / 100)} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset .8s ease' }} />
      <defs><linearGradient id="ring" x1="0" x2="1"><stop offset="0" stopColor="#c4b0ff" /><stop offset="1" stopColor="#ffffff" /></linearGradient></defs>
      <text x="50" y="49" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">{score}</text>
      <text x="50" y="66" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.75)">de 100</text>
    </svg>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#7a7290]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[#1e1145]">{value}</p>
      {hint && <p className="text-xs text-[#7a7290]">{hint}</p>}
    </div>
  );
}

function JobCard({ match, applied }: { match: JobMatch; applied: boolean }) {
  const { job } = match;
  const meta = [job.location, workModeLabel(job.workMode), employmentTypeLabel(job.employmentType)].filter(Boolean).join(' · ');
  return (
    <Link href={`/carreiras/${job.companyId}/${job.id}`} className={`${card} group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-[#cbb9f2] hover:shadow-[0_8px_24px_rgba(114,64,218,0.12)]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-bold leading-snug text-[#1e1145] group-hover:text-[#5b29be]">{job.title}</p>
          <p className="truncate text-sm text-[#5b5473]">{job.company?.name ?? 'Empresa'}</p>
        </div>
        {match.percent > 0 && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{match.percent}%</span>}
      </div>
      {meta && <p className="text-xs text-[#7a7290]">{meta}</p>}
      <div className="mt-auto flex flex-wrap gap-1.5">
        {applied && <span className="rounded-full bg-[#f0eafa] px-2 py-0.5 text-[11px] font-semibold text-[#5b29be]">Você já se candidatou</span>}
        {match.reasons.slice(0, 3).map((reason) => <span key={reason} className="rounded-full bg-[#f6f4fa] px-2 py-0.5 text-[11px] text-[#5b5473]">{reason}</span>)}
      </div>
    </Link>
  );
}

export function ApplicationsView() {
  const { profile, signOut } = useCandidateSession();
  const [items, setItems] = useState<CandidateApplication[] | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [invites, setInvites] = useState<CandidateInvite[]>([]);
  const [matches, setMatches] = useState<JobMatch[] | null>(null);
  const strength = useMemo(() => profileStrength(profile), [profile]);

  const load = useCallback(async () => {
    try {
      const result = await candidateApi.applications();
      setItems(result.applications); setAppliedIds(result.appliedJobIds ?? []); setUpdatedAt(new Date()); setError('');
      candidateApi.invites().then(setInvites).catch(() => undefined);
    } catch (cause) {
      if (isUnauthorized(cause)) { setCandidateToken(null); await signOut(); return; }
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar suas candidaturas.');
    }
  }, [signOut]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    let active = true;
    getPublicJobsCatalog().then(({ jobs }) => { if (active) setMatches(matchJobs(profile, jobs)); }).catch(() => { if (active) setMatches([]); });
    return () => { active = false; };
  }, [profile]);

  async function decline(id: string) {
    try { await candidateApi.declineInvite(id); setInvites((list) => list.map((item) => (item.id === id ? { ...item, status: 'DECLINED' } : item))); } catch { /* tenta de novo no próximo ciclo */ }
  }
  async function withdraw(id: string, job: string) {
    if (!window.confirm(`Desistir da vaga "${job}"? A empresa será avisada e você não continuará no processo.`)) return;
    try { await candidateApi.withdraw(id); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a desistência.'); }
  }
  const pendingInvites = invites.filter((item) => item.status === 'SENT');
  const inProgress = (items ?? []).filter((item) => !['REJECTED', 'HIRED'].includes(item.status) && !item.closed).length;
  const firstName = (profile.name ?? '').trim().split(/\s+/)[0] || 'candidato(a)';
  const initials = (profile.name || profile.email).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const latestJob = profile.experience?.[0];
  const topEducation = profile.education?.[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const subtitle = [profile.profession, [profile.city, profile.state].filter(Boolean).join(' - ')].filter(Boolean).join(' · ');

  return (
    <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Cabeçalho com a força do perfil */}
      <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#1e1145_0%,#3b1d8f_55%,#7240da_100%)] p-6 text-white sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-extrabold ring-1 ring-white/30">{initials}</span>
            <div className="min-w-0">
              <p className="text-sm text-white/70">{greeting}, {firstName}</p>
              <h1 className="break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{profile.name || profile.email}</h1>
              <p className="text-sm text-white/80">{subtitle || 'Adicione seu título profissional e sua cidade'}</p>
              {(profile.skills ?? []).length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">{profile.skills.slice(0, 6).map((skill) => <li key={skill} className="rounded-full bg-white/12 px-2.5 py-0.5 text-xs ring-1 ring-white/20">{skill}</li>)}</ul>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ScoreRing score={strength.score} />
            <div className="max-w-[220px]">
              <p className="text-xs uppercase tracking-wider text-white/70">Força do perfil</p>
              <p className="text-xl font-extrabold">{strength.level.name}</p>
              <p className="text-xs leading-5 text-white/80">{strength.level.note}</p>
              <Link href="/carreiras/conta/perfil" className="mt-2 inline-flex min-h-10 items-center rounded-[10px] bg-white px-4 text-sm font-bold text-[#3b1d8f] hover:bg-[#f0eafa]">{strength.score >= 90 ? 'Atualizar perfil' : 'Melhorar meu perfil'}</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Candidaturas" value={items?.length ?? '–'} />
        <Stat label="Em andamento" value={items ? inProgress : '–'} />
        <Stat label="Convites" value={pendingInvites.length} hint={pendingInvites.length ? 'Empresas querem você' : 'Perfil completo atrai convites'} />
        <Stat label="Vagas para você" value={matches?.length ?? '–'} hint="Conforme seu perfil" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {pendingInvites.length > 0 && (
            <section aria-label="Convites" className={`${card} space-y-3 border-[#d9ccf7] bg-[#faf7ff] p-5`}>
              <h2 className="text-base font-bold">Convites para vagas ({pendingInvites.length})</h2>
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#ebe6f3] bg-white p-3">
                  <div className="min-w-0"><p className="break-words font-semibold">{invite.job}</p><p className="text-sm text-[#5b5473]">{invite.company}{invite.message ? ` · “${invite.message}”` : ''}</p></div>
                  <div className="flex gap-2">
                    {invite.open && <Link href={`/carreiras/${invite.companyId}/${invite.jobId}`} className="inline-flex min-h-11 items-center rounded-[10px] bg-[#7240da] px-4 text-sm font-semibold text-white hover:bg-[#5b29be]">Ver vaga</Link>}
                    <button type="button" onClick={() => void decline(invite.id)} className="min-h-11 rounded-[10px] border border-[#d5cceb] px-4 text-sm font-semibold hover:bg-[#f1ecfb]">Agora não</button>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section aria-labelledby="para-voce" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div><h2 id="para-voce" className="text-lg font-bold">Vagas para você</h2>
                <p className="text-sm text-[#5b5473]">Escolhidas pelo seu cargo, experiência, formação, competências e cidade.</p></div>
              <Link href="/carreiras" className="min-h-11 content-center text-sm font-semibold text-[#7240da] hover:underline">Ver todas as vagas →</Link>
            </div>
            {!matches && <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className={`${card} h-32 animate-pulse bg-[#f6f4fa]`} />)}</div>}
            {matches && matches.length === 0 && (
              <div className={`${card} p-6 text-sm text-[#5b5473]`}>Ainda não encontramos vagas abertas que combinem com você. Adicione <Link className="font-semibold text-[#7240da] underline" href="/carreiras/conta/perfil#competencias">competências</Link> e <Link className="font-semibold text-[#7240da] underline" href="/carreiras/conta/perfil#experiencia">experiências</Link> para ampliar as recomendações.</div>
            )}
            {matches && matches.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{matches.map((match) => <JobCard key={match.job.id} match={match} applied={appliedIds.includes(match.job.id)} />)}</div>}
          </section>

          <section aria-labelledby="minhas" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="minhas" className="text-lg font-bold">Minhas candidaturas</h2>
              {updatedAt && <p className="text-xs text-[#7a7290]">Atualizado às {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tentar de novo</button></p>}
            {!items && !error && <div className={`${card} h-24 animate-pulse bg-[#f6f4fa]`} role="status" aria-label="Carregando candidaturas" />}
            {items && items.length === 0 && (
              <div className={`${card} flex flex-wrap items-center justify-between gap-4 p-6`}>
                <div><p className="font-semibold">Você ainda não se candidatou a nenhuma vaga.</p>
                  <p className="mt-1 text-sm text-[#5b5473]">Comece pelas vagas recomendadas acima: o andamento de cada uma aparece aqui, em tempo real.</p></div>
                <Link href="/carreiras" className="inline-flex min-h-11 items-center rounded-[10px] bg-[#7240da] px-5 text-sm font-semibold text-white hover:bg-[#5b29be]">Explorar vagas</Link>
              </div>
            )}
            {items?.map((item) => (
              <article key={item.id} className={`${card} space-y-4 p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="break-words text-base font-bold">{item.job}</h3><p className="text-sm text-[#5b5473]">{item.company} · enviada em {new Date(item.appliedAt).toLocaleDateString('pt-BR')}</p></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'REJECTED' ? 'bg-rose-50 text-rose-800' : item.status === 'HIRED' ? 'bg-emerald-50 text-emerald-800' : 'bg-[#f0eafa] text-[#5b29be]'}`}>{item.statusLabel}{item.stage && item.stage !== item.statusLabel ? ` · ${item.stage}` : ''}</span>
                </div>
                <Stepper status={item.status} />
                {item.interview && <InterviewCard interview={item.interview} />}
                {item.closed && <p className="text-xs text-[#5b5473]">Esta vaga foi encerrada.</p>}
                {!['REJECTED', 'HIRED'].includes(item.status) && !item.closed && (
                  <button type="button" onClick={() => void withdraw(item.id, item.job)} className="min-h-11 text-sm font-semibold text-rose-700 hover:underline">Desistir desta candidatura</button>
                )}
                {item.funnel && <Funnel rows={item.funnel} status={item.status} />}
                {item.timeline.length > 0 && (
                  <details className="text-sm"><summary className="min-h-11 cursor-pointer content-center font-semibold text-[#7240da]">Histórico</summary>
                    <ul className="mt-2 space-y-1">{item.timeline.map((event, index) => <li key={index} className="text-[#5b5473]"><time dateTime={event.at}>{new Date(event.at).toLocaleDateString('pt-BR')}</time> — {event.label}</li>)}</ul>
                  </details>
                )}
              </article>
            ))}
          </section>
        </div>

        <aside className="space-y-4">
          <section className={`${card} p-5`} aria-labelledby="proximos">
            <h2 id="proximos" className="text-base font-bold">{strength.next.length ? 'Próximos passos' : 'Perfil completo 🎉'}</h2>
            <p className="mt-1 text-xs text-[#5b5473]">{strength.next.length ? 'Cada item aumenta a força do seu perfil e as vagas recomendadas.' : 'Mantenha suas experiências e competências sempre atualizadas.'}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ece8f5]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#9b7cf0,#7240da)] transition-all" style={{ width: `${strength.score}%` }} /></div>
            <ul className="mt-4 space-y-2">
              {strength.next.slice(0, 4).map((item) => (
                <li key={item.key}>
                  <Link href={`/carreiras/conta/perfil#${item.anchor}`} className="flex items-start gap-3 rounded-[12px] border border-[#f0ecf6] p-3 hover:border-[#cbb9f2] hover:bg-[#faf7ff]">
                    <span className="mt-0.5 shrink-0 rounded-md bg-[#f0eafa] px-1.5 py-0.5 text-[11px] font-bold text-[#5b29be]">+{item.points}</span>
                    <span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs leading-5 text-[#5b5473]">{item.tip}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} p-5`} aria-labelledby="resumo">
            <div className="flex items-center justify-between"><h2 id="resumo" className="text-base font-bold">Seu perfil</h2><Link href="/carreiras/conta/perfil" className="text-sm font-semibold text-[#7240da] hover:underline">Editar</Link></div>
            <dl className="mt-3 space-y-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7a7290]">Experiência</dt>
                <dd>{latestJob ? <><span className="font-semibold">{latestJob.role}</span>{latestJob.company ? ` · ${latestJob.company}` : ''}<span className="block text-xs text-[#7a7290]">{monthLabel(latestJob.start)}{latestJob.start ? ' – ' : ''}{latestJob.current ? 'atual' : monthLabel(latestJob.end)}{profile.experience.length > 1 ? ` · +${profile.experience.length - 1} experiência(s)` : ''}</span></> : <Link href="/carreiras/conta/perfil#experiencia" className="text-[#7240da] underline">Adicionar experiência</Link>}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7a7290]">Formação</dt>
                <dd>{topEducation ? <><span className="font-semibold">{topEducation.course || topEducation.level}</span>{topEducation.school ? ` · ${topEducation.school}` : ''}<span className="block text-xs text-[#7a7290]">{topEducation.level} · {topEducation.status}</span></> : <Link href="/carreiras/conta/perfil#formacao" className="text-[#7240da] underline">Adicionar formação</Link>}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7a7290]">Currículo</dt>
                <dd>{profile.resume?.name ? <span className="font-semibold">✓ {profile.resume.name}</span> : <Link href="/carreiras/conta/perfil#curriculo" className="text-[#7240da] underline">Anexar currículo</Link>}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7a7290]">Banco de talentos</dt>
                <dd>{profile.talentPoolConsent ? <span className="font-semibold text-emerald-700">Visível para recrutadores</span> : <Link href="/carreiras/conta/perfil#autorizacoes" className="text-[#7240da] underline">Ativar para receber convites</Link>}</dd></div>
            </dl>
          </section>

          <section className="rounded-[18px] bg-[#f6f2ff] p-5 text-sm leading-6 text-[#3b2f5c]">
            <p className="font-bold">Dica do RH</p>
            <p className="mt-1">Recrutadores leem primeiro o título e a última experiência. Descreva resultados (“reduzi o tempo de fechamento em 2 dias”) em vez de só tarefas.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
