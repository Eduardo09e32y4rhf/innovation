'use client';

import { Briefcase, CalendarClock, Copy, ExternalLink, Pencil, Plus, Search, Settings2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, ConfirmDialog, PageHeader } from '@/app/components/ui';
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

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Vagas"
        subtitle="Crie vagas, defina seu próprio processo seletivo e acompanhe cada candidato."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/carreiras`} target="_blank" className="btn btn-outline btn-md"><ExternalLink size={16} aria-hidden="true" /> Portal de carreiras</Link>
            {canManage && <Link href={`${base}/settings`} className="btn btn-outline btn-md"><Settings2 size={16} aria-hidden="true" /> Funil e tags</Link>}
            {canManage && <Link href={`${base}/new`} className="btn btn-primary btn-md"><Plus size={16} aria-hidden="true" /> Nova vaga</Link>}
          </div>
        }
      />

      <section aria-label="Resumo do recrutamento" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Vagas abertas', stats.data?.jobs.open, Briefcase],
          ['Candidaturas (30 dias)', stats.data?.applications.last30Days, Users],
          ['Aguardando análise', stats.data?.applications.waitingReview, CalendarClock],
          ['Contratados', stats.data?.applications.byStatus.HIRED, Users],
        ].map(([label, value, Icon]: any) => (
          <article key={label} className="card-v2 p-4">
            <div className="flex items-center justify-between text-fg-sub"><p className="text-sm">{label}</p><Icon size={18} aria-hidden="true" /></div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-fg">{value ?? '—'}</p>
          </article>
        ))}
      </section>

      {!!stats.data?.nextInterviews.length && (
        <section aria-label="Próximas entrevistas" className="card-v2 p-4">
          <h2 className="text-sm font-semibold text-fg">Próximas entrevistas</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.data.nextInterviews.map((item) => (
              <li key={item.id}>
                <Link href={`${base}/${item.jobId}`} className="block rounded-lg border border-border p-3 text-sm hover:bg-bg-sub">
                  <p className="font-medium text-fg">{item.candidateName}</p>
                  <p className="text-fg-sub">{item.jobTitle} · {new Date(item.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Filtros" className="card-v2 space-y-3 p-4">
        <div className="relative">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-fg-sub" />
          <input className="input-v2 !pl-10 w-full text-base sm:text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por cargo, departamento, local ou contrato" aria-label="Buscar vagas" />
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por status">
          {([['', 'Todas', counts.all], ['OPEN', 'Abertas', counts.OPEN], ['DRAFT', 'Rascunhos', counts.DRAFT], ['CLOSED', 'Encerradas', counts.CLOSED]] as const).map(([value, label, count]) => (
            <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => setStatus(value as JobStatus | '')}
              className={`btn btn-md ${status === value ? 'btn-primary' : 'btn-outline'}`}>{label} ({count})</button>
          ))}
        </div>
      </section>

      {jobs.error && <ErrorState message={jobs.error} onRetry={jobs.refetch} />}
      {jobs.loading && !jobs.data ? <LoadingState label="Carregando vagas…" /> : !jobs.data ? null : rows.length === 0 ? (
        <div className="card-v2 space-y-3 p-10 text-center">
          <Briefcase className="mx-auto text-fg-sub" size={32} aria-hidden="true" />
          <p className="font-medium text-fg">Você ainda não tem vagas.</p>
          <p className="text-sm text-fg-sub">Crie a primeira vaga, monte as perguntas e comece a receber candidaturas pelo portal.</p>
          {canManage && <Link href={`${base}/new`} className="btn btn-primary btn-md inline-flex"><Plus size={16} aria-hidden="true" /> Criar vaga</Link>}
        </div>
      ) : filtered.length === 0 ? <EmptyState message="Nenhuma vaga corresponde aos filtros." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((job) => {
            const total = job._count?.applications ?? 0;
            const expired = job.deadline && new Date(job.deadline) < new Date();
            return (
              <article key={job.id} className="card-v2 flex flex-col gap-4 p-5">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`${base}/${job.id}`} className="block truncate text-lg font-semibold text-fg hover:underline">{job.title}</Link>
                    <p className="mt-0.5 text-sm text-fg-sub">
                      {[job.department, job.location, job.workMode && WORK_MODE_LABEL[job.workMode], job.employmentType && (EMPLOYMENT_TYPE_LABEL[job.employmentType] ?? job.employmentType)].filter(Boolean).join(' · ') || 'Sem detalhes'}
                    </p>
                  </div>
                  <Pill tone={STATUS_TONE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Pill>
                </header>

                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="text-fg-sub">Candidatos</dt><dd className="font-semibold tabular-nums">{total}</dd></div>
                  <div><dt className="text-fg-sub">Novos</dt><dd className="font-semibold tabular-nums">{job.pipeline?.new ?? 0}</dd></div>
                  <div><dt className="text-fg-sub">Em processo</dt><dd className="font-semibold tabular-nums">{job.pipeline?.inProgress ?? 0}</dd></div>
                  <div><dt className="text-fg-sub">Remuneração</dt><dd className="font-medium">{salaryLabel(job)}</dd></div>
                  <div><dt className="text-fg-sub">Vagas</dt><dd className="font-medium">{job.openings}</dd></div>
                  <div><dt className="text-fg-sub">Aberta há</dt><dd className="font-medium">{daysSince(job.createdAt)} dia(s)</dd></div>
                </dl>

                {job.deadline && <p className={`text-xs ${expired ? 'text-rose-600' : 'text-fg-sub'}`}>{expired ? 'Prazo encerrado em ' : 'Inscrições até '}{new Date(job.deadline).toLocaleDateString('pt-BR')}</p>}

                <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <Link href={`${base}/${job.id}`} className="btn btn-primary btn-sm"><Users size={15} aria-hidden="true" /> Candidatos</Link>
                  {canManage && <Link href={`${base}/${job.id}/edit`} className="btn btn-outline btn-sm"><Pencil size={15} aria-hidden="true" /> Editar</Link>}
                  <Button size="sm" variant="outline" onClick={() => copy(job)}><Copy size={15} aria-hidden="true" /> Link</Button>
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
