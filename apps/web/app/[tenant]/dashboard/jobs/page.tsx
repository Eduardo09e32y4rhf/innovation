'use client';

import {
  Archive,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Copy,
  Edit3,
  ExternalLink,
  Filter,
  Globe2,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
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
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value));
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function publicJobUrl(companyId: string, jobId: string) {
  const path = `/carreiras/${encodeURIComponent(companyId)}/${encodeURIComponent(jobId)}`;
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
}

function statusTone(status: JobStatus) {
  if (status === 'OPEN') return 'chip-success';
  if (status === 'DRAFT') return 'chip-warning';
  return 'chip';
}

function statusDescription(status: JobStatus) {
  if (status === 'OPEN') return 'Visível no portal de carreiras';
  if (status === 'DRAFT') return 'Ainda não publicada';
  return 'Publicação encerrada';
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
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  const rows = jobs.data ?? [];
  const totals = useMemo(
    () => ({
      total: rows.length,
      open: rows.filter((job) => job.status === 'OPEN').length,
      candidates: rows.reduce((sum, job) => sum + getApplicationCount(job), 0),
      drafts: rows.filter((job) => job.status === 'DRAFT').length,
      closed: rows.filter((job) => job.status === 'CLOSED').length,
    }),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return rows.filter((job) => {
      if (status && job.status !== status) return false;
      if (!term) return true;
      return [job.title, job.location, job.employmentType, job.description, ...(job.benefits ?? [])]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [rows, search, status]);
  const attentionJob = rows.find((job) => job.status === 'OPEN' && getApplicationCount(job) === 0);
  const hasFilters = Boolean(search || status);

  if (!canAccess) {
    return (
      <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
        <div className="card-v2 mx-auto max-w-2xl p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-v2 bg-brand/10 text-brand"><Briefcase size={26} /></span>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-brand">Recrutamento</p>
          <h1 className="mt-1 text-xl font-black text-fg">Acesso restrito ao recrutamento</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-fg-mut">Esta área está disponível para os perfis DEV, ADMIN, RH e GESTOR.</p>
        </div>
      </div>
    );
  }

  const openCreate = () => { setEditingJob(null); setModalOpen(true); };
  const openEdit = (job: Job) => { setEditingJob(job); setModalOpen(true); setOpenMenuId(null); };

  const save = async (payload: JobPayload) => {
    setSaving(true);
    try {
      if (editingJob) { await jobsApi.update(editingJob.id, payload); toast.success('Vaga atualizada com sucesso.'); }
      else { await jobsApi.create(payload); toast.success('Vaga criada com sucesso.'); }
      setModalOpen(false); setEditingJob(null); jobs.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível salvar a vaga.');
      throw error;
    } finally { setSaving(false); }
  };

  const copyPublicLink = async (job: Job) => {
    const companyId = job.companyId || company?.id || user?.companyId;
    if (!companyId) { toast.error('A empresa da vaga não foi identificada.'); return; }
    try { await navigator.clipboard.writeText(publicJobUrl(companyId, job.id)); toast.success('Link público copiado.'); }
    catch { toast.error('Não foi possível copiar o link público.'); }
    setOpenMenuId(null);
  };

  const toggleJob = async (job: Job) => {
    const nextStatus: JobStatus = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    setBusyId(job.id);
    try { await jobsApi.update(job.id, { status: nextStatus }); toast.success(nextStatus === 'OPEN' ? 'Vaga publicada.' : 'Vaga fechada.'); jobs.refetch(); }
    catch (error) { toast.error(error instanceof ApiError ? error.message : 'Não foi possível alterar a publicação.'); }
    finally { setBusyId(null); setOpenMenuId(null); }
  };

  const removeJob = async () => {
    if (!jobToDelete) return;
    const job = jobToDelete;
    setBusyId(job.id);
    try { await jobsApi.remove(job.id); toast.success('Vaga excluída.'); jobs.refetch(); setJobToDelete(null); }
    catch (error) { toast.error(error instanceof ApiError ? error.message : 'Não foi possível excluir a vaga.'); }
    finally { setBusyId(null); setOpenMenuId(null); }
  };

  return (
    <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      <div className="flex flex-col gap-5">
        <header className="card-v2 relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip-brand inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]"><Sparkles size={12} /> Recrutamento inteligente</span>
                <span className="text-[10px] font-bold text-fg-sub">{company?.name ?? 'Sua empresa'}</span>
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-fg sm:text-3xl">Vagas & talentos</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-fg-mut">Transforme cada oportunidade em uma jornada clara: publique, acompanhe o funil e leve os melhores talentos até a admissão.</p>
            </div>
            <button type="button" onClick={openCreate} className="btn-v2-primary relative shrink-0"><Plus size={16} /> Nova vaga</button>
          </div>
        </header>

        {jobs.loading ? <LoadingState label="Carregando vagas..." /> : jobs.error ? <ErrorState message={jobs.error} onRetry={jobs.refetch} /> : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Briefcase} label="Portfólio total" value={totals.total} detail={`${totals.closed} encerrada(s)`} tone="brand" />
              <MetricCard icon={Globe2} label="Publicadas agora" value={totals.open} detail="Visíveis no portal" tone="success" />
              <MetricCard icon={Users} label="Candidaturas" value={totals.candidates} detail="Em todos os funis" tone="accent" />
              <MetricCard icon={ClipboardList} label="Rascunhos" value={totals.drafts} detail={totals.drafts ? 'Prontas para revisar' : 'Tudo publicado'} tone="warning" />
            </section>

            <section className="card-v2 grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-v2 bg-accent/10 text-accent"><Sparkles size={16} /></span><div><p className="text-xs font-black text-fg">Próximo melhor movimento</p><p className="mt-1 text-xs text-fg-mut">{attentionJob ? `A vaga “${attentionJob.title}” está publicada, mas ainda não recebeu candidaturas.` : totals.open ? 'Suas vagas publicadas já estão recebendo movimento. Acompanhe o funil para não perder bons candidatos.' : 'Publique sua primeira vaga para começar a formar o funil de talentos.'}</p></div></div>
              {attentionJob ? <Link href={`/${tenant}/dashboard/jobs/${attentionJob.id}`} className="btn-v2-outline w-fit">Abrir funil <ArrowUpRight size={14} /></Link> : <button type="button" onClick={openCreate} className="btn-v2-outline w-fit">Criar oportunidade <ArrowUpRight size={14} /></button>}
            </section>

            <section className="card-v2 p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label className="relative flex-1"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-sub" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input-v2 h-11 pl-10" placeholder="Buscar por cargo, local, contrato ou benefício..." /></label>
                  {hasFilters && <button type="button" onClick={() => { setSearch(''); setStatus(''); }} className="btn-v2-outline h-11 shrink-0"><X size={14} /> Limpar filtros</button>}
                </div>
                <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 overflow-x-auto pb-1"><Filter size={14} className="shrink-0 text-fg-sub" /><StatusTab label="Todas" count={totals.total} active={!status} onClick={() => setStatus('')} /><StatusTab label="Abertas" count={totals.open} active={status === 'OPEN'} onClick={() => setStatus('OPEN')} tone="success" /><StatusTab label="Rascunhos" count={totals.drafts} active={status === 'DRAFT'} onClick={() => setStatus('DRAFT')} tone="warning" /><StatusTab label="Fechadas" count={totals.closed} active={status === 'CLOSED'} onClick={() => setStatus('CLOSED')} /></div><p className="shrink-0 text-[11px] font-bold text-fg-sub">{filteredRows.length} {filteredRows.length === 1 ? 'vaga encontrada' : 'vagas encontradas'}</p></div>
              </div>
            </section>

            {filteredRows.length === 0 ? <div className="card-v2 p-2"><EmptyState message={rows.length ? 'Nenhuma vaga corresponde aos filtros.' : 'Nenhuma vaga cadastrada. Crie a primeira oportunidade.'} /><div className="flex justify-center pb-8"><button type="button" onClick={rows.length ? () => { setSearch(''); setStatus(''); } : openCreate} className="btn-v2-primary">{rows.length ? <><X size={14} /> Limpar filtros</> : <><Plus size={14} /> Criar primeira vaga</>}</button></div></div> : (
              <section className="card-v2 overflow-visible">
                <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="text-sm font-black text-fg">Suas oportunidades</h2><p className="mt-0.5 text-xs text-fg-mut">Cada vaga tem seu próprio funil de candidatos.</p></div><span className="chip inline-flex w-fit items-center gap-1.5 text-[10px] font-black"><CheckCircle2 size={12} className="text-brand" /> Atualizado agora</span></div>
                <div className="hidden grid-cols-[minmax(260px,1.7fr)_minmax(145px,.8fr)_100px_120px_120px_44px] gap-4 border-b border-border bg-bg-sub/60 px-5 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-fg-sub lg:grid"><span>Oportunidade</span><span>Contrato</span><span>Talentos</span><span>Status</span><span>Atualizada</span><span /></div>
                <div className="divide-y divide-border">{filteredRows.map((job) => { const companyId = job.companyId || company?.id || user?.companyId || ''; const publicUrl = companyId ? publicJobUrl(companyId, job.id) : ''; return (
                  <article key={job.id} className="relative grid gap-4 px-4 py-4 transition-colors hover:bg-bg-sub/60 lg:grid-cols-[minmax(260px,1.7fr)_minmax(145px,.8fr)_100px_120px_120px_44px] lg:items-center lg:gap-4 lg:px-5">
                    <div className="min-w-0 pr-10 lg:pr-0"><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-v2 ${job.status === 'OPEN' ? 'bg-brand/10 text-brand' : job.status === 'DRAFT' ? 'bg-accent/10 text-accent' : 'bg-bg-sub text-fg-sub'}`}><Briefcase size={16} /></span><div className="min-w-0"><Link href={`/${tenant}/dashboard/jobs/${job.id}`} className="truncate text-sm font-black text-fg hover:text-brand hover:underline">{job.title}</Link><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-fg-mut"><span className="inline-flex items-center gap-1"><MapPin size={11} /> {job.location || 'Local não informado'}</span>{job.salaryRange && <span>{job.salaryRange}</span>}</div></div></div></div>
                    <div className="pl-12 lg:pl-0"><span className="chip inline-flex px-2.5 py-1 text-[10px] font-bold">{EMPLOYMENT_TYPE_LABEL[job.employmentType ?? ''] ?? job.employmentType ?? 'Não informado'}</span></div>
                    <Link href={`/${tenant}/dashboard/jobs/${job.id}`} className="inline-flex w-fit items-center gap-1.5 pl-12 text-xs font-black text-fg hover:text-brand lg:pl-0"><Users size={14} className="text-brand" /> {getApplicationCount(job)}</Link>
                    <div className="pl-12 lg:pl-0"><span className={`${statusTone(job.status)} inline-flex px-2.5 py-1 text-[9px] font-black uppercase`} title={statusDescription(job.status)}>{JOB_STATUS_LABEL[job.status]}</span></div>
                    <div className="pl-12 text-[11px] font-medium text-fg-mut lg:pl-0"><span className="lg:hidden">Atualizada em </span>{date(job.updatedAt)}<span className="ml-1 hidden text-fg-sub sm:inline">· {fullDate(job.updatedAt)}</span></div>
                    <div className="absolute right-4 top-4 lg:static"><button type="button" onClick={() => setOpenMenuId((current) => current === job.id ? null : job.id)} className="btn-v2-outline flex h-9 w-9 items-center justify-center p-0" aria-label={`Ações da vaga ${job.title}`} disabled={busyId === job.id}><MoreHorizontal size={16} /></button>{openMenuId === job.id && <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-v2 border border-border bg-bg-elev p-1.5 shadow-v2-xl"><Link href={`/${tenant}/dashboard/jobs/${job.id}`} onClick={() => setOpenMenuId(null)} className="flex items-center gap-2 rounded-v2 px-3 py-2.5 text-xs font-bold text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg"><Users size={14} /> Abrir funil</Link><button type="button" onClick={() => openEdit(job)} className="flex w-full items-center gap-2 rounded-v2 px-3 py-2.5 text-left text-xs font-bold text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg"><Edit3 size={14} /> Editar vaga</button><button type="button" onClick={() => copyPublicLink(job)} className="flex w-full items-center gap-2 rounded-v2 px-3 py-2.5 text-left text-xs font-bold text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg"><Copy size={14} /> Copiar link público</button>{publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer" onClick={() => setOpenMenuId(null)} className="flex items-center gap-2 rounded-v2 px-3 py-2.5 text-xs font-bold text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg"><ExternalLink size={14} /> Visualizar publicação</a>}<button type="button" onClick={() => toggleJob(job)} className="flex w-full items-center gap-2 rounded-v2 px-3 py-2.5 text-left text-xs font-bold text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg"><Archive size={14} /> {job.status === 'OPEN' ? 'Fechar vaga' : 'Publicar vaga'}</button><div className="my-1 border-t border-border" /><button type="button" onClick={() => { setJobToDelete(job); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-v2 px-3 py-2.5 text-left text-xs font-bold text-danger transition-colors hover:bg-danger/10"><Trash2 size={14} /> Excluir vaga</button></div>}</div>
                  </article>
                ); })}</div>
              </section>
            )}
          </>
        )}

        <JobFormModal open={modalOpen} job={editingJob} saving={saving} onClose={() => { if (!saving) setModalOpen(false); }} onSubmit={save} />
        {jobToDelete && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]"><div className="card-v2 w-full max-w-md bg-bg-elev p-6 shadow-v2-xl"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger"><Trash2 size={18} /></span><div><h2 className="text-sm font-black text-fg">Excluir esta vaga?</h2><p className="mt-1 text-xs leading-5 text-fg-mut">“{jobToDelete.title}” será removida e essa ação não poderá ser desfeita.</p></div></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setJobToDelete(null)} disabled={busyId === jobToDelete.id} className="btn-v2-outline">Cancelar</button><button type="button" onClick={removeJob} disabled={busyId === jobToDelete.id} className="inline-flex h-10 items-center gap-2 rounded-v2 bg-danger px-4 text-xs font-black text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"><Trash2 size={14} /> {busyId === jobToDelete.id ? 'Excluindo...' : 'Excluir vaga'}</button></div></div></div>}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }: { icon: typeof Briefcase; label: string; value: number; detail: string; tone: 'brand' | 'success' | 'accent' | 'warning' }) {
  const styles = { brand: 'bg-brand/10 text-brand', success: 'bg-emerald-500/10 text-emerald-600', accent: 'bg-accent/10 text-accent', warning: 'bg-amber-500/10 text-amber-600' };
  return <div className="card-v2 flex items-center gap-3 p-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-v2 ${styles[tone]}`}><Icon size={18} /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-fg-mut">{label}</p><p className="mt-1 text-2xl font-black leading-none text-fg">{value}</p><p className="mt-1 truncate text-[10px] font-medium text-fg-sub">{detail}</p></div></div>;
}

function StatusTab({ label, count, active, onClick, tone = 'default' }: { label: string; count: number; active: boolean; onClick: () => void; tone?: 'default' | 'success' | 'warning' }) {
  const activeClass = tone === 'success' ? 'bg-emerald-500/10 text-emerald-700' : tone === 'warning' ? 'bg-amber-500/10 text-amber-700' : 'bg-brand/10 text-brand';
  return <button type="button" onClick={onClick} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition-colors ${active ? activeClass : 'text-fg-mut hover:bg-bg-sub hover:text-fg'}`}><span>{label}</span><span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? 'bg-white/70' : 'bg-bg-sub'}`}>{count}</span></button>;
}
