'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { CareersBrand, CareersFooter } from '../../_components/careers-brand';
import {
  applyToPublicJob, CareersApiError, employmentTypeLabel, getPublicJob, publicSalaryLabel, validateResume, workModeLabel,
  type PublicJob, type PublicQuestion,
} from '../../_lib/public-jobs';

const EMPTY = { name: '', email: '', phone: '', linkedinUrl: '', coverLetter: '', website: '', consent: false };
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
      const result = await applyToPublicJob(job.id, { ...form, resume, answers });
      setSuccess(result.message); setForm(EMPTY); setAnswers({}); setResume(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (cause) {
      if (cause instanceof CareersApiError) {
        setFieldErrors(cause.fields);
        setError(cause.status === 409 ? 'Você já se candidatou a esta vaga. Sua candidatura está em análise.' : cause.message);
      } else setError('Não foi possível enviar. Verifique sua conexão e tente novamente.');
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

  const salary = publicSalaryLabel(job);
  const fieldError = (name: string) => fieldErrors[name];
  const input = 'input-v2 min-h-11 text-base sm:text-sm';

  return (
    <div className="min-h-screen bg-bg text-fg">
      <a className="sr-only focus:not-sr-only focus:block focus:p-4" href="#application">Ir para a candidatura</a>
      <header className="border-b border-border bg-bg-elev"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <CareersBrand company={company} companyId={companyId} compact /><Link className="btn btn-outline" href={companyPath}>Todas as oportunidades</Link>
      </div></header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <PageHeader title={job.title} subtitle={[job.location || 'Local não informado', employmentTypeLabel(job.employmentType)].join(' · ')} actions={<a className="btn btn-primary" href="#application">Candidatar-me</a>} />
        <div className="flex flex-wrap gap-2">
          {job.department && <Chip>{job.department}</Chip>}
          {workModeLabel(job.workMode) && <Chip>{workModeLabel(job.workMode)}</Chip>}
          {job.seniority && <Chip>{job.seniority}</Chip>}
          {salary && <Chip>{salary}</Chip>}
          {job.openings > 1 && <Chip>{job.openings} vagas</Chip>}
          {job.deadline && <Chip>Inscrições até {new Date(job.deadline).toLocaleDateString('pt-BR')}</Chip>}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
          <article className="card-v2 min-w-0 space-y-6 p-5 sm:p-6">
            <section><h2 className="text-lg font-semibold">Sobre a vaga</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{job.description || 'Descrição não informada.'}</p></section>
            {!!job.requirements.length && <section><h2 className="font-semibold">Requisitos</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{job.requirements.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
            {!!job.benefits.length && <section><h2 className="font-semibold">Benefícios</h2><ul className="mt-3 flex flex-wrap gap-2">{job.benefits.map((benefit, index) => <li key={index}><Chip>{benefit}</Chip></li>)}</ul></section>}
            <section className="border-t border-border pt-4"><h2 className="font-semibold">Como funciona</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-fg-mut"><li>Envie seus dados e currículo.</li><li>O RH analisa as candidaturas.</li><li>Se houver aderência, você será contatado para as próximas etapas.</li></ol>
            </section>
          </article>

          <section id="application" className="card-v2 min-w-0 scroll-mt-4 p-5 sm:p-6 lg:sticky lg:top-4" aria-label="Candidatura">
            <h2 className="text-lg font-semibold">Enviar candidatura</h2><p className="mt-2 text-sm text-fg-mut">Campos com * são obrigatórios.</p>
            {success ? (
              <div ref={successRef} tabIndex={-1} role="status" className="mt-5 space-y-4">
                <h3 className="text-lg font-semibold text-emerald-800">Candidatura recebida!</h3>
                <p className="text-sm">{success}</p>
                <p className="text-sm text-fg-mut">O RH analisará seu perfil e entrará em contato se houver aderência.</p>
                <Link className="btn btn-outline" href={companyPath}>Ver outras vagas desta empresa</Link>{' '}<Link className="btn btn-ghost" href="/carreiras">Ver outras empresas</Link>
              </div>
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

                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-bg-sub p-3"><input type="checkbox" required className="mt-1 h-5 w-5 shrink-0" checked={form.consent} onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))} />
                  <span className="text-sm leading-6">Autorizo o tratamento dos dados enviados para avaliação da minha candidatura. Li a <Link className="underline" href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>.</span></label>
                <Button type="submit" className="w-full" isLoading={submitting} disabled={!form.consent}>Enviar candidatura</Button>
              </form>
            )}
          </section>
        </div>
      </main>
      <CareersFooter company={company} />
    </div>
  );
}
