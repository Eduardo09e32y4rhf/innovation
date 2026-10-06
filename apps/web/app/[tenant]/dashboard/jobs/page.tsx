'use client';

import { ArrowUpRight, BriefcaseBusiness, CalendarClock, Check, Copy, ExternalLink, MapPin, Plus, Search, Settings2, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, ConfirmDialog, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { Pill } from './_components/bits';
import { jobsApi } from './jobs-api';
import { EMPLOYMENT_TYPE_LABEL, JOB_STATUS_LABEL, WORK_MODE_LABEL, daysSince, salaryLabel, type Job, type JobStatus } from './types';

const ALLOWED_ROLES = new Set(['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR']);
const STATUS_TONE = { OPEN: 'success', DRAFT: 'warning', CLOSED: 'default' } as const;
const STATUS_FILTERS: { value: JobStatus | ''; label: string }[] = [
  { value: '', label: 'Todas' }, { value: 'OPEN', label: 'Abertas' },
  { value: 'DRAFT', label: 'Rascunhos' }, { value: 'CLOSED', label: 'Encerradas' },
];
const errorMessage = (cause: unknown) => cause instanceof ApiError ? cause.message : 'Não foi possível concluir a ação.';

export default function JobsPage() {
  const { tenant = '' } = useParams<{ tenant: string }>();
  const { user, company } = useAuth();
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const canAccess = ALLOWED_ROLES.has(role);
  const canManage = role !== 'GESTOR' && canAccess;
  const canConfigure = ['DEV', 'ADMIN', 'RH'].includes(role);
  const jobs = useQuery(() => jobsApi.list(), [company?.id], { enabled: canAccess });
  const stats = useQuery(() => jobsApi.stats(), [company?.id], { enabled: canAccess });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Job | null>(null);
  const base = `/${tenant}/dashboard/jobs`;
  const rows = jobs.data ?? [];
  const counts = useMemo(() => rows.reduce((result, job) => {
    result[job.status] += 1;
    return result;
  }, { all: rows.length, OPEN: 0, DRAFT: 0, CLOSED: 0 }), [rows]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((job) => (!status || job.status === status) && (!term || [job.title, job.location, job.department, job.employmentType, ...(job.benefits ?? [])].some((value) => value?.toLocaleLowerCase('pt-BR').includes(term))));
  }, [rows, search, status]);

  async function run(job: Job, action: () => Promise<unknown>, success: string) {
    if (busyId) return;
    setBusyId(job.id);
    try { await action(); toast.success(success); jobs.refetch(); stats.refetch(); }
    catch (cause) { toast.error(errorMessage(cause)); }
    finally { setBusyId(null); }
  }

  async function copy(job: Job) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/carreiras/${job.companyId}/${job.id}`);
      toast.success('Link público copiado.');
    } catch { toast.error('Não foi possível copiar o link.'); }
  }

  if (!canAccess) return <div className="p-6"><EmptyState message="Seu perfil não tem acesso ao módulo de vagas." /></div>;

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <PageHeader
        title="Vagas e recrutamento"
        subtitle="Gerencie oportunidades, acompanhe candidaturas e conduza cada processo seletivo."
        actions={<div className="flex flex-wrap items-center gap-2">
          <Link href="/carreiras" target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-bg px-4 text-sm font-semibold text-fg transition hover:bg-bg-sub"><ExternalLink size={16} aria-hidden="true" /> Portal de carreiras</Link>
          {canConfigure && <Link href={`${base}/settings`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-bg px-4 text-sm font-semibold text-fg transition hover:bg-bg-sub"><Settings2 size={16} aria-hidden="true" /> Configurar funil</Link>}
          {canManage && <Link href={`${base}/new`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-brand-700)]"><Plus size={17} aria-hidden="true" /> Nova vaga</Link>}
        </div>}
      />

      <section aria-label="Resumo do recrutamento" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Vagas abertas" value={stats.data?.jobs.open ?? counts.OPEN} icon={<BriefcaseBusiness size={19} />} detail={`${counts.OPEN} oportunidades publicadas`} />
        <Metric label="Candidaturas recentes" value={stats.data?.applications.last30Days ?? '—'} icon={<Users size={19} />} detail="Nos últimos 30 dias" />
        <Metric label="Aguardando análise" value={stats.data?.applications.waitingReview ?? '—'} icon={<CalendarClock size={19} />} detail="Precisam de atenção" />
        <Metric label="Contratados" value={stats.data?.applications.byStatus.HIRED ?? '—'} icon={<Check size={19} />} detail="Candidatos aprovados" />
      </section>

      {Boolean(stats.data?.nextInterviews.length) && <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 sm:p-5" aria-label="Próximas entrevistas">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-violet-950">Próximas entrevistas</h2><p className="mt-0.5 text-xs text-violet-800">Compromissos agendados nos processos seletivos.</p></div><CalendarClock size={19} className="text-violet-700" aria-hidden="true" /></div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {stats.data!.nextInterviews.map((item) => <li key={item.id}><Link href={`${base}/${item.jobId}`} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-violet-100 bg-white px-4 py-3 transition hover:border-violet-300 hover:shadow-sm"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-fg">{item.candidateName}</span><span className="block truncate text-xs text-fg-sub">{item.jobTitle}</span></span><span className="shrink-0 text-right text-xs font-medium text-violet-800">{new Date(item.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}<ArrowUpRight size={14} className="ml-auto mt-1" aria-hidden="true" /></span></Link></li>)}
        </ul>
      </section>}

      <section className="space-y-4" aria-label="Lista de vagas">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-bg p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filtrar vagas por status">
            {STATUS_FILTERS.map(({ value, label }) => <button key={value || 'all'} type="button" role="tab" aria-selected={status === value} onClick={() => setStatus(value)} className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold transition ${status === value ? 'bg-purple-50 text-[var(--color-brand)]' : 'text-fg-sub hover:bg-bg-sub hover:text-fg'}`}>{label}<span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${status === value ? 'bg-white text-[var(--color-brand)]' : 'bg-bg-sub text-fg-sub'}`}>{counts[value || 'all']}</span></button>)}
          </div>
          <label className="relative block w-full xl:max-w-sm"><Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-fg-sub" /><input className="input-v2 min-h-11 w-full rounded-xl pl-10 text-base sm:text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cargo, local, contrato ou benefício" aria-label="Buscar vagas" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-fg-sub hover:bg-bg-sub" aria-label="Limpar busca"><X size={15} /></button>}</label>
        </div>

        {jobs.error && <ErrorState message={jobs.error} onRetry={jobs.refetch} />}
        {jobs.loading && !jobs.data ? <LoadingState label="Carregando vagas..." /> : !jobs.data ? null : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-bg p-10 text-center sm:p-14"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-[var(--color-brand)]"><BriefcaseBusiness size={23} aria-hidden="true" /></span><h2 className="mt-4 text-lg font-semibold text-fg">Sua próxima contratação começa aqui</h2><p className="mx-auto mt-1 max-w-md text-sm text-fg-sub">Crie uma vaga e acompanhe candidatos desde a inscrição até a contratação.</p>{canManage && <Link href={`${base}/new`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)]"><Plus size={16} aria-hidden="true" /> Criar primeira vaga</Link>}</div> : filtered.length === 0 ? <EmptyState message="Nenhuma vaga corresponde à busca e aos filtros selecionados." /> : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((job) => <JobCard key={job.id} job={job} base={base} canManage={canManage} busy={busyId === job.id} onCopy={() => copy(job)} onRun={(action, success) => run(job, action, success)} onDelete={() => setToDelete(job)} />)}
          </div>
        )}
      </section>

      <ConfirmDialog isOpen={!!toDelete} onClose={() => setToDelete(null)} title="Excluir vaga" description={toDelete && (toDelete._count?.applications ?? 0) > 0 ? 'Esta vaga tem candidaturas. Ela será encerrada e o histórico dos candidatos, preservado.' : 'A vaga será removida definitivamente.'} confirmText="Excluir vaga" onConfirm={async () => {
        if (!toDelete) return;
        const job = toDelete;
        try { await jobsApi.remove(job.id); setToDelete(null); toast.success('Vaga removida ou encerrada conforme suas candidaturas.'); jobs.refetch(); stats.refetch(); }
        catch (cause) { toast.error(errorMessage(cause)); }
      }} />
    </div>
  );
}

function Metric({ label, value, icon, detail }: { label: string; value: string | number; icon: ReactNode; detail: string }) {
  return <article className="rounded-2xl border border-border bg-bg p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-fg-sub">{label}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-[var(--color-brand)]">{icon}</span></div><p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-fg">{value}</p><p className="mt-1 text-xs text-fg-sub">{detail}</p></article>;
}

function JobCard({ job, base, canManage, busy, onCopy, onRun, onDelete }: {
  job: Job; base: string; canManage: boolean; busy: boolean; onCopy: () => void;
  onRun: (action: () => Promise<unknown>, success: string) => void; onDelete: () => void;
}) {
  const total = job._count?.applications ?? 0;
  const fresh = job.pipeline?.new ?? 0;
  const inProgress = job.pipeline?.inProgress ?? 0;
  const rest = Math.max(0, total - fresh - inProgress);
  const expired = Boolean(job.deadline && new Date(job.deadline) < new Date());
  const daysLeft = job.deadline ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / 86_400_000) : null;
  const details = [job.department, job.location, job.workMode && WORK_MODE_LABEL[job.workMode], job.employmentType && (EMPLOYMENT_TYPE_LABEL[job.employmentType] ?? job.employmentType)].filter(Boolean);

  return <article className="flex min-w-0 flex-col rounded-2xl border border-border bg-bg shadow-sm transition hover:border-purple-300 hover:shadow-md">
    <div className="flex items-start gap-3 p-4 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-lg font-semibold text-[var(--color-brand)]">{job.title.trim().charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Pill tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Pill>{fresh > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">{fresh} novo{fresh === 1 ? '' : 's'}</span>}</div><Link href={`${base}/${job.id}`} className="mt-2 block truncate text-base font-semibold text-fg hover:text-[var(--color-brand)]">{job.title}</Link><p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-sub">{details.map((item, index) => <span key={String(item)} className="inline-flex items-center gap-1">{index === 1 && job.location && <MapPin size={12} aria-hidden="true" />}{item}</span>)}</p></div></div>
    <div className="px-4 pb-4 sm:px-5"><div className="flex items-end justify-between gap-3"><div><p className="text-2xl font-semibold tabular-nums text-fg">{total}</p><p className="text-xs text-fg-sub">candidaturas recebidas</p></div><p className="text-right text-xs text-fg-sub">{job.openings} vaga{job.openings === 1 ? '' : 's'} · publicada há {daysSince(job.createdAt)} dia{daysSince(job.createdAt) === 1 ? '' : 's'}</p></div><div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-bg-sub" aria-label={`${fresh} novos, ${inProgress} em processo e ${rest} em outras etapas`}>{total > 0 && <><span className="bg-rose-400" style={{ width: `${fresh / total * 100}%` }} /><span className="bg-violet-500" style={{ width: `${inProgress / total * 100}%` }} /><span className="bg-slate-300" style={{ width: `${rest / total * 100}%` }} /></>}</div><p className="mt-2 text-xs text-fg-sub">{fresh} novos · {inProgress} em processo · {rest} em outras etapas</p>
      {job.deadline && <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${expired ? 'bg-rose-50 text-rose-700' : daysLeft !== null && daysLeft <= 3 ? 'bg-amber-50 text-amber-800' : 'bg-bg-sub text-fg-sub'}`}>{expired ? 'Inscrições encerradas em ' : daysLeft !== null && daysLeft <= 3 ? `Últimos ${Math.max(daysLeft, 0)} dia(s) · até ` : 'Inscrições até '}{new Date(job.deadline).toLocaleDateString('pt-BR')}</p>}
      <p className="mt-3 text-xs font-semibold text-fg">{salaryLabel(job)}</p>
    </div>
    <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5"><Link href={`${base}/${job.id}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--color-brand-700)]"><Users size={14} aria-hidden="true" /> Candidatos</Link>{canManage && <Link href={`${base}/${job.id}/edit`} className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-fg hover:bg-bg-sub">Editar</Link>}<Button size="sm" variant="outline" onClick={onCopy} aria-label={`Copiar link público de ${job.title}`}><Copy size={14} aria-hidden="true" /></Button>{canManage && <><Button size="sm" variant="ghost" isLoading={busy} onClick={() => onRun(() => jobsApi.update(job.id, { status: job.status === 'OPEN' ? 'CLOSED' : 'OPEN' }), job.status === 'OPEN' ? 'Vaga encerrada.' : 'Vaga publicada.')}>{job.status === 'OPEN' ? 'Encerrar' : 'Publicar'}</Button><Button size="sm" variant="ghost" onClick={() => onRun(() => jobsApi.duplicate(job.id), 'Vaga duplicada como rascunho.')}>Duplicar</Button><Button size="sm" variant="ghost" className="text-rose-700" onClick={onDelete}>Excluir</Button></>}</footer>
  </article>;
}
