'use client';

import { Briefcase, Copy, Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { PageHeader } from '@/app/components/ui/page-header';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { JobFormModal } from './job-form-modal';
import { jobsApi } from './jobs-api';
import { EMPLOYMENT_TYPE_LABEL, JOB_STATUS_LABEL, getApplicationCount, type Job, type JobPayload, type JobStatus } from './types';
const ALLOWED_ROLES = new Set(['DEV', 'ADMIN', 'RH', 'GESTOR']);
export default function JobsPage() {
  const { tenant = '' } = useParams<{ tenant: string }>();
  const { user, company } = useAuth();
  const canAccess = ALLOWED_ROLES.has((user?.profile ?? user?.role ?? '').toUpperCase());
  const jobs = useQuery(() => jobsApi.list(), [company?.id], { enabled: canAccess });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const mutation = useRef(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setModalOpen(false); setEditingJob(null); setJobToDelete(null); setError(''); }, [company?.id, user?.id]);
  const rows = jobs.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return rows.filter(job => (!status || job.status === status) && (!term ||
      [job.title, job.location, job.employmentType, job.description, ...(job.benefits ?? [])]
        .some(value => value?.toLocaleLowerCase('pt-BR').includes(term))));
  }, [rows, search, status]);
  function clear() { setSearch(''); setStatus(''); }
  async function save(payload: JobPayload) {
    if (mutation.current) return;
    mutation.current = true; setSaving(true);
    try {
      if (editingJob) await jobsApi.update(editingJob.id, payload); else await jobsApi.create(payload);
      toast.success(editingJob ? 'Vaga atualizada.' : 'Vaga criada.');
      setModalOpen(false); setEditingJob(null); jobs.refetch();
    } finally { mutation.current = false; setSaving(false); }
  }
  async function toggle(job: Job) {
    if (mutation.current) return;
    mutation.current = true; setBusyId(job.id); setError('');
    try {
      const next: JobStatus = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      await jobsApi.update(job.id, { status: next });
      toast.success(next === 'OPEN' ? 'Vaga publicada.' : 'Vaga encerrada.'); jobs.refetch();
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Não foi possível alterar o status.'); }
    finally { mutation.current = false; setBusyId(null); }
  }
  async function remove() {
    if (!jobToDelete || mutation.current) return;
    mutation.current = true; setBusyId(jobToDelete.id); setError('');
    try { await jobsApi.remove(jobToDelete.id); setJobToDelete(null); toast.success('Vaga removida ou encerrada conforme suas candidaturas.'); jobs.refetch(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Não foi possível excluir a vaga.'); }
    finally { mutation.current = false; setBusyId(null); }
  }
  async function copy(job: Job) {
    try { await navigator.clipboard.writeText(window.location.origin + '/carreiras/' + encodeURIComponent(job.companyId) + '/' + encodeURIComponent(job.id)); toast.success('Link público copiado.'); }
    catch { setError('Não foi possível copiar. Abra a publicação para compartilhar o endereço.'); }
  }
  if (!canAccess) return <PageHeader title="Acesso restrito ao recrutamento" subtitle="Seu perfil não possui acesso às vagas." />;
  return <div className="min-w-0 space-y-5 p-4 sm:p-6">
    <PageHeader title="Vagas" subtitle="Crie oportunidades e acompanhe cada candidatura."
      actions={<><Button type="button" variant="outline" disabled={jobs.loading || Boolean(busyId)} onClick={jobs.refetch}><RefreshCw size={18} aria-hidden />Atualizar</Button>
        {(company?.id || user?.companyId) && <Link className="btn btn-outline" href={'/carreiras/' + encodeURIComponent(company?.id || user?.companyId || '')}>Portal de carreiras</Link>}
        <Button type="button" disabled={saving || Boolean(busyId)} onClick={() => { setEditingJob(null); setModalOpen(true); }}><Plus size={18} aria-hidden />Nova vaga</Button></>} />
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    {jobs.loading && !jobs.data ? <LoadingState label="Carregando vagas..." /> : jobs.error ? <ErrorState message={jobs.error} onRetry={jobs.refetch} /> : <>
      <section aria-label="Resumo das vagas carregadas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Abertas', rows.filter(job => job.status === 'OPEN').length],
          ['Rascunhos', rows.filter(job => job.status === 'DRAFT').length],
          ['Encerradas', rows.filter(job => job.status === 'CLOSED').length],
          ['Candidaturas', rows.reduce((sum, job) => sum + getApplicationCount(job), 0)],
        ].map(([label, count]) => <div key={label} className="card-v2 p-4"><p className="text-sm text-fg-mut">{label}</p><p className="mt-1 text-2xl font-semibold">{count}</p></div>)}
      </section>
      <section className="card-v2 space-y-3 p-4" aria-label="Filtros de vagas">
        <label className="block space-y-2"><span className="text-sm font-medium">Buscar vagas</span><div className="relative">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-3 text-fg-mut" />
          <input type="search" className="input-v2 min-h-11 pl-10 text-base sm:text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cargo, local, contrato ou benefício" /></div></label>
        <div className="flex flex-wrap gap-2">
          {(['', 'OPEN', 'DRAFT', 'CLOSED'] as const).map(value => <Button key={value} type="button" variant={status === value ? 'primary' : 'outline'} aria-pressed={status === value} onClick={() => setStatus(value)}>
            {value ? JOB_STATUS_LABEL[value] : 'Todas'} ({value ? rows.filter(job => job.status === value).length : rows.length})
          </Button>)}
          {(search || status) && <Button type="button" variant="ghost" onClick={clear}>Limpar filtros</Button>}
        </div>
        <p className="text-xs text-fg-mut" role="status">{filtered.length} vagas encontradas nos registros carregados.</p>
      </section>
      {!filtered.length ? <div className="card-v2 p-4"><EmptyState message={rows.length ? 'Nenhuma vaga corresponde aos filtros.' : 'Nenhuma vaga cadastrada.'} />
        <Button type="button" onClick={rows.length ? clear : () => { setEditingJob(null); setModalOpen(true); }}>{rows.length ? 'Limpar filtros' : 'Criar primeira vaga'}</Button></div>
        : <section aria-label="Lista de vagas" className="grid gap-4 xl:grid-cols-2">{filtered.map(job => <article key={job.id} className="card-v2 min-w-0 space-y-4 p-4 sm:p-5">
          <div className="flex items-start gap-3"><Briefcase size={20} aria-hidden className="mt-1 shrink-0 text-brand" /><div className="min-w-0">
            <h2 className="break-words text-lg font-semibold"><Link className="hover:underline" href={'/' + tenant + '/dashboard/jobs/' + encodeURIComponent(job.id)}>{job.title}</Link></h2>
            <p className="mt-1 text-sm text-fg-mut">{job.location || 'Local não informado'}</p></div></div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-fg-mut">Contrato</dt><dd>{EMPLOYMENT_TYPE_LABEL[job.employmentType || ''] || job.employmentType || 'Não informado'}</dd></div>
            <div><dt className="text-fg-mut">Status</dt><dd>{JOB_STATUS_LABEL[job.status]}</dd></div>
            <div><dt className="text-fg-mut">Faixa salarial</dt><dd>{job.salaryRange || 'Não informada'}</dd></div>
            <div><dt className="text-fg-mut">Candidaturas</dt><dd>{getApplicationCount(job)}</dd></div>
            <div className="col-span-2"><dt className="text-fg-mut">Atualizada em</dt><dd>{new Date(job.updatedAt).toLocaleDateString('pt-BR')}</dd></div>
          </dl>
          <Link className="btn btn-outline" href={'/' + tenant + '/dashboard/jobs/' + encodeURIComponent(job.id)}>Abrir funil</Link>
          <details className="border-t border-border pt-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Mais ações da vaga</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={Boolean(busyId)} onClick={() => { setEditingJob(job); setModalOpen(true); }}>Editar vaga</Button>
              <Button type="button" variant="outline" onClick={() => copy(job)}><Copy size={18} aria-hidden />Copiar link público</Button>
              <Link className="btn btn-outline" href={'/carreiras/' + encodeURIComponent(job.companyId) + '/' + encodeURIComponent(job.id)} target="_blank" rel="noopener noreferrer">Pré-visualizar</Link>
              <Button type="button" variant="outline" isLoading={busyId === job.id} disabled={Boolean(busyId)} onClick={() => toggle(job)}>{job.status === 'OPEN' ? 'Encerrar vaga' : 'Publicar vaga'}</Button>
              <Button type="button" variant="danger" disabled={Boolean(busyId)} onClick={() => { setError(''); setJobToDelete(job); }}>Excluir vaga</Button>
            </div>
          </details>
        </article>)}</section>}
    </>}
    <JobFormModal open={modalOpen} job={editingJob} saving={saving} onClose={() => { if (!saving) setModalOpen(false); }} onSubmit={save} />
    <ConfirmDialog isOpen={Boolean(jobToDelete)} title="Excluir vaga?" description={'“' + (jobToDelete?.title || '') + '”: vagas com candidaturas são encerradas pelo servidor; sem candidaturas, a exclusão é permanente. ' + error}
      confirmText="Confirmar exclusão" isLoading={Boolean(busyId)} onClose={() => { setJobToDelete(null); setError(''); }} onConfirm={remove} />
  </div>;
}
