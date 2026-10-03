'use client';

import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  Copy,
  GripVertical,
  Inbox,
  Loader2,
  MapPin,
  RefreshCw,
  UserCheck,
  UserRoundSearch,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';

import { CandidateDrawer } from '../candidate-drawer';
import { jobsApi } from '../jobs-api';
import {
  normalizeApplicationStatus,
  type ApplicationStatus,
  type Job,
  type JobApplication,
} from '../types';

type KanbanStatus = Exclude<ApplicationStatus, 'REVIEWING'>;

const ALLOWED_ROLES = new Set(['DEV', 'ADMIN', 'RH', 'GESTOR']);

const COLUMNS: Array<{
  status: KanbanStatus;
  label: string;
  description: string;
  icon: typeof Inbox;
  accent: string;
  header: string;
}> = [
  { status: 'APPLIED', label: 'Inscritos', description: 'Novas candidaturas', icon: Inbox, accent: 'bg-blue-500', header: 'bg-blue-50 text-blue-800' },
  { status: 'SCREENING', label: 'Em análise', description: 'Triagem do RH', icon: UserRoundSearch, accent: 'bg-violet-500', header: 'bg-violet-50 text-violet-800' },
  { status: 'INTERVIEW', label: 'Entrevista', description: 'Etapa de conversa', icon: Users, accent: 'bg-amber-500', header: 'bg-amber-50 text-amber-800' },
  { status: 'OFFER', label: 'Proposta', description: 'Oferta enviada', icon: ArrowRight, accent: 'bg-cyan-500', header: 'bg-cyan-50 text-cyan-800' },
  { status: 'HIRED', label: 'Contratados', description: 'Prontos para admissão', icon: UserCheck, accent: 'bg-emerald-500', header: 'bg-emerald-50 text-emerald-800' },
  { status: 'REJECTED', label: 'Reprovados', description: 'Fora do processo', icon: XCircle, accent: 'bg-rose-500', header: 'bg-rose-50 text-rose-800' },
];

function publicJobUrl(companyId: string, jobId: string) {
  const path = `/carreiras/${encodeURIComponent(companyId)}/${encodeURIComponent(jobId)}`;
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
}

