'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { CareersBrand, CareersFooter } from '../../_components/careers-brand';
import { candidateApi, getCandidateToken, type CandidateProfile } from '../../_lib/candidate-api';
import {
  applyToPublicJob, CareersApiError, employmentTypeLabel, getPublicJob, jobPostingJsonLd, publicSalaryLabel, readTrafficSource, trackedJobUrl, validateResume, workModeLabel,
  type PublicJob, type PublicQuestion,
} from '../../_lib/public-jobs';

const EMPTY = { name: '', email: '', phone: '', linkedinUrl: '', coverLetter: '', website: '', consent: false, gender: '', race: '', pcd: '' };
type Answers = Record<string, string | string[]>;

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-bg-sub px-3 py-1 text-xs font-medium text-fg">{children}</span>;
}

function QuestionField({ question, value, error, onChange }: { question: PublicQuestion; value: string | string[] | undefined; error?: string; onChange: (next: string | string[]) => void }) {
  const id = `q-${question.id}`;
  const label = <span className="text-sm font-medium">{question.label}{question.required && ' *'}</span>;
  const common = { id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined };
  const text = typeof value === 'string' ? value : '';
  const chosen = Array.isArray(value) ? value : [];
  let control: React.ReactNode;

  if (question.type === 'LONG') control = <textarea {...common} rows={4} maxLength={3000} className="input-v2 resize-y text-base sm:text-sm" value={text} onChange={(event) => onChange(event.target.value)} />;
  else if (question.type === 'NUMBER') control = <input {...common} type="number" inputMode="decimal" className="input-v2 min-h-11 text-base sm:text-sm" value={text} onChange={(event) => onChange(event.target.value)} />;
  else if (question.type === 'SELECT') control = (
    <select {...common} className="input-v2 min-h-11 text-base sm:text-sm" value={text} onChange={(event) => onChange(event.target.value)}>
      <option value="">Selecione…</option>{question.options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );
  else if (question.type === 'YESNO' || question.type === 'MULTI') {
    const options = question.type === 'YESNO' ? ['Sim', 'Não'] : question.options;
    control = (
      <div role={question.type === 'YESNO' ? 'radiogroup' : 'group'} aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = question.type === 'YESNO' ? text === option : chosen.includes(option);
          return (
            <button key={option} type="button" role={question.type === 'YESNO' ? 'radio' : 'checkbox'} aria-checked={active}
              onClick={() => onChange(question.type === 'YESNO' ? option : active ? chosen.filter((item) => item !== option) : [...chosen, option])}
              className={`min-h-11 rounded-lg border px-4 text-sm font-medium transition ${active ? 'border-purple-600 bg-purple-600 text-white' : 'border-border hover:bg-bg-sub'}`}>{option}</button>
          );
        })}
      </div>
    );
  } else control = <input {...common} type="text" maxLength={500} className="input-v2 min-h-11 text-base sm:text-sm" value={text} onChange={(event) => onChange(event.target.value)} />;

  return (
    <div className="space-y-1.5">
      <label id={`${id}-label`} htmlFor={id} className="block">{label}</label>
      {control}
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}

