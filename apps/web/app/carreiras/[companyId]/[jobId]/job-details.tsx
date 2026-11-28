'use client';

import { TurnstileWidget } from '@/app/_components/turnstile-widget';
import { CONSENT_TEXTS } from '../../_lib/consent-texts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { useI18n } from '@/app/contexts/I18nContext';
import { CareersBrand } from '../../_components/careers-brand';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { hasUntranslatedJobContent, hasUntranslatedQuestionContent, translatedJob, translatedQuestion } from '../../_lib/job-translations';
import { PortalFooter } from '../../_components/portal-chrome';
import { candidateApi, getCandidateToken, type CandidateProfile } from '../../_lib/candidate-api';
import {
  applyToPublicJob, CareersApiError, employmentTypeLabel, getPublicJob, isValidInternationalPhoneInput, jobPostingJsonLd, publicSalaryLabel, readTrafficSource, trackedJobUrl, validateResume, workModeLabel,
  type PublicJob, type PublicQuestion,
} from '../../_lib/public-jobs';

const EMPTY = { name: '', email: '', phone: '', linkedinUrl: '', coverLetter: '', website: '', consent: false, gender: '', race: '', pcd: '', talentPoolOptIn: false, sensitiveConsent: false };
type Answers = Record<string, string | string[]>;

function maskPhone(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    return trimmed.replace(/[^\d+().\s-]/g, '').slice(0, 40);
  }
  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('55') ? digits.slice(2) : digits;
  const limited = normalized.slice(0, 11);
  if (limited.length <= 2) return limited;
  if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  if (limited.length <= 10) return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-bg-sub px-3 py-1 text-xs font-medium text-fg">{children}</span>;
}

export function QuestionField({ question, value, error, onChange }: { question: PublicQuestion; value: string | string[] | undefined; error?: string; onChange: (next: string | string[]) => void }) {
  const { t } = useI18n();
  const { language } = useLanguage();
  const translated = translatedQuestion(question, language);
  const id = `q-${question.id}`;
  const label = <span className="text-sm font-medium">{translated.label}{question.required && ' *'}</span>;
  const common = { id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined };
  const text = typeof value === 'string' ? value : '';
  const chosen = Array.isArray(value) ? value : [];
  let control: React.ReactNode;

  if (question.type === 'LONG') control = <textarea {...common} rows={4} maxLength={3000} className="input-v2 resize-y text-base sm:text-sm" value={text} onChange={(event) => onChange(event.target.value)} />;
  else if (question.type === 'NUMBER') control = <input {...common} type="number" inputMode="decimal" className="input-v2 min-h-11 text-base sm:text-sm" value={text} onChange={(event) => onChange(event.target.value)} />;
  else if (question.type === 'SELECT') control = (
    <select {...common} className="input-v2 min-h-11 text-base sm:text-sm" value={text} onChange={(event) => onChange(event.target.value)}>
      <option value="">{t('Selecione…')}</option>{question.options.map((option, index) => <option key={option} value={option}>{translated.options[index] === option ? t(option) : translated.options[index]}</option>)}
    </select>
  );
  else if (question.type === 'YESNO' || question.type === 'MULTI') {
    const options = question.type === 'YESNO' ? ['Sim', 'Não'] : question.options;
    control = (
      <div role={question.type === 'YESNO' ? 'radiogroup' : 'group'} aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = question.type === 'YESNO' ? text === option : chosen.includes(option);
          const translatedOption = translated.options[question.options.indexOf(option)];
          const optionLabel = translatedOption !== option ? translatedOption : t(option);
          return (
            <button key={option} type="button" role={question.type === 'YESNO' ? 'radio' : 'checkbox'} aria-checked={active}
              onClick={() => onChange(question.type === 'YESNO' ? option : active ? chosen.filter((item) => item !== option) : [...chosen, option])}
              className={`min-h-11 rounded-lg border px-4 text-sm font-medium transition ${active ? 'border-purple-600 bg-purple-600 text-white' : 'border-border hover:bg-bg-sub'}`}>{optionLabel}</button>
          );
        })}
      </div>
    );
  } else control = <input {...common} type="text" maxLength={500} className="input-v2 min-h-11 text-base sm:text-sm" value={text} onChange={(event) => onChange(event.target.value)} />;

  return (
    <div className="space-y-1.5">
      <label id={`${id}-label`} htmlFor={id} className="block">{label}</label>
      {control}
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-rose-700">{t(error)}</p>}
    </div>
  );
}

