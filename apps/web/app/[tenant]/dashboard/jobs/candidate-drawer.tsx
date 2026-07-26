'use client';

import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Briefcase,
  CalendarDays,
  Download,
  FileText,
  Linkedin,
  Loader2,
  Mail,
  Phone,
  Rocket,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';

import type { ApplicationStatus, Job, JobApplication } from './types';
import { normalizeApplicationStatus } from './types';

interface CandidateDrawerProps {
  application: JobApplication | null;
  job: Job;
  updating: boolean;
  hiring: boolean;
  downloadingResume: boolean;
  onClose: () => void;
  onStatusChange: (status: ApplicationStatus) => Promise<void>;
  onHire: () => Promise<void>;
  onDownloadResume: () => Promise<void>;
}

const STATUS_OPTIONS: Array<{ value: Exclude<ApplicationStatus, 'REVIEWING'>; label: string }> = [
  { value: 'APPLIED', label: 'Inscrito' },
  { value: 'SCREENING', label: 'Em análise' },
  { value: 'INTERVIEW', label: 'Entrevista' },
  { value: 'OFFER', label: 'Proposta enviada' },
  { value: 'REJECTED', label: 'Reprovado' },
];

function dateTime(value?: string) {
  if (!value) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function CandidateDrawer({
  application,
  job,
  updating,
  hiring,
  downloadingResume,
  onClose,
  onStatusChange,
  onHire,
  onDownloadResume,
}: CandidateDrawerProps) {
  if (!application) return null;

  const candidate = application.candidate;
  const currentStatus = normalizeApplicationStatus(application.status);
  const score = Math.min(100, Math.max(0, candidate.aiScore ?? 0));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]" role="presentation">
      <button
        type="button"
        aria-label="Fechar detalhes"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-drawer-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl"
      >
        <header className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black">
                {candidate.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-300">
                  Dossiê do candidato
                </p>
                <h2 id="candidate-drawer-title" className="truncate text-lg font-black">
                  {candidate.name}
                </h2>
                <p className="truncate text-xs font-medium text-slate-300">{job.title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Etapa atual
                </span>
                <select
                  value={currentStatus}
                  disabled={updating || hiring}
                  onChange={(event) => onStatusChange(event.target.value as ApplicationStatus)}
                  className="form-control"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600">
                {updating ? <Loader2 size={14} className="animate-spin text-violet-600" /> : <ArrowRight size={14} />}
                {updating ? 'Atualizando etapa...' : 'Alteração salva no funil'}
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <UserRound size={15} className="text-teal-600" />
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">Contato</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <ContactLine icon={Mail} value={candidate.email} href={candidate.email ? `mailto:${candidate.email}` : undefined} />
                <ContactLine icon={Phone} value={candidate.phone} href={candidate.phone ? `tel:${candidate.phone}` : undefined} />
                <ContactLine
                  icon={Linkedin}
                  value={candidate.linkedinUrl ? 'Perfil no LinkedIn' : null}
                  href={candidate.linkedinUrl ?? undefined}
                  external
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays size={15} className="text-violet-600" />
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">Candidatura</h3>
              </div>
              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Recebida em</dt>
                  <dd className="mt-0.5 font-bold text-slate-700">{dateTime(application.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Última movimentação</dt>
                  <dd className="mt-0.5 font-bold text-slate-700">{dateTime(application.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
            <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-50 to-teal-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <BrainCircuit size={16} className="text-violet-700" />
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Triagem inteligente</h3>
              </div>
              {candidate.aiScore != null ? (
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{score}% aderente</span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-500">
                  Análise pendente
                </span>
              )}
            </header>
            <div className="space-y-4 p-4">
              {candidate.aiScore != null && (
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-teal-500"
                    style={{ width: `${score}%` }}
                  />
                </div>
              )}
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500">
                  <Sparkles size={12} /> Resumo
                </p>
                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">
                  {candidate.aiSummary || 'A análise automática ainda não foi concluída para este currículo.'}
                </p>
              </div>
              {(candidate.aiSkills?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.aiSkills?.map((skill) => (
                    <span key={skill} className="rounded-lg border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {candidate.aiNotes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[10px] font-black uppercase text-amber-700">Pontos de atenção</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-amber-950">{candidate.aiNotes}</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-teal-600" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">Currículo</h3>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                    Documento enviado na candidatura
                  </p>
                </div>
              </div>
              {candidate.resumeAvailable || candidate.resumeUrl ? (
                <button
                  type="button"
                  onClick={onDownloadResume}
                  disabled={downloadingResume}
                  className="btn-outline-nubank"
                >
                  {downloadingResume ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  {downloadingResume ? 'Baixando...' : 'Baixar currículo'}
                </button>
              ) : (
                <span className="text-[10px] font-bold text-slate-400">Não anexado</span>
              )}
            </div>
          </section>

          {candidate.coverLetter && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Briefcase size={15} className="text-slate-500" />
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">Apresentação</h3>
              </div>
              <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{candidate.coverLetter}</p>
            </section>
          )}

          <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <div className="flex items-start gap-3">
              <BadgeCheck size={20} className="mt-0.5 shrink-0 text-teal-700" />
              <div>
                <h3 className="text-xs font-black text-teal-950">Ponte para admissão</h3>
                <p className="mt-1 text-[11px] leading-5 text-teal-800">
                  Ao contratar, os dados do candidato serão reaproveitados e o colaborador será criado em onboarding para conferência do RH e ASO admissional.
                </p>
              </div>
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-white p-4 sm:p-5">
          {currentStatus !== 'HIRED' ? (
            <button
              type="button"
              onClick={onHire}
              disabled={hiring || updating}
              className="crystal-button h-11 w-full text-sm"
            >
              {hiring ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              {hiring ? 'Criando colaborador em onboarding...' : 'Contratar e iniciar admissão'}
            </button>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-black text-emerald-800">
              Admissão iniciada. O colaborador está em conferência de dados e ASO.
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

function ContactLine({
  icon: Icon,
  value,
  href,
  external,
}: {
  icon: typeof Mail;
  value?: string | null;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-slate-600">
      <Icon size={13} className="shrink-0 text-slate-400" />
      {href ? (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noreferrer' : undefined}
          className="truncate font-bold text-slate-700 hover:text-violet-700 hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="text-slate-400">Não informado</span>
      )}
    </div>
  );
}
