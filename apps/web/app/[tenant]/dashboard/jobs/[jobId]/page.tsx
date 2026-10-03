'use client';

import { ArrowLeft, Copy, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { PageHeader } from '@/app/components/ui/page-header';
import { Modal } from '@/app/components/ui/modal';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { CandidateDrawer } from '../candidate-drawer';
import { jobsApi } from '../jobs-api';
import { JOB_STATUS_LABEL, normalizeApplicationStatus, type ApplicationStatus, type JobApplication } from '../types';

type Stage = Exclude<ApplicationStatus, 'REVIEWING'>;
const ALLOWED_ROLES = new Set(['DEV', 'ADMIN', 'RH', 'GESTOR']);
const STAGES: Array<{ status: Stage; label: string }> = [
  { status: 'APPLIED', label: 'Inscritos' }, { status: 'SCREENING', label: 'Em análise' },
  { status: 'INTERVIEW', label: 'Entrevista' }, { status: 'OFFER', label: 'Proposta' },
  { status: 'HIRED', label: 'Contratados' }, { status: 'REJECTED', label: 'Reprovados' },
];
const message = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;

export default function JobPipelinePage() {
  const { tenant = '', jobId = '' } = useParams<{ tenant: string; jobId: string }>();
  const { user, company } = useAuth();
  const canAccess = ALLOWED_ROLES.has((user?.profile ?? user?.role ?? '').toUpperCase());
  const jobs = useQuery(() => jobsApi.list(), [company?.id], { enabled: canAccess });
  const applications = useQuery(() => jobsApi.applications(jobId), [jobId, company?.id], { enabled: canAccess && Boolean(jobId) });
  const [stage, setStage] = useState<Stage>('APPLIED');
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [candidateToHire, setCandidateToHire] = useState<JobApplication | null>(null);
  const [hireReview, setHireReview] = useState(false);
  const [hireForm, setHireForm] = useState({ department: '', contractType: '', admissionDate: '', salary: '' });
  const [bulkStage, setBulkStage] = useState<Stage>('SCREENING');
  const [results, setResults] = useState<Array<{ id: string; name: string; ok: boolean; detail: string }>>([]);
  const [admissionId, setAdmissionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const job = (jobs.data ?? []).find(item => item.id === jobId);
  const rows = useMemo(() => applications.data ?? [], [applications.data]);
  const grouped = useMemo(() => STAGES.map(column => ({
    ...column, items: rows.filter(item => normalizeApplicationStatus(item.status) === column.status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  })), [rows]);

  useEffect(() => {
    setSelected(null); setSelectedIds(new Set()); setCandidateToHire(null);
    setResults([]); setAdmissionId(null); setActionError(''); setDraggingId(null);
  }, [jobId, company?.id, user?.id]);
  useEffect(() => {
    setSelectedIds(ids => new Set([...ids].filter(id => rows.some(row => row.id === id && row.status !== 'HIRED'))));
    setSelected(current => current ? rows.find(row => row.id === current.id) ?? null : null);
  }, [rows]);

  function refresh() { jobs.refetch(); applications.refetch(); }
  function requestHire(application: JobApplication) {
    if (busyRef.current || application.status === 'HIRED') return;
    setSelected(null);
    setCandidateToHire(application);
    setHireReview(false);
    setHireForm({ department: '', contractType: job?.employmentType || '', admissionDate: '', salary: '' });
    setActionError('');
  }
  async function changeStatus(application: JobApplication, next: ApplicationStatus) {
    if (busyRef.current || application.status === 'HIRED') return;
    if (next === 'HIRED') { requestHire(application); return; }
    if (normalizeApplicationStatus(application.status) === normalizeApplicationStatus(next)) return;
    busyRef.current = true; setBusy(true); setActionError('');
    try {
      const updated = await jobsApi.updateApplicationStatus(application.id, next);
      setSelected(current => current?.id === application.id ? { ...current, ...updated } : current);
      toast.success('Etapa atualizada.'); applications.refetch();
    } catch (error) { setActionError(message(error, 'Não foi possível atualizar a etapa. Tente novamente.')); }
    finally { busyRef.current = false; setBusy(false); setDraggingId(null); }
  }
  async function moveBulk() {
    if (busyRef.current || !selectedIds.size || bulkStage === 'HIRED') return;
    const targets = rows.filter(row => selectedIds.has(row.id) && row.status !== 'HIRED');
    busyRef.current = true; setBusy(true); setResults([]); setActionError('');
    const settled = await Promise.allSettled(targets.map(async row => {
      if (normalizeApplicationStatus(row.status) !== bulkStage) await jobsApi.updateApplicationStatus(row.id, bulkStage);
    }));
    const nextResults = settled.map((result, index) => ({
      id: targets[index].id, name: targets[index].candidate.name, ok: result.status === 'fulfilled',
      detail: result.status === 'fulfilled' ? 'Etapa confirmada' : message(result.reason, 'Falha ao atualizar. Tente novamente.'),
    }));
    setResults(nextResults);
    setSelectedIds(new Set(nextResults.filter(result => !result.ok).map(result => result.id)));
    applications.refetch(); busyRef.current = false; setBusy(false);
  }
  async function hire() {
    if (!candidateToHire || busyRef.current) return;
    busyRef.current = true; setBusy(true); setActionError('');
    try {
      const result = await jobsApi.hire(candidateToHire.id, {
        department: hireForm.department.trim(), contractType: hireForm.contractType.trim(), admissionDate: hireForm.admissionDate,
        ...(hireForm.salary !== '' ? { salary: Number(hireForm.salary) } : {}),
      });
      setAdmissionId(result.employee?.id ?? result.employeeId ?? null);
      setCandidateToHire(null); toast.success('Admissão iniciada. Confira os dados do funcionário.');
      refresh();
    } catch (error) { setActionError(message(error, 'Não foi possível iniciar a admissão. Verifique o estado antes de tentar novamente.')); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function copyLink() {
    const companyId = job?.companyId;
    if (!companyId) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + '/carreiras/' + encodeURIComponent(companyId) + '/' + encodeURIComponent(jobId));
      toast.success('Link público copiado.');
    } catch { setActionError('Não foi possível copiar o link. Abra a publicação para compartilhar o endereço.'); }
  }
  async function downloadResume() {
    if (!selected || downloading) return;
    setDownloading(true);
    try { await jobsApi.downloadResume(selected.id, 'curriculo'); }
    catch (error) { setActionError(message(error, 'Não foi possível baixar o currículo.')); }
    finally { setDownloading(false); }
  }

  if (!canAccess) return <PageHeader title="Acesso restrito ao funil" subtitle="Seu perfil não possui acesso ao recrutamento." />;
  if ((jobs.loading && !jobs.data) || (applications.loading && !applications.data)) return <LoadingState label="Carregando funil da vaga..." />;
  if (jobs.error || applications.error) return <ErrorState message={jobs.error || applications.error || 'Falha ao carregar o funil.'} onRetry={refresh} />;
  if (!job) return <div className="space-y-4 p-4"><Link className="btn btn-outline" href={'/' + tenant + '/dashboard/jobs'}>Voltar para vagas</Link><EmptyState message="Vaga não encontrada ou removida." /></div>;

  return (
    <div className="min-w-0 space-y-5 p-4 sm:p-6">
      <Link href={'/' + tenant + '/dashboard/jobs'} className="btn btn-ghost"><ArrowLeft size={18} aria-hidden /> Voltar para vagas</Link>
      <PageHeader title={job.title} eyebrow="Funil de recrutamento"
        subtitle={JOB_STATUS_LABEL[job.status] + ' · ' + (job.location || 'Local não informado') + ' · ' + rows.length + ' candidaturas'}
        actions={<><Button type="button" variant="outline" onClick={copyLink}><Copy size={18} aria-hidden /> Copiar link público</Button>
          <Link className="btn btn-outline" href={'/carreiras/' + encodeURIComponent(job.companyId) + '/' + encodeURIComponent(job.id)}>Ver publicação</Link>
          <Button type="button" variant="outline" disabled={busy || applications.loading} onClick={refresh}><RefreshCw size={18} aria-hidden /> Atualizar</Button></>} />
      {actionError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{actionError}</p>}
      {admissionId && <div role="status" className="card-v2 space-y-2 p-4"><p>Funcionário criado em admissão.</p><Link className="btn btn-outline" href={'/' + tenant + '/dashboard/employees/new?id=' + encodeURIComponent(admissionId)}>Conferir cadastro do funcionário</Link></div>}
      <p className="text-sm text-fg-mut">Abra o candidato para alterar a etapa ou iniciar a admissão. Contratações são confirmadas individualmente.</p>
      <label className="block space-y-2 md:hidden">
        <span className="text-sm font-medium">Etapa do funil</span>
        <select className="input-v2 min-h-11 text-base" value={stage} onChange={event => setStage(event.target.value as Stage)}>
          {grouped.map(column => <option key={column.status} value={column.status}>{column.label} ({column.items.length})</option>)}
        </select>
      </label>
      {selectedIds.size > 0 && <section aria-label="Ações em lote" className="card-v2 flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
        <p className="text-sm font-semibold">{selectedIds.size} candidatos selecionados entre as etapas</p>
        <label className="min-w-0 space-y-1 lg:flex-1"><span className="text-sm">Mover selecionados para</span>
          <select className="input-v2 min-h-11 text-base" value={bulkStage} disabled={busy} onChange={event => setBulkStage(event.target.value as Stage)}>
            {STAGES.filter(column => column.status !== 'HIRED').map(column => <option key={column.status} value={column.status}>{column.label}</option>)}
          </select>
        </label>
        <Button type="button" onClick={moveBulk} isLoading={busy}>Atualizar selecionados</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setSelectedIds(new Set())}>Cancelar seleção</Button>
      </section>}
      {results.length > 0 && <section className="card-v2 p-4" aria-live="polite"><h2 className="font-semibold">Resultado do lote</h2><ul className="mt-2 space-y-2 text-sm">
        {results.map(result => <li key={result.id} className={result.ok ? 'text-emerald-800' : 'text-rose-800'}>{result.name}: {result.detail}</li>)}
      </ul><p className="mt-2 text-sm text-fg-mut">A seleção mantém apenas as falhas para nova tentativa.</p></section>}
      <section aria-label="Candidatos por etapa" className="min-w-0 md:overflow-x-auto md:pb-3" tabIndex={0}>
        <div className="md:grid md:min-w-[1680px] md:grid-cols-6 md:gap-4">
          {grouped.map(column => <section key={column.status} aria-label={column.label}
            className={'rounded-xl border border-border bg-bg-sub p-3 ' + (column.status === stage ? 'block' : 'hidden') + ' md:block'}
            onDragOver={event => event.preventDefault()} onDrop={() => {
              const row = rows.find(item => item.id === draggingId);
              if (row) void changeStatus(row, column.status);
            }}>
            <h2 className="mb-3 flex justify-between gap-2 text-sm font-semibold">{column.label}<span>{column.items.length}</span></h2>
            {!column.items.length && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-fg-mut">Nenhum candidato nesta etapa.</p>}
            <div className="space-y-3">{column.items.map(application => <article key={application.id}
              draggable={!busy && application.status !== 'HIRED'} onDragStart={() => setDraggingId(application.id)} onDragEnd={() => setDraggingId(null)}
              className="card-v2 min-w-0 p-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" className="h-5 w-5" checked={selectedIds.has(application.id)} disabled={busy || application.status === 'HIRED'}
                  onChange={() => setSelectedIds(current => { const next = new Set(current); next.has(application.id) ? next.delete(application.id) : next.add(application.id); return next; })} />
                <span className="break-words">Selecionar {application.candidate.name}</span>
              </label>
              <h3 className="mt-2 break-words font-semibold">{application.candidate.name}</h3>
              <p className="mt-1 break-all text-sm text-fg-mut">{application.candidate.email || 'E-mail não informado'}</p>
              <p className="mt-2 text-xs text-fg-mut">{new Date(application.createdAt).toLocaleDateString('pt-BR')}</p>
              {application.candidate.aiScore != null && <p className="mt-2 text-sm">Análise automática: {application.candidate.aiScore}%</p>}
              {application.candidate.aiSummary && <p className="mt-2 break-words text-sm text-fg-mut">{application.candidate.aiSummary}</p>}
              <Button type="button" variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => setSelected(application)}>Ver candidato</Button>
            </article>)}</div>
          </section>)}
        </div>
      </section>
      <CandidateDrawer application={selected} job={job} updating={busy} hiring={busy} downloadingResume={downloading}
        onClose={() => { if (!busy && !downloading) setSelected(null); }}
        onStatusChange={status => selected ? changeStatus(selected, status) : Promise.resolve()}
        onHire={() => { if (selected) requestHire(selected); return Promise.resolve(); }} onDownloadResume={downloadResume} />
      <Modal isOpen={Boolean(candidateToHire) && !hireReview} title="Dados para admissão" description={candidateToHire?.candidate.name} onClose={() => setCandidateToHire(null)}>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); setHireReview(true); }}>
          <p className="text-sm text-fg-mut">Informe os dados exigidos para iniciar a admissão. Campos com * são obrigatórios.</p>
          <label className="block space-y-1"><span>Departamento *</span><input autoFocus required maxLength={120} className="input-v2 text-base" value={hireForm.department} onChange={e => setHireForm(current => ({ ...current, department: e.target.value }))} /></label>
          <label className="block space-y-1"><span>Tipo de contrato *</span><input required maxLength={80} className="input-v2 text-base" value={hireForm.contractType} onChange={e => setHireForm(current => ({ ...current, contractType: e.target.value }))} /></label>
          <label className="block space-y-1"><span>Data de admissão *</span><input required type="date" className="input-v2 text-base" value={hireForm.admissionDate} onChange={e => setHireForm(current => ({ ...current, admissionDate: e.target.value }))} /></label>
          <label className="block space-y-1"><span>Salário em reais (opcional)</span><input type="number" min={0} step="0.01" inputMode="decimal" className="input-v2 text-base" value={hireForm.salary} onChange={e => setHireForm(current => ({ ...current, salary: e.target.value }))} /></label>
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setCandidateToHire(null)}>Cancelar</Button><Button type="submit">Revisar admissão</Button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={Boolean(candidateToHire) && hireReview} title="Iniciar admissão?" variant="primary"
        description={(candidateToHire?.candidate.name || '') + ' · ' + hireForm.department + ' · ' + hireForm.contractType + ' · ' + hireForm.admissionDate.split('-').reverse().join('/') + (hireForm.salary !== '' ? ' · ' + Number(hireForm.salary).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '') + '. Os dados serão reaproveitados para criação ou vínculo de funcionário em admissão. ' + actionError}
        confirmText="Confirmar admissão" isLoading={busy} onConfirm={hire}
        cancelText="Revisar dados" onClose={() => { setHireReview(false); setActionError(''); }} />
    </div>
  );
}