export function JobDetails({ companyId, jobId }: { companyId: string; jobId: string }) {
  const { t } = useI18n();
  const { language } = useLanguage();
  const [job, setJob] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [answers, setAnswers] = useState<Answers>({});
  const [resume, setResume] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [account, setAccount] = useState<CandidateProfile | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [assessmentsComplete, setAssessmentsComplete] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [accountReload, setAccountReload] = useState(0);
  const [reuse, setReuse] = useState<'ask' | 'yes' | 'no'>('ask');
  const [reuseConsent, setReuseConsent] = useState(false);
  const pending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const displayJob = useMemo(() => job ? translatedJob(job, language) : null, [job, language]);

  // NAO pré-preenche o formulário automaticamente: a reutilização só acontece quando o usuario clica em "Sim, reutilizar".
  // Isso garante que os dados nunca são preenchidos sem consentimento explícito.

  useEffect(() => {
    let active = true; setLoading(true); setLoadError(''); setJob(null);
    getPublicJob(companyId, jobId).then((result) => { if (active) setJob(result); })
      .catch((cause) => { if (active) setLoadError(cause instanceof Error ? cause.message : 'Não foi possível carregar esta vaga.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId, jobId, reload]);
  useEffect(() => {
    if (!getCandidateToken()) { setAccountLoading(false); return; }
    let active = true; setAccountLoading(true); setAssessmentError('');
    candidateApi.me().then((result) => { if (active) setAccount(result); return candidateApi.assessments(); }).then(rows => { if (active) setAssessmentsComplete(['PORTUGUESE', 'MATH', 'ESSAY'].every(kind => rows.some(row => row.kind === kind && row.status === 'COMPLETED'))); }).catch(() => { if (active) { setAssessmentsComplete(false); setAssessmentError('Não foi possível verificar as avaliações. Tente novamente.'); } }).finally(() => { if (active) setAccountLoading(false); });
    return () => { active = false; };
  }, [accountReload]);
  useEffect(() => { setReuse('ask'); setReuseConsent(false); }, [companyId, jobId]);
  useEffect(() => { setForm(EMPTY); setAnswers({}); setResume(null); setSuccess(''); setFileError(''); setError(''); setFieldErrors({}); }, [companyId, jobId]);
  useEffect(() => { if (success) successRef.current?.focus(); }, [success]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const chooseFile = useCallback((file: File | null) => {
    const issue = file ? validateResume(file) : null;
    setFileError(issue ?? '');
    setResume(issue ? null : file);
    if (issue && fileInput.current) fileInput.current.value = '';
  }, []);

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault(); setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !job) return;
    setError(''); setFieldErrors({});

    const errors: Record<string, string> = {};
    if (form.name.trim().length < 3) errors.name = 'Informe seu nome completo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Informe um e-mail válido.';
    else if (account && form.email.trim().toLowerCase() !== account.email.toLowerCase()) errors.email = 'Use o mesmo e-mail da sua conta para acompanhar esta candidatura.';
    if (!isValidInternationalPhoneInput(form.phone)) errors.phone = 'Informe o telefone com código do país, DDD/área e número (8 a 15 dígitos).';
    for (const question of job.questions) {
      const value = answers[question.id];
      const empty = Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim();
      if (question.required && empty) errors[`question:${question.id}`] = 'Esta pergunta é obrigatória.';
    }
    const validation = validateResume(resume);
    if (validation) setFileError(validation);
    if (Object.keys(errors).length || validation) {
      setFieldErrors(errors);
      const first = Object.keys(errors)[0];
      if (first?.startsWith('question:')) document.getElementById(`q-${first.split(':')[1]}`)?.focus();
      else if (first) document.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      else fileInput.current?.focus();
      return;
    }
    if (!resume || !form.consent) return;

    pending.current = true; setSubmitting(true);
    try {
      const result = await applyToPublicJob(job.id, { ...form, resume, answers, source: readTrafficSource(window.location.search) }, getCandidateToken());
      setSuccess(result.message); setForm(EMPTY); setAnswers({}); setResume(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (cause) {
      if (cause instanceof CareersApiError) {
        setFieldErrors(cause.fields);
        setError(cause.status === 409 ? 'Você já se candidatou a esta vaga. Sua candidatura está em análise.' : cause.message);
      } else setError('Não foi possível enviar. Verifique sua conexão e tente novamente.');
    } finally { pending.current = false; setSubmitting(false); }
  }

  async function submitReuse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !job) return;
    setError(''); setFieldErrors({});
    const errors: Record<string, string> = {};
    for (const question of job.questions) {
      const value = answers[question.id];
      const empty = Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim();
      if (question.required && empty) errors[`question:${question.id}`] = 'Esta pergunta é obrigatória.';
    }
    if (Object.keys(errors).length) { setFieldErrors(errors); document.getElementById(`q-${Object.keys(errors)[0].split(':')[1]}`)?.focus(); return; }
    if (!reuseConsent) return;
    pending.current = true; setSubmitting(true);
    try {
      await candidateApi.applyWithProfile(job.id, {
        answers,
        coverLetter: form.coverLetter.trim() || undefined,
        consent: true,
        source: readTrafficSource(window.location.search),
      });
      setSuccess('Candidatura enviada com os dados do seu perfil.'); setAnswers({});
    } catch (cause) {
      const status = (cause as { status?: number }).status;
      if (cause instanceof CareersApiError) setFieldErrors(cause.fields);
      setError(status === 409 ? 'Você já se candidatou a esta vaga. Acompanhe em Minhas candidaturas.' : cause instanceof Error ? cause.message : 'Não foi possível enviar. Tente novamente.');
    } finally { pending.current = false; setSubmitting(false); }
  }

  const company = job?.company ?? { id: companyId, name: 'Portal de carreiras' };
  const companyPath = '/carreiras/' + encodeURIComponent(companyId);
  if (loading) return <main className="min-h-screen bg-bg p-6"><p role="status">{t('Carregando oportunidade...')}</p></main>;
  if (loadError || !job) return (
    <main className="min-h-screen bg-bg px-4 py-10"><div className="card-v2 mx-auto max-w-xl space-y-4 p-6">
      <PageHeader title={t('Vaga indisponível')} subtitle={loadError || t('Esta vaga não está recebendo candidaturas.')} />
      <Link className="btn btn-outline" href={companyPath}>{t('Ver outras vagas')}</Link><Button type="button" onClick={() => setReload((value) => value + 1)}>{t('Tentar novamente')}</Button>
    </div></main>
  );

  const reuseReady = Boolean(account?.completeness.complete);
  const salary = publicSalaryLabel(job);
  const fieldError = (name: string) => fieldErrors[name];
  const input = 'input-v2 min-h-11 text-base sm:text-sm';

  return (
    <div className="min-h-screen bg-[#fbfafc] text-[#241b38]">
      <a className="sr-only focus:not-sr-only focus:block focus:p-4" href="#application">{t('Ir para a candidatura')}</a>
      <header className="border-b border-[#e9e5f0]"><div className="mx-auto flex min-h-[64px] max-w-[1200px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-9">
        <CareersBrand company={company} companyId={companyId} compact />
        <nav className="flex items-center gap-2 text-[13px]"><Link className="inline-flex min-h-11 items-center rounded-lg border border-[#e9e5f0] px-3 text-[#7240da] hover:border-[#c7b0ed]" href={companyPath}>← {t('Vagas')}</Link><Link className="inline-flex min-h-11 items-center rounded-lg bg-[#7240da] px-4 font-semibold text-white hover:bg-[#5b29be]" href={account ? '/carreira' : `/carreiras/conta/entrar?next=${encodeURIComponent(`/carreiras/${companyId}/${jobId}`)}`}>{account ? t('Minha conta') : t('Login')}</Link><LanguageSwitcher /></nav>
      </div></header>

      <main className="mx-auto max-w-[1200px] space-y-5 px-4 pb-28 pt-5 sm:px-9 sm:py-6 sm:pb-6">
        <section className="relative overflow-hidden rounded-[18px] border border-[#e4d9f4] bg-[#f0eafa] px-5 py-6 sm:px-9 sm:py-7">
          <span aria-hidden="true" className="pointer-events-none absolute -top-6 right-2 text-[120px] leading-none text-[#e4d7f6] sm:-top-10 sm:right-4 sm:text-[220px]">↗</span>
          <div className="relative">
            <p className="text-xs text-[#736d80]">{company.name} · {t('Carreiras')}</p>
            <h1 className="my-4 max-w-[850px] break-words text-[26px] font-semibold leading-tight tracking-tight sm:text-4xl">{displayJob?.title}</h1>
            {((displayJob && hasUntranslatedJobContent(job, language)) || job.questions.some((question) => hasUntranslatedQuestionContent(question, language))) && (
              <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('A empresa ainda não cadastrou todas as versões desta vaga. Partes do conteúdo aparecem em português.')}</p>
            )}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#6b5b80]"><span>{job.location || t('Local não informado')}</span><span>{t(employmentTypeLabel(job.employmentType))}</span>{workModeLabel(job.workMode) && <span>{t(workModeLabel(job.workMode)!)}</span>}{job.seniority && <span>{t(job.seniority)}</span>}{salary && <span><b>{salary}</b></span>}</p>
            <div className="mt-6"><a className="inline-flex min-h-12 w-full items-center justify-center rounded-[9px] bg-[#7240da] px-6 text-[13px] sm:w-auto font-semibold text-white transition hover:bg-[#5b29be]" href="#application">{t('Candidatar-me ↗')}</a></div>
          </div>
        </section>

        <ShareBar title={displayJob?.title ?? job.title} companyName={company.name} location={job.location} salary={salary} imageUrl={company.logoUrl ?? null} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(displayJob ?? job, typeof window === 'undefined' ? '' : window.location.origin + window.location.pathname)).replace(/</g, '\\u003c') }} />
        <div className="flex flex-wrap gap-2">
          {job.pcd && <span className="inline-flex items-center rounded-full bg-[#e8f1fb] px-3 py-1 text-xs font-semibold text-[#1f5a96]" title={t('Vaga afirmativa para pessoas com deficiência')}>{t('Vaga PCD')}</span>}
          {job.department && <Chip>{job.department}</Chip>}
          {workModeLabel(job.workMode) && <Chip>{t(workModeLabel(job.workMode)!)}</Chip>}
          {job.seniority && <Chip>{job.seniority}</Chip>}
          {salary && <Chip>{salary}</Chip>}
          {job.openings > 1 && <Chip>{job.openings} {t('vagas')}</Chip>}
          {job.deadline && <Chip>{t('Inscrições até')} {new Date(job.deadline).toLocaleDateString()}</Chip>}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
          <article className="min-w-0 space-y-6 rounded-[14px] border border-[#e9e5f0] bg-white p-5 sm:p-7">
            <section><h2 className="text-lg font-semibold">{t('Sobre a vaga')}</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{displayJob?.description || t('Descrição não informada.')}</p></section>
            {!!displayJob?.requirements.length && <section><h2 className="font-semibold">{t('Requisitos')}</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{displayJob.requirements.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
            {!!displayJob?.benefits.length && <section><h2 className="font-semibold">{t('Benefícios')}</h2><ul className="mt-3 flex flex-wrap gap-2">{displayJob.benefits.map((benefit, index) => <li key={index}><Chip>{benefit}</Chip></li>)}</ul></section>}
            <section className="border-t border-border pt-4"><h2 className="font-semibold">{t('Como funciona')}</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-fg-mut"><li>{t('Envie seus dados e currículo.')}</li><li>{t('O RH analisa as candidaturas.')}</li><li>{t('Se houver aderência, você será contatado para as próximas etapas.')}</li></ol>
            </section>
          </article>

          <section id="application" className="min-w-0 scroll-mt-4 rounded-[15px] border border-[#e3d8f1] bg-white p-5 shadow-[0_14px_36px_#51227708] sm:p-7 lg:sticky lg:top-4" aria-label={t('Candidatura')}>
            <h2 className="text-lg font-semibold">{t('Enviar candidatura')}</h2><p className="mt-2 text-sm text-fg-mut">{t('Campos com * são obrigatórios.')}</p>
            {job.closed ? (
              <div role="status" className="mt-5 space-y-3"><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t('Esta vaga foi encerrada')}{job.closedAt ? ` ${t('em')} ${new Date(job.closedAt).toLocaleDateString()}` : ''} {t('e não recebe mais candidaturas.')}</p><Link className="btn btn-outline" href={companyPath}>{t('Ver outras vagas desta empresa')}</Link></div>
            ) : success ? (
              <div ref={successRef} tabIndex={-1} role="status" className="mt-5 space-y-4">
                <h3 className="text-lg font-semibold text-emerald-800">{t('Candidatura recebida!')}</h3>
                <p className="text-sm">{t(success)}</p>
                <p className="text-sm text-fg-mut">{t('O RH analisará seu perfil e entrará em contato se houver aderência.')}</p>
                <Link className="btn btn-outline" href={companyPath}>{t('Ver outras vagas desta empresa')}</Link>{' '}<Link className="btn btn-ghost" href="/carreiras">{t('Ver outras empresas')}</Link>{' '}<Link className="btn btn-ghost" href="/carreira">{t('Minhas candidaturas')}</Link>
              </div>
            ) : accountLoading ? (
              <p role="status" className="mt-5 rounded-xl bg-[#f7f4fb] p-4 text-sm">{t('Verificando sua conta…')}</p>
            ) : !account ? (
              <div className="mt-5 space-y-4 rounded-xl bg-[#f7f4fb] p-4">
                <p className="text-sm leading-6">{t('Para se candidatar e acompanhar o processo, crie sua conta gratuita ou entre na sua conta. Seu perfil poderá ser usado em outras vagas quando você autorizar.')}</p>
                <div className="flex flex-wrap gap-3">
                  <Link className="inline-flex min-h-11 items-center rounded-lg bg-[#7240da] px-4 text-sm font-semibold text-white hover:bg-[#5b29be]" href={`/carreiras/conta/entrar?modo=cadastro&next=${encodeURIComponent(`/carreiras/${companyId}/${jobId}`)}`}>{t('Criar conta gratuita')}</Link>
                  <Link className="inline-flex min-h-11 items-center rounded-lg border border-[#d5cceb] px-4 text-sm font-semibold text-[#5b29be] hover:bg-white" href={`/carreiras/conta/entrar?next=${encodeURIComponent(`/carreiras/${companyId}/${jobId}`)}`}>{t('Já tenho conta')}</Link>
                </div>
              </div>
            ) : !account.completeness.complete ? (
              <div className="mt-5 space-y-4 rounded-xl bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">{t('Complete seu perfil antes de se candidatar.')}</p>
                <p className="text-sm text-amber-900">{t('Precisamos dos dados mínimos para candidatura: nome, CPF, endereço, formação e currículo.')}</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                  {account.checklist.filter((item) => !item.done).map((item) => <li key={item.key}>{t(item.label)}</li>)}
                </ul>
                <Link className="inline-flex min-h-11 items-center rounded-lg bg-[#7240da] px-4 text-sm font-semibold text-white hover:bg-[#5b29be]" href="/carreira/perfil">{t('Completar meu perfil')}</Link>
              </div>
            ) : !account.emailVerified ? (
              <div className="mt-5 space-y-3 rounded-xl bg-amber-50 p-4">
                <p className="text-sm text-amber-900">{t('Confirme seu e-mail para enviar a candidatura. Você pode solicitar um código na sua área do candidato.')}</p>
                <Link className="inline-flex min-h-11 items-center rounded-lg bg-[#7240da] px-4 text-sm font-semibold text-white hover:bg-[#5b29be]" href="/carreira">{t('Confirmar meu e-mail')}</Link>
              </div>
            ) : !assessmentsComplete ? (
              <div className="mt-5 space-y-3 rounded-xl bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Conclua português, matemática e redação antes de enviar a candidatura.</p>
                {assessmentError && <p role="alert" className="text-sm">{assessmentError}</p>}
                <Link href="/carreira/avaliacoes" className="inline-flex min-h-11 items-center rounded-lg bg-[#7240da] px-4 text-sm font-semibold text-white">Concluir avaliações obrigatórias</Link>
                <Button variant="outline" onClick={() => setAccountReload(value => value + 1)}>Verificar novamente</Button>
              </div>
            ) : reuseReady && reuse === 'ask' ? (
              <div className="mt-5 space-y-4" role="group" aria-labelledby="reuse-title">
                <h3 id="reuse-title" className="text-base font-semibold">{t('Deseja reutilizar seus dados e currículo?')}</h3>
                <p className="text-sm text-fg-mut">{t('Usaremos nome, e-mail, telefone e o currículo salvos no seu perfil')}{job.questions.length ? t('. Você só responde às perguntas da vaga') : t(' e enviamos direto, sem formulário')}.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="!bg-[#7240da] hover:!bg-[#5b29be]" onClick={() => setReuse('yes')}>{t('Sim, reutilizar')}</Button>
                  <Button type="button" variant="outline" onClick={() => setReuse('no')}>{t('Não, preencher manualmente')}</Button>
                </div>
              </div>
            ) : reuseReady && reuse === 'yes' ? (
              <form onSubmit={submitReuse} className="mt-5 space-y-5" noValidate>
                {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{t(error)}</p>}
                <p className="rounded-lg bg-bg-sub p-3 text-sm">{t('Enviando como')} <b>{account?.name}</b> ({account?.email}) {t('com o currículo')} <b>{account?.resume?.name}</b>. <button type="button" className="underline" onClick={() => setReuse('no')}>{t('Preencher manualmente')}</button></p>
                {job.questions.length > 0 && (
                  <fieldset disabled={submitting} className="min-w-0 space-y-4">
                    <legend className="mb-1 text-sm font-semibold">{t('Sobre você e a vaga')}</legend>
                    {job.questions.map((question) => (
                      <QuestionField key={question.id} question={question} value={answers[question.id]} error={fieldError(`question:${question.id}`)} onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))} />
                    ))}
                  </fieldset>
                )}
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-bg-sub p-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={reuseConsent} onChange={(event) => setReuseConsent(event.target.checked)} />
                  <span className="text-sm leading-6">{t('Autorizo o tratamento dos dados do meu perfil para avaliação desta candidatura.')}</span></label>
                <Button type="submit" className="w-full !bg-[#7240da] hover:!bg-[#5b29be]" isLoading={submitting} disabled={!reuseConsent}>{t('Enviar candidatura')}</Button>
              </form>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-5" noValidate>
                <div className="sr-only" aria-hidden="true"><label htmlFor="candidate-website">Não preencha este campo</label><input id="candidate-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} /></div>
                {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{t(error)}</p>}

                <fieldset disabled={submitting} className="min-w-0 space-y-4">
                  <legend className="mb-1 text-sm font-semibold">{t('Seus dados')}</legend>
                  <label className="block space-y-1"><span className="text-sm font-medium">Nome completo *</span><input name="name" required minLength={3} maxLength={120} autoComplete="name" className={input} aria-invalid={Boolean(fieldError('name'))} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />{fieldError('name') && <span role="alert" className="text-sm text-rose-700">{fieldError('name')}</span>}</label>
                  <label className="block space-y-1"><span className="text-sm font-medium">{t('E-mail *')}</span><input name="email" type="email" required maxLength={160} autoComplete="email" className={input} aria-invalid={Boolean(fieldError('email'))} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />{fieldError('email') && <span role="alert" className="text-sm text-rose-700">{fieldError('email')}</span>}</label>
                  <label className="block space-y-1"><span className="text-sm font-medium">{t('Telefone *')}</span><input name="phone" type="tel" required maxLength={40} autoComplete="tel" inputMode="tel" placeholder="+55 (11) 91234-5678" className={input} aria-invalid={Boolean(fieldError('phone'))} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: maskPhone(event.target.value) }))} />{fieldError('phone') && <span role="alert" className="text-sm text-rose-700">{fieldError('phone')}</span>}</label>
                  <label className="block space-y-1"><span className="text-sm font-medium">{t('LinkedIn (opcional)')}</span><input name="linkedinUrl" type="url" maxLength={300} className={input} placeholder="https://linkedin.com/in/seu-perfil" value={form.linkedinUrl} onChange={(event) => setForm((current) => ({ ...current, linkedinUrl: event.target.value }))} /></label>
                </fieldset>

                {job.questions.length > 0 && (
                  <fieldset disabled={submitting} className="min-w-0 space-y-4 border-t border-border pt-4">
                    <legend className="mb-1 text-sm font-semibold">{t('Sobre você e a vaga')}</legend>
                    {job.questions.map((question) => (
                      <QuestionField key={question.id} question={question} value={answers[question.id]} error={fieldError(`question:${question.id}`)} onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))} />
                    ))}
                  </fieldset>
                )}

                <fieldset disabled={submitting} className="min-w-0 space-y-3 border-t border-border pt-4">
                  <legend className="mb-1 text-sm font-semibold">{t('Currículo e apresentação')}</legend>
                  <label className="block space-y-1"><span className="text-sm font-medium">{t('Apresentação (opcional)')}</span><textarea name="coverLetter" maxLength={1500} rows={4} className="input-v2 resize-y text-base sm:text-sm" value={form.coverLetter} onChange={(event) => setForm((current) => ({ ...current, coverLetter: event.target.value }))} /><span className="block text-right text-xs text-fg-mut">{form.coverLetter.length} / 1.500</span></label>

                  <label onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                    className={`block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${dragging ? 'border-purple-500 bg-purple-50' : fileError ? 'border-rose-400 bg-rose-50' : 'border-border hover:bg-bg-sub'}`}>
                    <span className="block text-sm font-medium">{resume ? t('Trocar currículo') : t('Currículo *')}</span>
                    <span className="mt-1 block text-xs text-fg-mut">{t('Arraste o arquivo aqui ou clique para escolher · PDF ou DOCX até 5 MB')}</span>
                    <input aria-label={t('Anexar currículo em PDF ou DOCX')} ref={fileInput} name="resume" type="file" className="sr-only" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-invalid={Boolean(fileError)} aria-describedby="resume-error" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
                  </label>
                  {resume && (
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                      <span className="min-w-0 break-all">✓ {resume.name} · {(resume.size / 1024 / 1024).toFixed(2)} MB</span>
                      <Button type="button" size="sm" variant="outline" onClick={() => { setResume(null); setFileError(''); if (fileInput.current) fileInput.current.value = ''; }}>{t('Remover')}</Button>
                    </div>
                  )}
                  <p id="resume-error" role={fileError ? 'alert' : undefined} className="text-sm text-rose-800">{t(fileError)}</p>
                </fieldset>

                <fieldset disabled={submitting} className="min-w-0 space-y-3 border-t border-border pt-4">
                  <legend className="mb-1 text-sm font-semibold">{t('Diversidade (opcional)')}</legend>
                  <p className="text-xs text-fg-mut">{t('Estas informações são voluntárias, ficam separadas da sua candidatura e não entram na avaliação. Servem só para relatórios anônimos de diversidade.')}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block space-y-1"><span className="text-sm font-medium">{t('Gênero')}</span><select className={input} value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}><option value="">{t('Prefiro não informar')}</option><option value="MULHER">{t('Mulher')}</option><option value="HOMEM">{t('Homem')}</option><option value="NAO_BINARIO">{t('Não binário')}</option></select></label>
                    <label className="block space-y-1"><span className="text-sm font-medium">{t('Cor ou raça')}</span><select className={input} value={form.race} onChange={(event) => setForm((current) => ({ ...current, race: event.target.value }))}><option value="">{t('Prefiro não informar')}</option><option value="AMARELA">{t('Amarela')}</option><option value="BRANCA">{t('Branca')}</option><option value="INDIGENA">{t('Indígena')}</option><option value="PARDA">{t('Parda')}</option><option value="PRETA">{t('Preta')}</option></select></label>
                    <label className="block space-y-1"><span className="text-sm font-medium">{t('Pessoa com deficiência')}</span><select className={input} value={form.pcd} onChange={(event) => setForm((current) => ({ ...current, pcd: event.target.value }))}><option value="">{t('Prefiro não informar')}</option><option value="sim">{t('Sim')}</option><option value="nao">{t('Não')}</option></select></label>
                  </div>
                  {(form.gender || form.race || form.pcd) && (
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-bg-sub p-3"><input type="checkbox" required className="mt-1 h-5 w-5 shrink-0" checked={form.sensitiveConsent} onChange={(event) => setForm((current) => ({ ...current, sensitiveConsent: event.target.checked }))} /><span className="text-sm leading-6">{CONSENT_TEXTS.SENSITIVE_DATA}</span></label>
                  )}
                </fieldset>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-bg-sub p-3"><input type="checkbox" required className="mt-1 h-5 w-5 shrink-0" checked={form.consent} onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))} />
                  <span className="text-sm leading-6">{t(CONSENT_TEXTS.APPLICATION)} <Link className="underline" href="/privacidade" target="_blank" rel="noopener noreferrer">{t('Política de Privacidade')}</Link> · <Link className="underline" href="/carreiras/privacidade" target="_blank" rel="noopener noreferrer">{t('Meus dados')}</Link>.</span></label>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-bg-sub p-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={form.talentPoolOptIn} onChange={(event) => setForm((current) => ({ ...current, talentPoolOptIn: event.target.checked }))} /><span className="text-sm leading-6"><strong>{t('Opcional.')}</strong> {t(CONSENT_TEXTS.TALENT_POOL)} {t('Vamos pedir uma confirmação por e-mail.')}</span></label>
                <TurnstileWidget />
                <Button type="submit" className="w-full !bg-[#7240da] hover:!bg-[#5b29be]" isLoading={submitting} disabled={!form.consent || ((Boolean(form.gender || form.race || form.pcd)) && !form.sensitiveConsent)}>Enviar candidatura</Button>
              </form>
            )}
          </section>
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}

