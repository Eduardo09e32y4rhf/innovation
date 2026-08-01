'use client';

import Link from 'next/link';
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react';
import { CareersBrand, CareersFooter } from '../../_components/careers-brand';
import {
  applyToPublicJob,
  CareersApiError,
  employmentTypeLabel,
  getPublicJob,
  safeAccentColor,
  validateResume,
  type PublicCompany,
  type PublicJob,
} from '../../_lib/public-jobs';

type JobDetailsProps = {
  companyId: string;
  jobId: string;
};

type ApplicationForm = {
  name: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  coverLetter: string;
  website: string;
  consent: boolean;
};

const initialForm: ApplicationForm = {
  name: '',
  email: '',
  phone: '',
  linkedinUrl: '',
  coverLetter: '',
  website: '',
  consent: false,
};

const fallbackCompany = (companyId: string): PublicCompany => ({
  id: companyId,
  name: 'Portal de Carreiras',
});

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function LoadingDetails() {
  return (
    <main className="min-h-screen bg-[#f4f7f6]">
      <div className="h-72 animate-pulse bg-slate-950" />
      <div className="mx-auto -mt-12 grid max-w-6xl gap-6 px-5 pb-20 sm:px-8 lg:grid-cols-[1fr_390px]">
        <div className="h-[520px] animate-pulse rounded-3xl bg-white" />
        <div className="h-[520px] animate-pulse rounded-3xl bg-white" />
      </div>
    </main>
  );
}

