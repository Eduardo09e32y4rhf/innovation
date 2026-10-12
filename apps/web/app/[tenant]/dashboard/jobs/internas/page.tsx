'use client';

import { Briefcase } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { InternalCandidateForm } from '../_components/internal-candidate';
import { jobsApi } from '../jobs-api';
import { WORK_MODE_LABEL } from '../types';

/** Vagas de processo interno: o funcionário digita a matrícula e o cadastro dele preenche a candidatura. */
export default function InternalJobsPage() {
  const { company } = useAuth();
  const jobs = useQuery(() => jobsApi.internalJobs(), [company?.id]);
  const [openId, setOpenId] = useState<string | null>(null);

  return <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
    <header><h1 className="text-2xl font-semibold text-fg">Vagas internas</h1><p className="text-sm text-fg-sub">Oportunidades abertas só para quem já trabalha na empresa. Informe sua matrícula e seus dados já vêm do seu cadastro.</p></header>
    {jobs.error && <ErrorState message={jobs.error} onRetry={jobs.refetch} />}
    {jobs.loading && !jobs.data ? <LoadingState label="Carregando vagas..." /> : jobs.data && jobs.data.length === 0 ? <EmptyState message="Nenhuma vaga interna aberta no momento." /> : (jobs.data ?? []).map((job) => <article key={job.id} className="rounded-2xl border border-border bg-bg p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[var(--color-brand)]"><Briefcase size={18} aria-hidden="true" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-fg">{job.title}</h2><p className="text-xs text-fg-sub">{[job.department, job.location, job.workMode && WORK_MODE_LABEL[job.workMode], job.deadline && `até ${new Date(job.deadline).toLocaleDateString('pt-BR')}`].filter(Boolean).join(' · ')}</p></div>
        {job.alreadyApplied ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Candidatura enviada</span> : <button type="button" className="btn btn-primary btn-md" onClick={() => setOpenId(openId === job.id ? null : job.id)}>{openId === job.id ? 'Fechar' : 'Quero me candidatar'}</button>}
      </div>
      <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-fg-sub">{job.description}</p>
      {openId === job.id && <div className="mt-4 border-t border-border pt-4"><InternalCandidateForm jobId={job.id} onCancel={() => setOpenId(null)} onDone={() => { setOpenId(null); jobs.refetch(); }} /></div>}
    </article>)}
  </div>;
}