/** Compartilhar a vaga: cada canal recebe um link com ?src=, e a candidatura fica marcada com a origem. */
function ShareBar({
  title,
  companyName,
  location,
  salary,
  imageUrl,
}: {
  title: string;
  companyName: string;
  location?: string | null;
  salary?: string | null;
  imageUrl?: string | null;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const base = () => (typeof window === 'undefined' ? '' : window.location.origin + window.location.pathname);

  const shareMessage = (url: string) => {
    const details = [location, salary].filter(Boolean).join(' · ');
    const imagePart = imageUrl ? ` ${imageUrl}` : '';
    return details
      ? t('Vaga: {title} na {company} ({details}). Candidate-se: {url}{image}', { title, company: companyName, details, url, image: imagePart })
      : t('Vaga: {title} na {company}. Candidate-se: {url}{image}', { title, company: companyName, url, image: imagePart });
  };

  const open = (channel: string, build: (url: string, msg: string) => string) => {
    const url = trackedJobUrl(base(), channel);
    const msg = shareMessage(url);
    window.open(build(url, msg), '_blank', 'noopener,noreferrer');
  };

  async function copyOrShare() {
    const url = trackedJobUrl(base(), 'site');
    const text = shareMessage(url);
    const shareTitle = `${title} · ${companyName}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const shareData: { title: string; text: string; url: string } = {
          title: shareTitle,
          text,
          url,
        };
        await navigator.share(shareData);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sem permissão de área de transferência */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm" aria-label={t('Compartilhar vaga')} role="group">
      <span className="text-fg-mut">{t('Compartilhar')}:</span>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => open('whatsapp', (_url, msg) => `https://wa.me/?text=${encodeURIComponent(msg)}`)}
      >
        WhatsApp
      </button>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() =>
          open(
            'telegram',
            (url, msg) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`,
          )
        }
      >
        Telegram
      </button>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => open('linkedin', (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)}
      >
        LinkedIn
      </button>
      <button type="button" className="btn btn-outline" onClick={() => void copyOrShare()}>
        {copied ? t('Link copiado') : t('Copiar link')}
      </button>
    </div>
  );
}