export default function JobPipelinePage() {
  const params = useParams<{ tenant: string; jobId: string }>();
  const tenant = params?.tenant ?? '';
  const jobId = params?.jobId ?? '';
  const { user, company } = useAuth();
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const canAccess = ALLOWED_ROLES.has(role);

  const jobs = useQuery(() => jobsApi.list(), [], { enabled: canAccess });
  const applications = useQuery(() => jobsApi.applications(jobId), [jobId], { enabled: canAccess && Boolean(jobId) });
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [hiringId, setHiringId] = useState<string | null>(null);
  const [downloadingResumeId, setDownloadingResumeId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [candidateToHire, setCandidateToHire] = useState<JobApplication | null>(null);

  const job = useMemo(() => (jobs.data ?? []).find((item) => item.id === jobId) ?? null, [jobId, jobs.data]);
  const rows = applications.data ?? [];
  const grouped = useMemo(() => {
    const result = new Map<KanbanStatus, JobApplication[]>(COLUMNS.map((column) => [column.status, []]));
    rows.forEach((application) => {
      const status = normalizeApplicationStatus(application.status);
      result.get(status)?.push(application);
    });
    result.forEach((items) => {
      items.sort((left, right) => {
        const scoreDiff = (right.candidate.aiScore ?? -1) - (left.candidate.aiScore ?? -1);
        if (scoreDiff) return scoreDiff;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
    });
    return result;
  }, [rows]);

  if (!canAccess) {
    return (
      <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
        <div className="card-v2 mx-auto max-w-2xl p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-v2 bg-brand/10 text-brand"><Briefcase size={26} /></span>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-brand">Recrutamento</p>
          <h1 className="mt-1 text-xl font-black text-fg">Acesso restrito ao funil</h1>
          <p className="mt-2 text-sm font-medium text-fg-mut">Seu perfil não possui acesso ao funil de candidatos.</p>
        </div>
      </div>
    );
  }

  const refresh = () => {
    jobs.refetch();
    applications.refetch();
  };

  const changeStatus = async (application: JobApplication, status: ApplicationStatus) => {
    const current = normalizeApplicationStatus(application.status);
    const next = normalizeApplicationStatus(status);
    if (current === next) return;
    if (next === 'HIRED') {
      await hire(application);
      setDraggingId(null);
      return;
    }

    setUpdatingId(application.id);
    try {
      const updated = await jobsApi.updateApplicationStatus(application.id, next);
      setSelected((currentSelection) =>
        currentSelection?.id === application.id
          ? { ...currentSelection, ...updated, status: next }
          : currentSelection,
      );
      toast.success(`Candidato movido para ${COLUMNS.find((column) => column.status === next)?.label ?? next}.`);
      applications.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível mover o candidato.');
      throw error;
    } finally {
      setUpdatingId(null);
      setDraggingId(null);
    }
  };

  const handleBulkStatusChange = async (status: ApplicationStatus) => {
    if (selectedIds.size === 0) return;
    const next = normalizeApplicationStatus(status);
    if (next === 'HIRED') {
      toast.error('Contratações devem ser feitas individualmente (admissão).');
      return;
    }
    setBulkUpdating(true);
    let successCount = 0;
    try {
      await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          await jobsApi.updateApplicationStatus(id, next);
          successCount++;
        })
      );
      toast.success(`${successCount} candidato(s) movido(s) para ${COLUMNS.find((c) => c.status === next)?.label ?? next}. E-mail de feedback automático enviado na fila.`);
      applications.refetch();
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Falha parcial ao mover candidatos em lote.');
      applications.refetch();
    } finally {
      setBulkUpdating(false);
    }
  };

  const hire = async (application: JobApplication) => {
    setHiringId(application.id);
    try {
      const result = await jobsApi.hire(application.id);
      const employeeId = result.employee?.id ?? result.employeeId;
      toast.success(employeeId ? 'Colaborador criado em onboarding.' : 'Admissão iniciada com sucesso.');
      setSelected(null);
      applications.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível iniciar a admissão.');
      throw error;
    } finally {
      setHiringId(null);
    }
  };

  const copyLink = async () => {
    const companyId = job?.companyId || company?.id || user?.companyId;
    if (!companyId) {
      toast.error('A empresa da vaga não foi identificada.');
      return;
    }
    await navigator.clipboard.writeText(publicJobUrl(companyId, jobId));
    toast.success('Link público copiado.');
  };

  const downloadResume = async (application: JobApplication) => {
    setDownloadingResumeId(application.id);
    try {
      const safeName = application.candidate.name.trim().replace(/\s+/g, '-').toLowerCase();
      await jobsApi.downloadResume(application.id, `curriculo-${safeName || 'candidato'}`);
      toast.success('Currículo baixado.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível baixar o currículo.');
      throw error;
    } finally {
      setDownloadingResumeId(null);
    }
  };

  if (jobs.loading || applications.loading) return <LoadingState label="Carregando funil da vaga..." />;
  if (jobs.error || applications.error) return <ErrorState message={jobs.error || applications.error || 'Falha ao carregar o funil.'} onRetry={refresh} />;
  if (!job) {
    return (
        <div className="w-full space-y-5 px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
          <Link href={`/${tenant}/dashboard/jobs`} className="btn-v2-outline w-fit">
          <ArrowLeft size={14} /> Voltar para vagas
        </Link>
        <EmptyState message="Vaga não encontrada ou removida." />
      </div>
    );
  }

  return (
    <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      <div className="flex flex-col gap-5">
      <header className="card-v2 flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link href={`/${tenant}/dashboard/jobs`} className="btn-v2-outline mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center p-0" aria-label="Voltar para vagas">
            <ArrowLeft size={15} />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Funil de recrutamento</p>
            <h1 className="truncate text-2xl font-black text-fg">{job.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-fg-mut">
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {job.location || 'Local não informado'}</span>
              <span className="inline-flex items-center gap-1"><Users size={12} /> {rows.length} candidatura{rows.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copyLink} className="btn-v2-outline">
            <Copy size={14} /> Copiar link público
          </button>
          <button type="button" onClick={refresh} className="btn-v2-outline">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </header>

      <section className="card-v2 flex items-center justify-between gap-4 border-brand/20 bg-brand/5 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-bold text-fg-mut">
          <GripVertical size={15} className="text-brand" />
          Arraste os cartões entre as colunas ou altere a etapa no dossiê do candidato.
        </div>
        {updatingId && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-brand">
            <Loader2 size={12} className="animate-spin" /> Salvando
          </span>
        )}
      </section>

      {selectedIds.size > 0 && (
        <section className="sticky top-4 z-40 flex items-center justify-between gap-4 rounded-v2 border border-border bg-fg px-5 py-3 shadow-v2-xl">
          <div className="flex items-center gap-3 text-xs font-bold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shadow-sm">
              {selectedIds.size}
            </span>
            candidatos selecionados
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Mover para:</span>
            {COLUMNS.filter((c) => c.status !== 'HIRED').map((col) => (
              <button
                key={col.status}
                onClick={() => handleBulkStatusChange(col.status)}
                disabled={bulkUpdating}
                className="inline-flex h-8 items-center rounded-v2 bg-white/10 px-3 text-[10px] font-bold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {col.label}
              </button>
            ))}
            <div className="mx-2 h-4 w-px bg-white/20" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex h-8 items-center rounded-v2 px-2 text-[10px] font-bold text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section className="overflow-x-auto pb-3">
        <div className="grid min-w-[1680px] grid-cols-6 gap-3">
          {COLUMNS.map((column) => {
            const ColumnIcon = column.icon;
            const items = grouped.get(column.status) ?? [];
            return (
              <div
                key={column.status}
                className="min-h-[520px] rounded-v2 border border-border bg-bg-sub/70 p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  const application = rows.find((item) => item.id === draggingId);
                  if (application) void changeStatus(application, column.status);
                }}
              >
                  <header className={`mb-2 rounded-v2 border border-white/80 p-3 ${column.header}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${column.accent}`} />
                      <ColumnIcon size={14} />
                      <h2 className="text-xs font-black">{column.label}</h2>
                    </div>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-black shadow-sm">
                      {items.length}
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] font-bold opacity-70">{column.description}</p>
                </header>

                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="rounded-v2 border border-dashed border-border bg-bg-elev/50 px-3 py-8 text-center">
                      <p className="text-[10px] font-bold text-fg-sub">Solte candidatos aqui</p>
                    </div>
                  ) : (
                    items.map((application) => (
                      <CandidateCard
                        key={application.id}
                        application={application}
                        selected={selectedIds.has(application.id)}
                        onToggleSelection={() => {
                          const next = new Set(selectedIds);
                          if (next.has(application.id)) next.delete(application.id);
                          else next.add(application.id);
                          setSelectedIds(next);
                        }}
                        disabled={updatingId === application.id || bulkUpdating}
                        onOpen={() => setSelected(application)}
                        onDragStart={() => setDraggingId(application.id)}
                        onDragEnd={() => setDraggingId(null)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CandidateDrawer
        application={selected}
        job={job}
        updating={updatingId === selected?.id}
        hiring={hiringId === selected?.id}
        downloadingResume={downloadingResumeId === selected?.id}
        onClose={() => {
          if (!hiringId) setSelected(null);
        }}
        onStatusChange={(status) => (selected ? changeStatus(selected, status) : Promise.resolve())}
        onHire={() => { if (selected) setCandidateToHire(selected); return Promise.resolve(); }}
        onDownloadResume={() => (selected ? downloadResume(selected) : Promise.resolve())}
      />
      {candidateToHire && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]">
          <div className="card-v2 w-full max-w-md bg-bg-elev p-6 shadow-v2-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"><UserCheck size={18} /></span>
              <div><h2 className="text-sm font-black text-fg">Iniciar admissão?</h2><p className="mt-1 text-xs leading-5 text-fg-mut">{candidateToHire.candidate.name} será convertido em colaborador e enviado para onboarding e conferência do RH.</p></div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setCandidateToHire(null)} disabled={Boolean(hiringId)} className="btn-v2-outline">Cancelar</button>
              <button type="button" onClick={() => { const candidate = candidateToHire; setCandidateToHire(null); void hire(candidate); }} disabled={Boolean(hiringId)} className="btn-v2-primary"><UserCheck size={14} /> Confirmar admissão</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

function CandidateCard({
  application,
  selected,
  onToggleSelection,
  disabled,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  application: JobApplication;
  selected: boolean;
  onToggleSelection: () => void;
  disabled: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const candidate = application.candidate;
  const score = candidate.aiScore == null ? null : Math.min(100, Math.max(0, candidate.aiScore));

  return (
    <article
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative rounded-v2 border bg-bg-elev p-3 shadow-v2-sm transition-all hover:-translate-y-0.5 hover:shadow-v2-md ${
        selected ? 'border-brand ring-1 ring-brand' : 'border-border hover:border-brand/40'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <div className="absolute left-3 top-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelection}
          className="h-4 w-4 cursor-pointer rounded border-border text-brand focus:ring-brand"
        />
      </div>
      <div
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName.toLowerCase() !== 'input') {
            onOpen();
          }
        }}
        className="cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2 pl-6">
          <div className="min-w-0">
            <h3 className="truncate text-xs font-black text-fg">{candidate.name}</h3>
            <p className="mt-0.5 truncate text-[10px] font-medium text-fg-mut">{candidate.email || 'E-mail não informado'}</p>
          </div>
          <GripVertical size={14} className="shrink-0 text-fg-sub group-hover:text-brand" />
        </div>

      {score != null ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase">
            <span className="inline-flex items-center gap-1 text-violet-700"><BrainCircuit size={11} /> Aderência IA</span>
            <span className={score >= 70 ? 'text-emerald-700' : score >= 45 ? 'text-amber-700' : 'text-rose-700'}>{score}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-teal-500" style={{ width: `${score}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-3 inline-flex items-center gap-1 rounded-v2 bg-bg-sub px-2 py-1 text-[9px] font-bold text-fg-mut">
          <BrainCircuit size={11} /> Análise pendente
        </p>
      )}

      {candidate.aiSummary && (
        <p className="mt-2 line-clamp-3 text-[10px] leading-4 text-fg-mut">{candidate.aiSummary}</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[9px] font-bold text-fg-sub">
        <span>{new Intl.DateTimeFormat('pt-BR').format(new Date(application.createdAt))}</span>
        <span className="inline-flex items-center gap-1 text-violet-700">
          Ver dossiê <ArrowRight size={10} />
        </span>
      </div>
      </div>
    </article>
  );
}