export function JobDetails({ companyId, jobId }: { companyId: string; jobId: string }) {
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
  const [reuse, setReuse] = useState<'ask' | 'yes' | 'no'>('ask');
  const [reuseConsent, setReuseConsent] = useState(false);
  const pending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let active = true; setLoading(true); setLoadError(''); setJob(null);
    getPublicJob(companyId, jobId).then((result) => { if (active) setJob(result); })
      .catch((cause) => { if (active) setLoadError(cause instanceof Error ? cause.message : 'Não foi possível carregar esta vaga.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId, jobId, reload]);
  useEffect(() => {
    if (!getCandidateToken()) return;
    let active = true;
    candidateApi.me().then((result) => { if (active) setAccount(result); }).catch(() => { /* sem sessão válida: segue como visitante */ });
    return () => { active = false; };
  }, []);
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
    if (form.phone.replace(/\D/g, '').length < 10) errors.phone = 'Informe um telefone com DDD.';
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
      const result = await applyToPublicJob(job.id, { ...form, resume, answers, source: readTrafficSource(window.location.search) });
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
      await candidateApi.applyWithProfile(job.id, { answers, coverLetter: form.coverLetter.trim() || undefined, consent: true });
      setSuccess('Candidatura enviada com os dados do seu perfil.'); setAnswers({});
    } catch (cause) {
      const status = (cause as { status?: number }).status;
      if (cause instanceof CareersApiError) setFieldErrors(cause.fields);
      setError(status === 409 ? 'Você já se candidatou a esta vaga. Acompanhe em Minhas candidaturas.' : cause instanceof Error ? cause.message : 'Não foi possível enviar. Tente novamente.');
    } finally { pending.current = false; setSubmitting(false); }
  }

  const company = job?.company ?? { id: companyId, name: 'Portal de carreiras' };
  const companyPath = '/carreiras/' + encodeURIComponent(companyId);
  if (loading) return <main className="min-h-screen bg-bg p-6"><p role="status">Carregando oportunidade...</p></main>;
  if (loadError || !job) return (
    <main className="min-h-screen bg-bg px-4 py-10"><div className="card-v2 mx-auto max-w-xl space-y-4 p-6">
      <PageHeader title="Vaga indisponível" subtitle={loadError || 'Esta vaga não está recebendo candidaturas.'} />
      <Link className="btn btn-outline" href={companyPath}>Ver outras vagas</Link><Button type="button" onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>
    </div></main>
  );

  const reuseReady = Boolean(account?.name && account.phone && account.resume?.name);
  const salary = publicSalaryLabel(job);
  const fieldError = (name: string) => fieldErrors[name];
  const input = 'input-v2 min-h-11 text-base sm:text-sm';

  return (
    <div className="min-h-screen bg-[#fbfafc] text-[#241b38]">
      <a className="sr-only focus:not-sr-only focus:block focus:p-4" href="#application">Ir para a candidatura</a>
      <header className="border-b border-[#e9e5f0]"><div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between gap-3 px-5 sm:px-9">
        <CareersBrand company={company} companyId={companyId} compact />
        <nav className="flex items-center gap-3 text-[13px]"><Link className="rounded-lg border border-[#e9e5f0] px-4 py-3 text-[#7240da] hover:border-[#c7b0ed]" href={companyPath}>← Todas as oportunidades</Link></nav>
      </div></header>

      <main className="mx-auto max-w-[1200px] space-y-5 px-5 py-6 sm:px-9">
        <section className="relative overflow-hidden rounded-[18px] border border-[#e4d9f4] bg-[#f0eafa] px-6 py-7 sm:px-9">
          <span aria-hidden="true" className="pointer-events-none absolute -top-10 right-4 text-[220px] leading-none text-[#e4d7f6]">↗</span>
          <div className="relative">
            <p className="text-xs text-[#736d80]">{company.name} · Carreiras</p>
            <h1 className="my-5 max-w-[850px] break-words text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{job.title}</h1>
            <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#6b5b80]"><span>{job.location || 'Local não informado'}</span><span>{employmentTypeLabel(job.employmentType)}</span>{workModeLabel(job.workMode) && <span>{workModeLabel(job.workMode)}</span>}{job.seniority && <span>{job.seniority}</span>}{salary && <span><b>{salary}</b></span>}</p>
            <div className="mt-6"><a className="inline-flex min-h-12 items-center rounded-[9px] bg-[#7240da] px-6 text-[13px] font-semibold text-white transition hover:bg-[#5b29be]" href="#application">Candidatar-me ↗</a></div>
          </div>
        </section>

        <ShareBar title={job.title} companyName={company.name} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(job, typeof window === 'undefined' ? '' : window.location.origin + window.location.pathname)).replace(/</g, '\\u003c') }} />
        <div className="flex flex-wrap gap-2">
          {job.department && <Chip>{job.department}</Chip>}
          {workModeLabel(job.workMode) && <Chip>{workModeLabel(job.workMode)}</Chip>}
          {job.seniority && <Chip>{job.seniority}</Chip>}
          {salary && <Chip>{salary}</Chip>}
          {job.openings > 1 && <Chip>{job.openings} vagas</Chip>}
          {job.deadline && <Chip>Inscrições até {new Date(job.deadline).toLocaleDateString('pt-BR')}</Chip>}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
          <article className="min-w-0 space-y-6 rounded-[14px] border border-[#e9e5f0] bg-white p-5 sm:p-7">
            <section><h2 className="text-lg font-semibold">Sobre a vaga</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{job.description || 'Descrição não informada.'}</p></section>
            {!!job.requirements.length && <section><h2 className="font-semibold">Requisitos</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{job.requirements.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
            {!!job.benefits.length && <section><h2 className="font-semibold">Benefícios</h2><ul className="mt-3 flex flex-wrap gap-2">{job.benefits.map((benefit, index) => <li key={index}><Chip>{benefit}</Chip></li>)}</ul></section>}
            <section className="border-t border-border pt-4"><h2 className="font-semibold">Como funciona</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-fg-mut"><li>Envie seus dados e currículo.</li><li>O RH analisa as candidaturas.</li><li>Se houver aderência, você será contatado para as próximas etapas.</li></ol>
            </section>
          </article>

          <section id="application" className="min-w-0 scroll-mt-4 rounded-[15px] border border-[#e3d8f1] bg-white p-5 shadow-[0_14px_36px_#51227708] sm:p-7 lg:sticky lg:top-4" aria-label="Candidatura">
            <h2 className="text-lg font-semibold">Enviar candidatura</h2><p className="mt-2 text-sm text-fg-mut">Campos com * são obrigatórios.</p>
            {!account && !job.closed && !success && <p className="mt-2 text-sm">Já tem conta? <Link className="font-semibold text-[#7240da] underline" href={`/carreiras/conta/entrar?next=${encodeURIComponent(`/carreiras/${companyId}/${jobId}`)}`}>Entre para reutilizar seus dados</Link>.</p>}
            {job.closed ? (
              <div role="status" className="mt-5 space-y-3"><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Esta vaga foi encerrada{job.closedAt ? ` em ${new Date(job.closedAt).toLocaleDateString('pt-BR')}` : ''} e não recebe mais candidaturas.</p><Link className="btn btn-outline" href={companyPath}>Ver outras vagas desta empresa</Link></div>
            ) : success ? (
              <div ref={successRef} tabIndex={-1} role="status" className="mt-5 space-y-4">
                <h3 className="text-lg font-semibold text-emerald-800">Candidatura recebida!</h3>
                <p className="text-sm">{success}</p>
                <p className="text-sm text-fg-mut">O RH analisará seu perfil e entrará em contato se houver aderência.</p>
                <Link className="btn btn-outline" href={companyPath}>Ver outras vagas desta empresa</Link>{' '}<Link className="btn btn-ghost" href="/carreiras">Ver outras empresas</Link>{' '}<Link className="btn btn-ghost" href="/carreiras/conta">Minhas candidaturas</Link>
              </div>
            ) : reuseReady && reuse === 'ask' ? (
              <div className="mt-5 space-y-4" role="group" aria-labelledby="reuse-title">
                <h3 id="reuse-title" className="text-base font-semibold">Deseja reutilizar seus dados e currículo?</h3>
                <p className="text-sm text-fg-mut">Usaremos nome, e-mail, telefone e o currículo salvos no seu perfil{job.questions.length ? '. Você só responde às perguntas da vaga' : ' e enviamos direto, sem formulário'}.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="!bg-[#7240da] hover:!bg-[#5b29be]" onClick={() => setReuse('yes')}>Sim, reutilizar</Button>
                  <Button type="button" variant="outline" onClick={() => setReuse('no')}>Não, preencher manualmente</Button>
                </div>
              </div>
            ) : reuseReady && reuse === 'yes' ? (
              <form onSubmit={submitReuse} className="mt-5 space-y-5" noValidate>
                {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
                <p className="rounded-lg bg-bg-sub p-3 text-sm">Enviando como <b>{account?.name}</b> ({account?.email}) com o currículo <b>{account?.resume?.name}</b>. <button type="button" className="underline" onClick={() => setReuse('no')}>Preencher manualmente</button></p>
                {job.questions.length > 0 && (
                  <fieldset disabled={submitting} className="min-w-0 space-y-4">
                    <legend className="mb-1 text-sm font-semibold">Sobre você e a vaga</legend>
                    {job.questions.map((question) => (
                      <QuestionField key={question.id} question={question} value={answers[question.id]} error={fieldError(`question:${question.id}`)} onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))} />
                    ))}
                  </fieldset>
                )}
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-bg-sub p-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={reuseConsent} onChange={(event) => setReuseConsent(event.target.checked)} />
                  <span className="text-sm leading-6">Autorizo o tratamento dos dados do meu perfil para avaliação desta candidatura.</span></label>
                <Button type="submit" className="w-full !bg-[#7240da] hover:!bg-[#5b29be]" isLoading={submitting} disabled={!reuseConsent}>Enviar candidatura</Button>
              </form>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-5" noValidate>
                <div className="sr-only" aria-hidden="true"><label htmlFor="candidate-website">Não preencha este campo</label><input id="candidate-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} /></div>
                {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

                <fieldset disabled={submitting} className="min-w-0 space-y-4">
                  <legend className="mb-1 text-sm font-semibold">Seus dados</legend>
                  <label className="block space-y-1"><span className="text-sm font-medium">Nome completo *</span><input name="name" required minLength={3} maxLength={120} autoComplete="name" className={input} aria-invalid={Boolean(fieldError('name'))} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />{fieldError('name') && <span role="alert" className="text-sm text-rose-700">{fieldError('name')}</span>}</label>
                  <label className="block space-y-1"><span className="text-sm font-medium">E-mail *</span><input name="email" type="email" required maxLength={160} autoComplete="email" className={input} aria-invalid={Boolean(fieldError('email'))} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />{fieldError('email') && <span role="alert" className="text-sm text-rose-700">{fieldError('email')}</span>}</label>
                  <label className="block space-y-1"><span className="text-sm font-medium">Telefone / WhatsApp *</span><input name="phone" type="tel" required maxLength={16} autoComplete="tel" inputMode="tel" placeholder="(11) 91234-5678" className={input} aria-invalid={Boolean(fieldError('phone'))} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: maskPhone(event.target.value) }))} />{fieldError('phone') && <span role="alert" className="text-sm text-rose-700">{fieldError('phone')}</span>}</label>
                  <label className="block space-y-1"><span className="text-sm font-medium">LinkedIn (opcional)</span><input name="linkedinUrl" type="url" maxLength={300} className={input} placeholder="https://linkedin.com/in/seu-perfil" value={form.linkedinUrl} onChange={(event) => setForm((current) => ({ ...current, linkedinUrl: event.target.value }))} /></label>
                </fieldset>

                {job.questions.length > 0 && (
                  <fieldset disabled={submitting} className="min-w-0 space-y-4 border-t border-border pt-4">
                    <legend className="mb-1 text-sm font-semibold">Sobre você e a vaga</legend>
                    {job.questions.map((question) => (
                      <QuestionField key={question.id} question={question} value={answers[question.id]} error={fieldError(`question:${question.id}`)} onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))} />
                    ))}
                  </fieldset>
                )}

                <fieldset disabled={submitting} className="min-w-0 space-y-3 border-t border-border pt-4">
                  <legend className="mb-1 text-sm font-semibold">Currículo e apresentação</legend>
                  <label className="block space-y-1"><span className="text-sm font-medium">Apresentação (opcional)</span><textarea name="coverLetter" maxLength={1500} rows={4} className="input-v2 resize-y text-base sm:text-sm" value={form.coverLetter} onChange={(event) => setForm((current) => ({ ...current, coverLetter: event.target.value }))} /><span className="block text-right text-xs text-fg-mut">{form.coverLetter.length} / 1.500</span></label>

                  <label onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                    className={`block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${dragging ? 'border-purple-500 bg-purple-50' : fileError ? 'border-rose-400 bg-rose-50' : 'border-border hover:bg-bg-sub'}`}>
                    <span className="block text-sm font-medium">{resume ? 'Trocar currículo' : 'Currículo *'}</span>
                    <span className="mt-1 block text-xs text-fg-mut">Arraste o arquivo aqui ou clique para escolher · PDF ou DOCX até 5 MB</span>
                    <input ref={fileInput} name="resume" type="file" className="sr-only" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-invalid={Boolean(fileError)} aria-describedby="resume-error" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
                  </label>
                  {resume && (
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                      <span className="min-w-0 break-all">✓ {resume.name} · {(resume.size / 1024 / 1024).toFixed(2)} MB</span>
                      <Button type="button" size="sm" variant="outline" onClick={() => { setResume(null); setFileError(''); if (fileInput.current) fileInput.current.value = ''; }}>Remover</Button>
                    </div>
                  )}
                  <p id="resume-error" role={fileError ? 'alert' : undefined} className="text-sm text-rose-800">{fileError}</p>
                </fieldset>

                <fieldset disabled={submitting} className="min-w-0 space-y-3 border-t border-border pt-4">
                  <legend className="mb-1 text-sm font-semibold">Diversidade (opcional)</legend>
                  <p className="text-xs text-fg-mut">Estas informações são voluntárias, ficam separadas da sua candidatura e não entram na avaliação. Servem só para relatórios anônimos de diversidade.</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block space-y-1"><span className="text-sm font-medium">Gênero</span><select className={input} value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}><option value="">Prefiro não informar</option><option value="MULHER">Mulher</option><option value="HOMEM">Homem</option><option value="NAO_BINARIO">Não binário</option></select></label>
                    <label className="block space-y-1"><span className="text-sm font-medium">Cor ou raça</span><select className={input} value={form.race} onChange={(event) => setForm((current) => ({ ...current, race: event.target.value }))}><option value="">Prefiro não informar</option><option value="AMARELA">Amarela</option><option value="BRANCA">Branca</option><option value="INDIGENA">Indígena</option><option value="PARDA">Parda</option><option value="PRETA">Preta</option></select></label>
                    <label className="block space-y-1"><span className="text-sm font-medium">Pessoa com deficiência</span><select className={input} value={form.pcd} onChange={(event) => setForm((current) => ({ ...current, pcd: event.target.value }))}><option value="">Prefiro não informar</option><option value="sim">Sim</option><option value="nao">Não</option></select></label>
                  </div>
                </fieldset>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-bg-sub p-3"><input type="checkbox" required className="mt-1 h-5 w-5 shrink-0" checked={form.consent} onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))} />
                  <span className="text-sm leading-6">Autorizo o tratamento dos dados enviados para avaliação da minha candidatura. Li a <Link className="underline" href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>. Meus dados serão guardados pelo prazo do processo seletivo e eu posso pedir acesso, correção ou exclusão a qualquer momento em <Link className="underline" href="/carreiras/privacidade" target="_blank" rel="noopener noreferrer">Meus dados</Link>.</span></label>
                <Button type="submit" className="w-full !bg-[#7240da] hover:!bg-[#5b29be]" isLoading={submitting} disabled={!form.consent}>Enviar candidatura</Button>
              </form>
            )}
          </section>
        </div>
      </main>
      <CareersFooter company={company} />
    </div>
  );
}

/** Compartilhar a vaga: cada canal recebe um link com ?src=, e a candidatura fica marcada com a origem. */
function ShareBar({ title, companyName }: { title: string; companyName: string }) {
  const [copied, setCopied] = useState(false);
  const base = () => window.location.origin + window.location.pathname;
  const open = (channel: string, build: (url: string) => string) => window.open(build(trackedJobUrl(base(), channel)), '_blank', 'noopener,noreferrer');
  async function copy() {
    try { await navigator.clipboard.writeText(trackedJobUrl(base(), 'site')); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* sem permissão de área de transferência */ }
  }
  const text = (url: string) => `Vaga: ${title} na ${companyName}. Candidate-se: ${url}`;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Compartilhar vaga" role="group">
      <span className="text-fg-mut">Compartilhar:</span>
      <button type="button" className="btn btn-outline" onClick={() => open('whatsapp', (url) => `https://wa.me/?text=${encodeURIComponent(text(url))}`)}>WhatsApp</button>
      <button type="button" className="btn btn-outline" onClick={() => open('linkedin', (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)}>LinkedIn</button>
      <button type="button" className="btn btn-outline" onClick={() => void copy()}>{copied ? 'Link copiado' : 'Copiar link'}</button>
    </div>
  );
}
