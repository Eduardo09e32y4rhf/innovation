'use client';

import { Briefcase, CalendarClock, Clock, Copy, ExternalLink, Pencil, Plus, Search, Settings2, Sparkles, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, ConfirmDialog } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { Pill } from './_components/bits';
import { jobsApi } from './jobs-api';
import { EMPLOYMENT_TYPE_LABEL, JOB_STATUS_LABEL, WORK_MODE_LABEL, daysSince, salaryLabel, type Job, type JobStatus } from './types';

const ALLOWED_ROLES = new Set(['DEV', 'ADMIN', 'RH', 'GESTOR']);
const STATUS_TONE = { OPEN: 'success', DRAFT: 'warning', CLOSED: 'default' } as const;

export default function JobsPage() {
  const { tenant = '' } = useParams<{ tenant: string }>();
  const { user, company } = useAuth();
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const canAccess = ALLOWED_ROLES.has(role);
  const canManage = role !== 'GESTOR' && canAccess;
  const jobs = useQuery(() => jobsApi.list(), [company?.id], { enabled: canAccess });
  const stats = useQuery(() => jobsApi.stats(), [company?.id], { enabled: canAccess });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Job | null>(null);
  const base = `/${tenant}/dashboard/jobs`;

  const rows = jobs.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((job) =>
      (!status || job.status === status) &&
      (!term || [job.title, job.location, job.department, job.employmentType].some((value) => value?.toLocaleLowerCase('pt-BR').includes(term))),
    );
  }, [rows, search, status]);
  const counts = { all: rows.length, OPEN: 0, DRAFT: 0, CLOSED: 0 } as Record<string, number>;
  rows.forEach((job) => { counts[job.status] += 1; });

  async function run(job: Job, action: () => Promise<unknown>, success: string) {
    if (busyId) return;
    setBusyId(job.id);
    try { await action(); toast.success(success); jobs.refetch(); stats.refetch(); }
    catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível concluir a ação.'); }
    finally { setBusyId(null); }
  }

  async function copy(job: Job) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/carreiras/${job.companyId}/${job.id}`); toast.success('Link público copiado.'); }
    catch { toast.error('Não foi possível copiar o link.'); }
  }

  if (!canAccess) return <div className="p-6"><EmptyState message="Seu perfil não tem acesso ao módulo de vagas." /></div>;

  const accent = { OPEN: 'from-emerald-500 to-teal-500', DRAFT: 'from-amber-400 to-orange-500', CLOSED: 'from-slate-300 to-slate-400' } as const;
  const kpis = [
    { label: 'Vagas abertas', value: stats.data?.jobs.open, icon: Briefcase, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Candidaturas em 30 dias', value: stats.data?.applications.last30Days, icon: Users, tone: 'bg-sky-50 text-sky-600' },
    { label: 'Aguardando análise', value: stats.data?.applications.waitingReview, icon: Clock, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Contratados', value: stats.data?.applications.byStatus.HIRED, icon: Trophy, tone: 'bg-violet-50 text-violet-600' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-teal-700 p-6 text-white shadow-lg sm:p-9">
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest"><Sparkles size={13} aria-hidden="true" /> Recrutamento</p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Encontre as pessoas certas para o seu time</h1>
            <p className="mt-2 text-sm text-white/80 sm:text-base">Publique vagas, monte seu processo seletivo e acompanhe cada candidato do primeiro contato à contratação.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/carreiras" target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold backdrop-blur hover:bg-white/20"><ExternalLink size={16} aria-hidden="true" /> Portal de carreiras</Link>
            {canManage && <Link href={`${base}/settings`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold backdrop-blur hover:bg-white/20"><Settings2 size={16} aria-hidden="true" /> Funil e tags</Link>}
            {canManage && <Link href={`${base}/new`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 shadow hover:bg-slate-100"><Plus size={16} aria-hidden="true" /> Nova vaga</Link>}
          </div>
        </div>
      </section>

      <section aria-label="Resumo do recrutamento" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="flex items-center gap-4 rounded-2xl border border-border bg-bg p-4 shadow-sm">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={22} aria-hidden="true" /></span>
            <div className="min-w-0"><p className="text-2xl font-black tabular-nums text-fg">{value ?? '—'}</p><p className="truncate text-xs font-medium text-fg-sub">{label}</p></div>
          </article>
        ))}
      </section>

      {!!stats.data?.nextInterviews.length && (
        <section aria-label="Próximas entrevistas" className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-indigo-900"><CalendarClock size={16} aria-hidden="true" /> Próximas entrevistas</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.data.nextInterviews.map((item) => (
              <li key={item.id}>
                <Link href={`${base}/${item.jobId}`} className="block rounded-xl border border-indigo-100 bg-white p-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow">
                  <p className="font-semibold text-fg">{item.candidateName}</p>
                  <p className="text-fg-sub">{item.jobTitle} · {new Date(item.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Filtros" className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por status">
          {([['', 'Todas', counts.all], ['OPEN', 'Abertas', counts.OPEN], ['DRAFT', 'Rascunhos', counts.DRAFT], ['CLOSED', 'Encerradas', counts.CLOSED]] as const).map(([value, label, count]) => (
            <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => setStatus(value as JobStatus | '')}
              className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${status === value ? 'bg-slate-900 text-white shadow' : 'border border-border bg-bg text-fg-sub hover:bg-bg-sub'}`}>
              {label} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${status === value ? 'bg-white/20' : 'bg-bg-sub'}`}>{count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-fg-sub" />
          <input className="input-v2 !rounded-full !pl-10 w-full text-base sm:text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por cargo, local ou contrato" aria-label="Buscar vagas" />
        </div>
      </section>

      {jobs.error && <ErrorState message={jobs.error} onRetry={jobs.refetch} />}
      {jobs.loading && !jobs.data ? <LoadingState label="Carregando vagas…" /> : !jobs.data ? null : rows.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Briefcase size={30} aria-hidden="true" /></span>
          <p className="mt-4 text-lg font-bold text-fg">Sua primeira vaga começa aqui</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-fg-sub">Crie a vaga, monte as perguntas e comece a receber candidaturas pelo portal de carreiras.</p>
          {canManage && <Link href={`${base}/new`} className="btn btn-primary btn-md mt-5 inline-flex"><Plus size={16} aria-hidden="true" /> Criar vaga</Link>}
        </div>
      ) : filtered.length === 0 ? <EmptyState message="Nenhuma vaga corresponde aos filtros." /> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((job) => {
            const total = job._count?.applications ?? 0;
            const fresh = job.pipeline?.new ?? 0;
            const inProgress = job.pipeline?.inProgress ?? 0;
            const rest = Math.max(0, total - fresh - inProgress);
            const expired = job.deadline && new Date(job.deadline) < new Date();
            const daysLeft = job.deadline ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / 86_400_000) : null;
            const details = [job.department, job.location, job.workMode && WORK_MODE_LABEL[job.workMode], job.employmentType && (EMPLOYMENT_TYPE_LABEL[job.employmentType] ?? job.employmentType)].filter(Boolean);
            return (
              <article key={job.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className={`h-1.5 bg-gradient-to-r ${accent[job.status]}`} />
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <header className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 text-lg font-black text-white shadow">{job.title.trim().charAt(0).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`${base}/${job.id}`} className="block truncate text-lg font-bold text-fg group-hover:text-indigo-700">{job.title}</Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5"><Pill tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Pill>{fresh > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{fresh} novo(s)</span>}</div>
                    </div>
                  </header>

                  {details.length > 0 && <div className="flex flex-wrap gap-1.5">{details.map((item) => <span key={String(item)} className="rounded-lg bg-bg-sub px-2 py-1 text-xs font-medium text-fg-sub">{item}</span>)}</div>}

                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm"><span className="font-semibold text-fg">{total} candidato(s)</span><span className="text-xs text-fg-sub">{job.openings} vaga(s)</span></div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-bg-sub" aria-hidden="true">
                      {total > 0 && <><div className="bg-rose-400" style={{ width: `${(fresh / total) * 100}%` }} /><div className="bg-indigo-400" style={{ width: `${(inProgress / total) * 100}%` }} /><div className="bg-slate-300" style={{ width: `${(rest / total) * 100}%` }} /></>}
                    </div>
                    <p className="mt-1.5 text-xs text-fg-sub">{fresh} novos · {inProgress} em processo</p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-fg-sub">
                    <span className="font-semibold text-fg">{salaryLabel(job)}</span>
                    <span>há {daysSince(job.createdAt)} dia(s)</span>
                  </div>
                  {job.deadline && <p className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${expired ? 'bg-rose-50 text-rose-700' : daysLeft !== null && daysLeft <= 3 ? 'bg-amber-50 text-amber-700' : 'bg-bg-sub text-fg-sub'}`}>{expired ? 'Inscrições encerradas em ' : daysLeft !== null && daysLeft <= 3 ? `Últimos ${Math.max(daysLeft, 0)} dia(s) · até ` : 'Inscrições até '}{new Date(job.deadline).toLocaleDateString('pt-BR')}</p>}
                </div>

                <footer className="flex flex-wrap items-center gap-1.5 border-t border-border bg-bg-sub/40 px-4 py-3">
                  <Link href={`${base}/${job.id}`} className="btn btn-primary btn-sm"><Users size={15} aria-hidden="true" /> Candidatos</Link>
                  {canManage && <Link href={`${base}/${job.id}/edit`} className="btn btn-outline btn-sm"><Pencil size={15} aria-hidden="true" /> Editar</Link>}
                  <Button size="sm" variant="outline" onClick={() => copy(job)} aria-label="Copiar link público"><Copy size={15} aria-hidden="true" /></Button>
                  {canManage && (
                    <>
                      <Button size="sm" variant="ghost" isLoading={busyId === job.id} onClick={() => run(job, () => jobsApi.update(job.id, { status: job.status === 'OPEN' ? 'CLOSED' : 'OPEN' }), job.status === 'OPEN' ? 'Vaga encerrada.' : 'Vaga publicada.')}>
                        {job.status === 'OPEN' ? 'Encerrar' : 'Publicar'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => run(job, () => jobsApi.duplicate(job.id), 'Vaga duplicada como rascunho.')}>Duplicar</Button>
                      <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => setToDelete(job)}>Excluir</Button>
                    </>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Excluir vaga"
        description={toDelete && (toDelete._count?.applications ?? 0) > 0 ? 'Esta vaga tem candidaturas. Ela será encerrada e o histórico, preservado.' : 'A vaga será removida definitivamente.'}
        confirmText="Excluir"
        onConfirm={async () => {
          if (!toDelete) return;
          const job = toDelete;
          await jobsApi.remove(job.id);
          setToDelete(null);
          toast.success('Vaga removida ou encerrada conforme suas candidaturas.');
          jobs.refetch(); stats.refetch();
        }}
      />
    </div>
  );
}