export function JobDetails({ companyId, jobId }: JobDetailsProps) {
  const [job, setJob] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [resume, setResume] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');

    getPublicJob(companyId, jobId)
      .then((result) => {
        if (active) setJob(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setLoadError(
          requestError instanceof CareersApiError
            ? requestError.message
            : 'Não foi possível carregar esta oportunidade.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [companyId, jobId, reloadKey]);

  const company = job?.company ?? fallbackCompany(companyId);
  const accent = safeAccentColor(company.primaryColor);

  function updateField<Key extends keyof ApplicationForm>(
    key: Key,
    value: ApplicationForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    if (submitError) setSubmitError('');
  }

  function selectResume(file: File | null) {
    const validationError = validateResume(file);
    setResume(validationError ? null : file);
    setFileError(validationError ?? '');
    if (validationError && fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectResume(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    const resumeError = validateResume(resume);
    if (resumeError) {
      setFileError(resumeError);
      fileInputRef.current?.focus();
      return;
    }
    if (!form.consent) {
      setSubmitError('Confirme o consentimento para enviar sua candidatura.');
      return;
    }
    if (!resume) return;

    setSubmitting(true);
    try {
      const result = await applyToPublicJob(jobId, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        linkedinUrl: form.linkedinUrl,
        coverLetter: form.coverLetter,
        consent: form.consent,
        website: form.website,
        resume,
      });
      setSuccessMessage(result.message);
      setForm(initialForm);
      setResume(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (requestError) {
      if (requestError instanceof CareersApiError) {
        setSubmitError(
          requestError.status === 409
            ? 'Você já se inscreveu nesta vaga! Sua candidatura está em análise.'
            : requestError.message,
        );
      } else {
        setSubmitError('Não foi possível enviar sua candidatura. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingDetails />;

  if (!job || loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7f6] px-5">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <AlertCircle size={26} aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
            Vaga indisponível
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {loadError || 'Esta oportunidade não está mais recebendo candidaturas.'}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/carreiras/${encodeURIComponent(companyId)}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-xs font-black text-white"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Ver outras vagas
            </Link>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-black text-slate-700"
            >
              <RefreshCw size={15} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#f4f7f6] text-slate-950 selection:bg-teal-200"
      style={{ '--career-accent': accent } as React.CSSProperties}
    >
      <section className="relative overflow-hidden bg-[#071711] text-white">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_15%_15%,var(--career-accent),transparent_30%),radial-gradient(circle_at_90%_100%,#0f766e,transparent_26%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pb-28 sm:pt-8">
          <CareersBrand company={company} companyId={companyId} compact />

          <Link
            href={`/carreiras/${encodeURIComponent(companyId)}`}
            className="mt-12 inline-flex items-center gap-2 text-xs font-black text-slate-300 transition hover:text-white sm:mt-16"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Todas as oportunidades
          </Link>
          <div className="mt-6 max-w-4xl">
            <div className="flex flex-wrap gap-2">
              {job.department && (
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-teal-100">
                  {job.department}
                </span>
              )}
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-200">
                Vaga aberta
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
              {job.title}
            </h1>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-300">
              <span className="inline-flex items-center gap-2">
                <MapPin size={16} aria-hidden="true" />
                {job.location || 'Local a combinar'}
              </span>
              <span className="inline-flex items-center gap-2">
                <Briefcase size={16} aria-hidden="true" />
                {employmentTypeLabel(job.employmentType)}
              </span>
              {job.workMode && (
                <span className="inline-flex items-center gap-2">
                  <Building2 size={16} aria-hidden="true" />
                  {job.workMode}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-10 grid max-w-6xl items-start gap-6 px-5 pb-20 sm:-mt-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_390px]">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_70px_-42px_rgba(15,23,42,.5)]">
          <div className="p-6 sm:p-9">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[var(--career-accent)]">
                <FileText size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--career-accent)]">
                  Sobre a oportunidade
                </p>
                <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-950">
                  Descrição da vaga
                </h2>
              </div>
            </div>
            <div className="mt-7 whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-[15px]">
              {job.description || 'Os detalhes desta oportunidade serão apresentados durante o processo seletivo.'}
            </div>
          </div>

          {(job.salaryRange || job.benefits.length > 0) && (
            <div className="border-t border-slate-100 bg-slate-50/70 p-6 sm:p-9">
              {job.salaryRange && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Faixa salarial
                  </p>
                  <p className="mt-2 text-base font-black text-slate-900">{job.salaryRange}</p>
                </div>
              )}
              {job.benefits.length > 0 && (
                <div className={job.salaryRange ? 'mt-8' : ''}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Benefícios
                  </p>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {job.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-2.5 text-sm font-semibold text-slate-700"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                          <Check size={12} strokeWidth={3} aria-hidden="true" />
                        </span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Gamified Process Section - Gupy Style */}
          <div className="border-t border-slate-100 p-6 sm:p-9 bg-gradient-to-b from-white to-slate-50/50">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 font-black">
                🚀
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                  Transparência Innovation RH
                </p>
                <h3 className="text-lg font-black tracking-tight text-slate-950">
                  Conheça as etapas deste processo seletivo
                </h3>
              </div>
            </div>

            <div className="relative border-l-2 border-teal-200 ml-4 pl-6 space-y-6 my-4">
              <div className="relative group">
                <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-teal-300 font-black text-xs ring-4 ring-white shadow-sm">
                  1
                </span>
                <h4 className="text-sm font-black text-slate-900">Inscrição & Triagem Inteligente (IA)</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Sua candidatura é recebida em tempo real e nossa IA analisa a compatibilidade do seu currículo com os requisitos da vaga sem vieses inconscientes.
                </p>
              </div>

              <div className="relative group">
                <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-cyan-300 font-black text-xs ring-4 ring-white shadow-sm">
                  2
                </span>
                <h4 className="text-sm font-black text-slate-900">Avaliação por Gente & Gestão (RH)</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  O time de RH avalia sua trajetória profissional, carta de apresentação e alinhamento de valores com a cultura da empresa.
                </p>
              </div>

              <div className="relative group">
                <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-sky-300 font-black text-xs ring-4 ring-white shadow-sm">
                  3
                </span>
                <h4 className="text-sm font-black text-slate-900">Entrevista ou Desafio Prático</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Bate-papo online ou teste técnico para aprofundar nos seus conhecimentos e compartilhar detalhes sobre os objetivos da área.
                </p>
              </div>

              <div className="relative group">
                <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-violet-300 font-black text-xs ring-4 ring-white shadow-sm">
                  4
                </span>
                <h4 className="text-sm font-black text-slate-900">Entrevista Final com Gestores</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Encontro decisivo com a liderança para tirar dúvidas estratégicas e alinhar expectativas sobre o dia a dia na equipe.
                </p>
              </div>

              <div className="relative group">
                <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-emerald-300 font-black text-xs ring-4 ring-white shadow-sm">
                  5
                </span>
                <h4 className="text-sm font-black text-slate-700">Aprovação & Onboarding Digital</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Envio de proposta oficial, emissão automática de exame admissional (ASO) pela plataforma e integração digital 100% sem papel!
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-6 sm:p-9">
            <div className="flex gap-3 rounded-2xl border border-teal-100 bg-slate-50 p-4">
              <BadgeCheck size={20} className="mt-0.5 shrink-0 text-slate-700" aria-hidden="true" />
              <p className="text-xs leading-5 text-teal-900">
                A candidatura é gratuita. A empresa não solicita pagamentos ou dados bancários
                durante esta etapa do processo seletivo.
              </p>
            </div>
          </div>
        </article>

        <aside className="lg:sticky lg:top-5">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,.45)]">
            <div className="border-b border-slate-100 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--career-accent)]">
                Candidatura rápida
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                Candidate-se agora
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Preencha seus dados e anexe seu currículo. Leva menos de 3 minutos.
              </p>
            </div>

            {successMessage ? (
              <div className="p-6 text-left" role="status" aria-live="polite">
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-5 text-center mb-6">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 mb-3">
                    <CheckCircle2 size={30} aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-black text-slate-950">
                    Candidatura Enviada com Sucesso! 🎉
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 font-medium">
                    {successMessage}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                    <span>Status da sua inscrição</span>
                    <span className="text-teal-600 font-black animate-pulse">● Ativo</span>
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-900 bg-white p-2.5 rounded-xl border border-teal-200 shadow-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white text-[10px]">✓</span>
                      <span>Fase 1: Triagem com IA em Andamento</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-400 p-2 opacity-60">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-[10px]">2</span>
                      <span>Fase 2: Avaliação por Gente & Gestão</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-400 p-2 opacity-60">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-[10px]">3</span>
                      <span>Fase 3: Entrevistas & Alinhamento</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 font-medium leading-relaxed">
                    💡 <strong>Dica Innovation:</strong> Avisaremos sobre cada avanço diretamente no seu e-mail e WhatsApp cadastrados.
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href="/carreiras"
                    className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white hover:bg-slate-800 shadow-md transition"
                  >
                    🚀 Acompanhar Portal de Vagas
                  </Link>
                  <Link
                    href={`/carreiras/${encodeURIComponent(companyId)}`}
                    className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    Ver outras vagas desta empresa
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
                >
                  <label htmlFor="candidate-website">Não preencha este campo</label>
                  <input
                    id="candidate-website"
                    name="website"
                    type="text"
                    value={form.website}
                    onChange={(event) => updateField('website', event.target.value)}
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>

                <Field
                  id="candidate-name"
                  label="Nome completo"
                  icon={<UserRound size={16} />}
                >
                  <input
                    id="candidate-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    minLength={3}
                    maxLength={120}
                    autoComplete="name"
                    required
                    placeholder="Como podemos chamar você?"
                    className={inputClass}
                  />
                </Field>

                <Field id="candidate-email" label="E-mail" icon={<Mail size={16} />}>
                  <input
                    id="candidate-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    maxLength={160}
                    autoComplete="email"
                    required
                    placeholder="voce@email.com"
                    className={inputClass}
                  />
                </Field>

                <Field id="candidate-phone" label="Telefone / WhatsApp" icon={<Phone size={16} />}>
                  <input
                    id="candidate-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => updateField('phone', formatPhone(event.target.value))}
                    minLength={14}
                    maxLength={15}
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    placeholder="(00) 00000-0000"
                    className={inputClass}
                  />
                </Field>

                <Field id="candidate-linkedin" label="LinkedIn (opcional)" icon={<Building2 size={16} />}>
                  <input
                    id="candidate-linkedin"
                    name="linkedinUrl"
                    type="url"
                    value={form.linkedinUrl}
                    onChange={(event) => updateField('linkedinUrl', event.target.value)}
                    maxLength={300}
                    placeholder="https://linkedin.com/in/seu-perfil"
                    className={inputClass}
                  />
                </Field>

                <div>
                  <label
                    htmlFor="candidate-cover-letter"
                    className="mb-1.5 block text-[11px] font-black text-slate-700"
                  >
                    Apresentação <span className="font-semibold text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    id="candidate-cover-letter"
                    name="coverLetter"
                    value={form.coverLetter}
                    onChange={(event) => updateField('coverLetter', event.target.value)}
                    maxLength={1500}
                    rows={4}
                    placeholder="Conte brevemente por que esta vaga combina com você."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--career-accent)] focus:bg-white focus:ring-4 focus:ring-teal-950/5"
                  />
                  <p className="mt-1 text-right text-[10px] font-semibold text-slate-400">
                    {form.coverLetter.length}/1500
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="candidate-resume"
                    className="mb-1.5 block text-[11px] font-black text-slate-700"
                  >
                    Currículo
                  </label>
                  <input
                    ref={fileInputRef}
                    id="candidate-resume"
                    name="resume"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    required
                    className="sr-only"
                  />
                  {resume ? (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700">
                        <Paperclip size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black text-emerald-950">
                          {resume.name}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-700">
                          {formatFileSize(resume.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setResume(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-800 hover:bg-emerald-100"
                        aria-label="Remover currículo"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="candidate-resume"
                      className={`flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-4 py-5 text-center transition hover:bg-slate-50 ${
                        fileError ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <UploadCloud
                        size={22}
                        className={fileError ? 'text-rose-500' : 'text-[var(--career-accent)]'}
                        aria-hidden="true"
                      />
                      <span className="mt-2 text-xs font-black text-slate-800">
                        Clique para anexar
                      </span>
                      <span className="mt-1 text-[10px] font-semibold text-slate-400">
                        PDF ou DOCX, máximo de 5 MB
                      </span>
                    </label>
                  )}
                  {fileError && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                      <AlertCircle size={12} aria-hidden="true" />
                      {fileError}
                    </p>
                  )}
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(event) => updateField('consent', event.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--career-accent)]"
                  />
                  <span className="text-[10px] leading-4 text-slate-500">
                    Autorizo o tratamento dos meus dados (LGPD) exclusivamente para fins deste processo
                    seletivo. Estou ciente de que, conforme a Política de Privacidade (ISO 27701), 
                    meu currículo poderá ser retido por até 6 meses para futuras oportunidades e que
                    posso solicitar sua exclusão a qualquer momento.
                  </span>
                </label>

                {submitError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-[var(--career-accent)] disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                      Enviando candidatura...
                    </>
                  ) : (
                    <>
                      <Send size={16} aria-hidden="true" />
                      Enviar candidatura
                    </>
                  )}
                </button>

                <p className="flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold text-slate-400">
                  <ShieldCheck size={13} aria-hidden="true" />
                  Seus dados serão usados somente neste processo seletivo.
                </p>
              </form>
            )}
          </div>
        </aside>
      </section>

      <CareersFooter company={company} />
    </main>
  );
}

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--career-accent)] focus:bg-white focus:ring-4 focus:ring-teal-950/5';

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-black text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}
