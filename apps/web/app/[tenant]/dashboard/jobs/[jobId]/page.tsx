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
      <div className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Briefcase className="mx-auto text-amber-600" size={30} />
          <h1 className="mt-3 text-lg font-black text-amber-950">Acesso restrito ao recrutamento</h1>
          <p className="mt-2 text-sm font-medium text-amber-800">Seu perfil não possui acesso ao funil de candidatos.</p>
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

  const hire = async (application: JobApplication) => {
    if (!window.confirm(`Contratar ${application.candidate.name} e iniciar a admissão? Os dados serão usados para criar o colaborador em onboarding.`)) return;
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
      <div className="space-y-5">
        <Link href={`/${tenant}/dashboard/jobs`} className="btn-outline w-fit">
          <ArrowLeft size={14} /> Voltar para vagas
        </Link>
        <EmptyState message="Vaga não encontrada ou removida." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link href={`/${tenant}/dashboard/jobs`} className="btn-icon mt-0.5 shrink-0" aria-label="Voltar para vagas">
            <ArrowLeft size={15} />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-600">Funil de recrutamento</p>
            <h1 className="truncate text-2xl font-black text-slate-950">{job.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {job.location || 'Local não informado'}</span>
              <span className="inline-flex items-center gap-1"><Users size={12} /> {rows.length} candidatura{rows.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copyLink} className="btn-outline">
            <Copy size={14} /> Copiar link público
          </button>
          <button type="button" onClick={refresh} className="btn-outline">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </header>

      <section className="flex items-center justify-between gap-4 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-teal-50 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <GripVertical size={15} className="text-violet-600" />
          Arraste os cartões entre as colunas ou altere a etapa no dossiê do candidato.
        </div>
        {updatingId && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-violet-700">
            <Loader2 size={12} className="animate-spin" /> Salvando
          </span>
        )}
      </section>

      <section className="overflow-x-auto pb-3">
        <div className="grid min-w-[1680px] grid-cols-6 gap-3">
          {COLUMNS.map((column) => {
            const ColumnIcon = column.icon;
            const items = grouped.get(column.status) ?? [];
            return (
              <div
                key={column.status}
                className="min-h-[520px] rounded-2xl border border-slate-200 bg-slate-100/70 p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  const application = rows.find((item) => item.id === draggingId);
                  if (application) void changeStatus(application, column.status);
                }}
              >
                <header className={`mb-2 rounded-xl border border-white/80 p-3 ${column.header}`}>
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
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 py-8 text-center">
                      <p className="text-[10px] font-bold text-slate-400">Solte candidatos aqui</p>
                    </div>
                  ) : (
                    items.map((application) => (
                      <CandidateCard
                        key={application.id}
                        application={application}
                        disabled={updatingId === application.id}
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
        onHire={() => (selected ? hire(selected) : Promise.resolve())}
        onDownloadResume={() => (selected ? downloadResume(selected) : Promise.resolve())}
      />
    </div>
  );
}

function CandidateCard({
  application,
  disabled,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  application: JobApplication;
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
      onClick={onOpen}
      className={`group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md ${disabled ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-black text-slate-950">{candidate.name}</h3>
          <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{candidate.email || 'E-mail não informado'}</p>
        </div>
        <GripVertical size={14} className="shrink-0 text-slate-300 group-hover:text-violet-500" />
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
        <p className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">
          <BrainCircuit size={11} /> Análise pendente
        </p>
      )}

      {candidate.aiSummary && (
        <p className="mt-2 line-clamp-3 text-[10px] leading-4 text-slate-600">{candidate.aiSummary}</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] font-bold text-slate-400">
        <span>{new Intl.DateTimeFormat('pt-BR').format(new Date(application.createdAt))}</span>
        <span className="inline-flex items-center gap-1 text-violet-700">
          Ver dossiê <ArrowRight size={10} />
        </span>
      </div>
    </article>
  );
}
