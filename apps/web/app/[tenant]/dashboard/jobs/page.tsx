'use client';

import {
  Archive,
  Briefcase,
  Check,
  ClipboardList,
  Copy,
  Edit3,
  ExternalLink,
  Filter,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';

import { JobFormModal } from './job-form-modal';
import { jobsApi } from './jobs-api';
import {
  EMPLOYMENT_TYPE_LABEL,
  JOB_STATUS_LABEL,
  getApplicationCount,
  type Job,
  type JobPayload,
  type JobStatus,
} from './types';

const ALLOWED_ROLES = new Set(['DEV', 'ADMIN', 'RH', 'GESTOR']);

function date(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

function statusClasses(status: JobStatus) {
  if (status === 'OPEN') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'DRAFT') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function publicJobUrl(companyId: string, jobId: string) {
  const path = `/carreiras/${encodeURIComponent(companyId)}/${encodeURIComponent(jobId)}`;
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
}

export default function JobsPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant ?? '';
  const { user, company } = useAuth();
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const canAccess = ALLOWED_ROLES.has(role);

  const jobs = useQuery(() => jobsApi.list(), [], { enabled: canAccess });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = jobs.data ?? [];
  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((job) => {
      if (status && job.status !== status) return false;
      if (!term) return true;
      return [job.title, job.location, job.employmentType, job.description]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [rows, search, status]);

  const totals = useMemo(
    () => ({
      total: rows.length,
      open: rows.filter((job) => job.status === 'OPEN').length,
      candidates: rows.reduce((sum, job) => sum + getApplicationCount(job), 0),
      drafts: rows.filter((job) => job.status === 'DRAFT').length,
    }),
    [rows],
  );

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Briefcase className="mx-auto text-amber-600" size={30} />
          <h1 className="mt-3 text-lg font-black text-amber-950">Acesso restrito ao recrutamento</h1>
          <p className="mt-2 text-sm font-medium text-amber-800">
            Esta área está disponível para os perfis DEV, ADMIN, RH e GESTOR.
          </p>
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setEditingJob(null);
    setModalOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setModalOpen(true);
    setOpenMenuId(null);
  };

  const save = async (payload: JobPayload) => {
    setSaving(true);
    try {
      if (editingJob) {
        await jobsApi.update(editingJob.id, payload);
        toast.success('Vaga atualizada com sucesso.');
      } else {
        await jobsApi.create(payload);
        toast.success('Vaga criada com sucesso.');
      }
      setModalOpen(false);
      setEditingJob(null);
      jobs.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível salvar a vaga.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const copyPublicLink = async (job: Job) => {
    const companyId = job.companyId || company?.id || user?.companyId;
    if (!companyId) {
      toast.error('A empresa da vaga não foi identificada.');
      return;
    }
    await navigator.clipboard.writeText(publicJobUrl(companyId, job.id));
    toast.success('Link público copiado.');
    setOpenMenuId(null);
  };

  const toggleJob = async (job: Job) => {
    const nextStatus: JobStatus = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    setBusyId(job.id);
    try {
      await jobsApi.update(job.id, { status: nextStatus });
      toast.success(nextStatus === 'OPEN' ? 'Vaga publicada.' : 'Vaga fechada.');
      jobs.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível alterar a publicação.');
    } finally {
      setBusyId(null);
      setOpenMenuId(null);
    }
  };

  const removeJob = async (job: Job) => {
    if (!window.confirm(`Excluir a vaga "${job.title}"? Essa ação não poderá ser desfeita.`)) return;
    setBusyId(job.id);
    try {
      await jobsApi.remove(job.id);
      toast.success('Vaga excluída.');
      jobs.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível excluir a vaga.');
    } finally {
      setBusyId(null);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="mx-auto w-full space-y-5">
      <header className="page-header items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Recrutamento</p>
          <h1 className="text-2xl font-black text-slate-950">Vagas e talentos</h1>
          <p className="text-sm font-medium text-slate-500">
            Publique oportunidades e acompanhe cada candidato até a admissão.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="crystal-button">
          <Plus size={14} /> Nova vaga
        </button>
      </header>

      {jobs.loading ? (
        <LoadingState label="Carregando vagas..." />
      ) : jobs.error ? (
        <ErrorState message={jobs.error} onRetry={jobs.refetch} />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Briefcase} label="Total de vagas" value={totals.total} tone="violet" />
            <SummaryCard icon={Check} label="Vagas abertas" value={totals.open} tone="teal" />
            <SummaryCard icon={Users} label="Candidaturas" value={totals.candidates} tone="blue" />
            <SummaryCard icon={ClipboardList} label="Em rascunho" value={totals.drafts} tone="amber" />
          </section>

          <section className="ops-card rounded-[14px] border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="form-control pl-9"
                  placeholder="Buscar por vaga, local ou tipo de contrato..."
                />
              </label>
              <label className="relative min-w-48">
                <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as JobStatus | '')}
                  className="form-control pl-9"
                >
                  <option value="">Todos os status</option>
                  <option value="OPEN">Abertas</option>
                  <option value="DRAFT">Rascunhos</option>
                  <option value="CLOSED">Fechadas</option>
                </select>
              </label>
            </div>
          </section>

          {filteredRows.length === 0 ? (
            <div className="ops-card rounded-[14px] border border-slate-200 bg-white">
              <EmptyState message={rows.length ? 'Nenhuma vaga corresponde aos filtros.' : 'Nenhuma vaga cadastrada. Crie a primeira oportunidade.'} />
              {!rows.length && (
                <div className="-mt-5 flex justify-center pb-8">
                  <button type="button" onClick={openCreate} className="crystal-button">
                    <Plus size={14} /> Criar primeira vaga
                  </button>
                </div>
              )}
            </div>
          ) : (
            <section className="ops-card overflow-visible rounded-[14px] border border-slate-200 bg-white">
              <div className="hidden grid-cols-[minmax(260px,1.7fr)_minmax(150px,.8fr)_110px_110px_150px_44px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500 lg:grid">
                <span>Vaga</span>
                <span>Modelo</span>
                <span>Candidatos</span>
                <span>Status</span>
                <span>Atualizada</span>
                <span />
              </div>

              <div className="divide-y divide-slate-100">
                {filteredRows.map((job) => {
                  const companyId = job.companyId || company?.id || user?.companyId || '';
                  const publicUrl = companyId ? publicJobUrl(companyId, job.id) : '';
                  return (
                    <article
                      key={job.id}
                      className="relative grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 lg:grid-cols-[minmax(260px,1.7fr)_minmax(150px,.8fr)_110px_110px_150px_44px] lg:items-center lg:gap-4 lg:px-5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/${tenant}/dashboard/jobs/${job.id}`}
                          className="font-black text-slate-950 hover:text-violet-700 hover:underline"
                        >
                          {job.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} /> {job.location || 'Local não informado'}
                          </span>
                          {job.salaryRange && <span>{job.salaryRange}</span>}
                        </div>
                      </div>

                      <div>
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                          {EMPLOYMENT_TYPE_LABEL[job.employmentType ?? ''] ?? job.employmentType ?? 'Não informado'}
                        </span>
                      </div>

                      <Link
                        href={`/${tenant}/dashboard/jobs/${job.id}`}
                        className="inline-flex w-fit items-center gap-1.5 text-xs font-black text-slate-800 hover:text-violet-700"
                      >
                        <Users size={14} className="text-slate-400" />
                        {getApplicationCount(job)}
                      </Link>

                      <div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${statusClasses(job.status)}`}>
                          {JOB_STATUS_LABEL[job.status]}
                        </span>
                      </div>

                      <div className="text-[11px] font-medium text-slate-500">
                        <span className="lg:hidden">Atualizada em </span>
                        {date(job.updatedAt)}
                      </div>

                      <div className="absolute right-4 top-4 lg:static">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((current) => (current === job.id ? null : job.id))}
                          className="btn-icon"
                          aria-label={`Ações da vaga ${job.title}`}
                          disabled={busyId === job.id}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenuId === job.id && (
                          <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                            <Link href={`/${tenant}/dashboard/jobs/${job.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                              <Users size={14} /> Abrir funil
                            </Link>
                            <button type="button" onClick={() => openEdit(job)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                              <Edit3 size={14} /> Editar vaga
                            </button>
                            <button type="button" onClick={() => copyPublicLink(job)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                              <Copy size={14} /> Copiar link público
                            </button>
                            {publicUrl && (
                              <a href={publicUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                                <ExternalLink size={14} /> Visualizar publicação
                              </a>
                            )}
                            <button type="button" onClick={() => toggleJob(job)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                              <Archive size={14} /> {job.status === 'OPEN' ? 'Fechar vaga' : 'Publicar vaga'}
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <button type="button" onClick={() => removeJob(job)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">
                              <Trash2 size={14} /> Excluir vaga
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <JobFormModal
        open={modalOpen}
        job={editingJob}
        saving={saving}
        onClose={() => {
          if (!saving) setModalOpen(false);
        }}
        onSubmit={save}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
  tone: 'violet' | 'teal' | 'blue' | 'amber';
}) {
  const tones = {
    violet: 'bg-violet-50 text-violet-700',
    teal: 'bg-teal-50 text-teal-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="ops-card flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={18} />
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-black leading-none text-slate-950">{value}</p>
      </div>
    </div>
  );
}
