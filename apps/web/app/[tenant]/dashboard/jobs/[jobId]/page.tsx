'use client';

import { ArrowLeft, Columns3, Copy, ExternalLink, Pencil, Star, Table2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { Pill } from '../_components/bits';
import { CandidateDrawer } from '../_components/candidate-drawer';
import { CandidatesTable, KanbanBoard } from '../_components/candidate-views';
import { HireDialog, RejectDialog } from '../_components/dialogs';
import { FiltersBar } from '../_components/filters-bar';
import { jobsApi } from '../jobs-api';
import { JOB_STATUS_LABEL, WORK_MODE_LABEL, type ApplicationFilters, type ApplicationsPayload } from '../types';

const ALLOWED_ROLES = new Set(['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR']);
const message = (cause: unknown, fallback: string) => (cause instanceof ApiError ? cause.message : fallback);

export default function JobCandidatesPage() {
  const { tenant = '', jobId = '' } = useParams<{ tenant: string; jobId: string }>();
  const router = useRouter();
  const { user, company } = useAuth();
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const canAccess = ALLOWED_ROLES.has(role);
  const canUseBulkActions = role !== 'RH_RS';
  const base = `/${tenant}/dashboard/jobs`;

  const [filters, setFilters] = useState<ApplicationFilters>({});
  const [debounced, setDebounced] = useState<ApplicationFilters>({});
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [reject, setReject] = useState<{ ids: string[] } | null>(null);
  const [rejectStageId, setRejectStageId] = useState('');
  const [hire, setHire] = useState<{ id: string; name: string } | null>(null);
  const [bulkStage, setBulkStage] = useState('');
  const [bulkTag, setBulkTag] = useState('');
  const [cache, setCache] = useState<ApplicationsPayload>();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 350);
    return () => clearTimeout(timer);
  }, [filters]);

  const filterKey = JSON.stringify(debounced);
  const job = useQuery(() => jobsApi.get(jobId), [jobId, company?.id], { enabled: canAccess });
  const list = useQuery(() => jobsApi.applications(jobId, debounced), [jobId, company?.id, filterKey], { enabled: canAccess });
  const tags = useQuery(() => jobsApi.tags(), [company?.id], { enabled: canAccess });
  const views = useQuery(() => jobsApi.views(), [company?.id], { enabled: canAccess });
  useEffect(() => { if (list.data) setCache(list.data); }, [list.data]);
  useEffect(() => { setSelectedIds(new Set()); setOpenId(null); }, [jobId, company?.id]);

  const payload = list.data ?? cache;
  const applications = useMemo(() => payload?.applications ?? [], [payload]);
  const pipeline = payload?.pipeline;

  const refresh = () => { list.refetch(); };

  async function moveOne(applicationId: string, stageId: string) {
    const stage = pipeline?.stages.find((item) => item.id === stageId);
    const app = applications.find((item) => item.id === applicationId);
    if (!stage) return;
    if (stage.kind === 'HIRED') {
      if (role === 'RH_RS') { toast.error('Seu perfil pode conduzir o processo seletivo, mas não efetivar contratações.'); return; }
      setHire({ id: applicationId, name: app?.candidate?.name ?? 'Candidato' }); return;
    }
    if (stage.kind === 'REJECTED') { setRejectStageId(stageId); setReject({ ids: [applicationId] }); return; }
    try { await jobsApi.move(applicationId, { stageId }); toast.success(`Movido para ${stage.name}.`); refresh(); }
    catch (cause) { toast.error(message(cause, 'Não foi possível mover o candidato.')); }
  }

  async function bulkMove() {
    if (!canUseBulkActions) return;
    const stage = pipeline?.stages.find((item) => item.id === bulkStage);
    if (!stage || selectedIds.size === 0) return;
    if (stage.kind === 'HIRED') { toast.error('Contrate candidatos individualmente para informar departamento e contrato.'); return; }
    if (stage.kind === 'REJECTED') { setRejectStageId(stage.id); setReject({ ids: [...selectedIds] }); return; }
    try {
      const result = await jobsApi.bulk({ ids: [...selectedIds], action: 'MOVE', stageId: stage.id });
      toast.success(`${result.moved ?? 0} candidato(s) movido(s).${result.failed ? ` ${result.failed} não puderam ser movidos: ${result.errors?.join('; ')}` : ''}`);
      setSelectedIds(new Set()); refresh();
    } catch (cause) { toast.error(message(cause, 'Falha ao mover em lote.')); }
  }

  async function confirmReject(reason: string) {
    if (!reject) return;
    if (reject.ids.length > 1 && !canUseBulkActions) { toast.error('Este perfil precisa reprovar candidatos individualmente.'); return; }
    try {
      if (reject.ids.length === 1) await jobsApi.move(reject.ids[0], { stageId: rejectStageId, rejectionReason: reason });
      else await jobsApi.bulk({ ids: reject.ids, action: 'MOVE', stageId: rejectStageId, rejectionReason: reason });
      toast.success('Reprovação registrada.');
      setReject(null); setSelectedIds(new Set()); refresh();
    } catch (cause) { toast.error(message(cause, 'Não foi possível reprovar.')); }
  }

  async function bulkSimple(action: 'FAVORITE' | 'TAG_ADD' | 'TAG_REMOVE') {
    if (!canUseBulkActions) return;
    try {
      await jobsApi.bulk({ ids: [...selectedIds], action, tagId: bulkTag || undefined, value: true });
      toast.success('Atualizado.'); refresh();
    } catch (cause) { toast.error(message(cause, 'Falha na ação em lote.')); }
  }

  async function confirmHire(data: Parameters<typeof jobsApi.hire>[1]) {
    if (!hire) return;
    try {
      const result = await jobsApi.hire(hire.id, data);
      setHire(null); refresh();
      const employeeId = result.employee?.id;
      toast.success(result.alreadyHired ? 'Este candidato já havia sido contratado.' : 'Candidato contratado. Complete o cadastro do funcionário.', {
        action: employeeId ? { label: 'Abrir cadastro', onClick: () => router.push(`/${tenant}/dashboard/employees/new?id=${employeeId}`) } : undefined,
      });
    } catch (cause) { toast.error(message(cause, 'Não foi possível contratar.')); }
  }

  function toggle(id: string) {
    setSelectedIds((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  if (!canAccess) return <div className="p-6"><EmptyState message="Seu perfil não tem acesso ao módulo de vagas." /></div>;
  const jobData = job.data;
  const canEdit = role !== 'GESTOR';

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-4 p-4 sm:p-6">
      <Link href={base} className="inline-flex items-center gap-1 text-sm text-fg-sub hover:text-fg"><ArrowLeft size={15} aria-hidden="true" /> Voltar para vagas</Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Funil de recrutamento</p>
          <h1 className="text-2xl font-semibold text-fg">{jobData?.title ?? 'Carregando…'}</h1>
          {jobData && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-sub">
              <Pill tone={jobData.status === 'OPEN' ? 'success' : jobData.status === 'DRAFT' ? 'warning' : 'default'}>{JOB_STATUS_LABEL[jobData.status]}</Pill>
              {[jobData.department, jobData.location, jobData.workMode && WORK_MODE_LABEL[jobData.workMode]].filter(Boolean).join(' · ')}
              · {applications.length} candidatura(s)
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && <Link href={`${base}/${jobId}/edit`} className="btn btn-outline btn-md"><Pencil size={16} aria-hidden="true" /> Editar vaga</Link>}
          {jobData && <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/carreiras/${jobData.companyId}/${jobData.id}`); toast.success('Link público copiado.'); } catch { toast.error('Não foi possível copiar.'); } }}><Copy size={16} aria-hidden="true" /> Copiar link</Button>}
          {jobData && <Link href={`/carreiras/${jobData.companyId}/${jobData.id}`} target="_blank" className="btn btn-outline btn-md"><ExternalLink size={16} aria-hidden="true" /> Ver publicação</Link>}
          <div className="inline-flex overflow-hidden rounded-lg border border-border" role="group" aria-label="Modo de visualização">
            <button type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')} className={`flex items-center gap-1.5 px-3 py-2 text-sm ${view === 'kanban' ? 'bg-purple-600 text-white' : 'hover:bg-bg-sub'}`}><Columns3 size={15} aria-hidden="true" /> Funil</button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} className={`flex items-center gap-1.5 px-3 py-2 text-sm ${view === 'table' ? 'bg-purple-600 text-white' : 'hover:bg-bg-sub'}`}><Table2 size={15} aria-hidden="true" /> Tabela</button>
          </div>
        </div>
      </header>

      <FiltersBar filters={filters} onChange={setFilters} pipeline={pipeline} tags={tags.data ?? []} questions={payload?.questions ?? []} views={views.data ?? []}
        onViewsChanged={views.refetch} total={applications.length}
        onExport={async () => { try { await jobsApi.exportCsv(jobId, debounced); } catch (cause) { toast.error(message(cause, 'Não foi possível exportar.')); } }} />

      {canUseBulkActions && selectedIds.size > 0 && pipeline && (
        <div role="region" aria-label="Ações em lote" className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-purple-300 bg-purple-50 p-3 text-sm shadow">
          <strong>{selectedIds.size} selecionado(s)</strong>
          <select aria-label="Mover para etapa" className="input-v2 text-sm" value={bulkStage} onChange={(event) => setBulkStage(event.target.value)}>
            <option value="">Mover para…</option>{pipeline.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
          </select>
          <Button size="sm" disabled={!bulkStage} onClick={bulkMove}>Mover</Button>
          <select aria-label="Tag" className="input-v2 text-sm" value={bulkTag} onChange={(event) => setBulkTag(event.target.value)}>
            <option value="">Tag…</option>{(tags.data ?? []).map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
          <Button size="sm" variant="outline" disabled={!bulkTag} onClick={() => bulkSimple('TAG_ADD')}>Adicionar</Button>
          <Button size="sm" variant="outline" disabled={!bulkTag} onClick={() => bulkSimple('TAG_REMOVE')}>Remover</Button>
          <Button size="sm" variant="outline" onClick={() => bulkSimple('FAVORITE')}><Star size={14} aria-hidden="true" /> Favoritar</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Limpar seleção</Button>
        </div>
      )}

      {list.error && <ErrorState message={list.error} onRetry={list.refetch} />}
      {!payload ? (list.loading ? <LoadingState label="Carregando candidatos…" /> : null) : applications.length === 0 ? (
        <EmptyState message={Object.values(debounced).some(Boolean) ? 'Nenhum candidato corresponde aos filtros.' : 'Ainda não há candidaturas. Compartilhe o link público da vaga para começar.'} />
      ) : view === 'kanban' ? (
        <KanbanBoard pipeline={payload.pipeline} applications={applications} selectedIds={selectedIds} onToggle={toggle} onOpen={setOpenId} onDrop={moveOne} />
      ) : (
        <CandidatesTable pipeline={payload.pipeline} applications={applications} selectedIds={selectedIds} onToggle={toggle} onOpen={setOpenId} onStageChange={moveOne}
          onToggleAll={() => setSelectedIds(selectedIds.size === applications.length ? new Set() : new Set(applications.map((app) => app.id)))} />
      )}

      <CandidateDrawer applicationId={openId} pipeline={pipeline} tags={tags.data ?? []} onClose={() => setOpenId(null)} onChanged={refresh} onRequestMove={moveOne} />
      <RejectDialog isOpen={Boolean(reject)} count={reject?.ids.length ?? 0} onClose={() => setReject(null)} onConfirm={confirmReject} />
      <HireDialog isOpen={Boolean(hire)} name={hire?.name ?? ''} onClose={() => setHire(null)} onConfirm={confirmHire} />
    </div>
  );
}
