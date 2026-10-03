'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { CareersBrand, CareersFooter } from '../../_components/careers-brand';
import { applyToPublicJob, CareersApiError, employmentTypeLabel, getPublicJob, validateResume, type PublicJob } from '../../_lib/public-jobs';

const EMPTY = { name: '', email: '', phone: '', linkedinUrl: '', coverLetter: '', website: '', consent: false };
export function JobDetails({ companyId, jobId }: { companyId: string; jobId: string }) {
  const [job, setJob] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [resume, setResume] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true; setLoading(true); setLoadError(''); setJob(null);
    getPublicJob(companyId, jobId).then(result => { if (active) setJob(result); })
      .catch(cause => { if (active) setLoadError(cause instanceof Error ? cause.message : 'Não foi possível carregar esta vaga.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId, jobId, reload]);
  useEffect(() => { setForm(EMPTY); setResume(null); setSuccess(''); setFileError(''); setError(''); }, [companyId, jobId]);
  useEffect(() => { if (success) successRef.current?.focus(); }, [success]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !job) return;
    const validation = validateResume(resume);
    if (validation) { setFileError(validation); fileInput.current?.focus(); return; }
    if (!resume || !form.consent) return;
    pending.current = true; setSubmitting(true); setError('');
    try {
      const result = await applyToPublicJob(job.id, { ...form, resume });
      setSuccess(result.message); setForm(EMPTY); setResume(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (cause) {
      setError(cause instanceof CareersApiError && cause.status === 409 ? 'Já existe uma candidatura para esta vaga com os dados informados.' : cause instanceof Error ? cause.message : 'Não foi possível enviar. Verifique sua conexão e tente novamente.');
    } finally { pending.current = false; setSubmitting(false); }
  }
  const company = job?.company ?? { id: companyId, name: 'Portal de carreiras' };
  const companyPath = '/carreiras/' + encodeURIComponent(companyId);
  if (loading) return <main className="min-h-screen bg-bg p-6"><p role="status">Carregando oportunidade...</p></main>;
  if (loadError || !job) return <main className="min-h-screen bg-bg px-4 py-10"><div className="card-v2 mx-auto max-w-xl space-y-4 p-6">
    <PageHeader title="Vaga indisponível" subtitle={loadError || 'Esta vaga não está recebendo candidaturas.'} />
    <Link className="btn btn-outline" href={companyPath}>Ver outras vagas</Link><Button type="button" onClick={() => setReload(value => value + 1)}>Tentar novamente</Button>
  </div></main>;
  return <div className="min-h-screen bg-bg text-fg">
    <a className="sr-only focus:not-sr-only focus:block focus:p-4" href="#application">Ir para a candidatura</a>
    <header className="border-b border-border bg-bg-elev"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
      <CareersBrand company={company} companyId={companyId} compact /><Link className="btn btn-outline" href={companyPath}>Todas as oportunidades</Link>
    </div></header>
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <PageHeader title={job.title} subtitle={(job.location || 'Local não informado') + ' · ' + employmentTypeLabel(job.employmentType)}
        actions={<a className="btn btn-primary" href="#application">Candidatar-me</a>} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <article className="card-v2 min-w-0 space-y-6 p-5 sm:p-6">
          <section><h2 className="text-lg font-semibold">Descrição da vaga</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{job.description || 'Descrição não informada.'}</p></section>
          {(job.department || job.workMode || job.salaryRange) && <dl className="space-y-3 text-sm">
            {job.department && <div><dt className="text-fg-mut">Área</dt><dd>{job.department}</dd></div>}
            {job.workMode && <div><dt className="text-fg-mut">Modalidade</dt><dd>{job.workMode}</dd></div>}
            {job.salaryRange && <div><dt className="text-fg-mut">Faixa salarial</dt><dd>{job.salaryRange}</dd></div>}
          </dl>}
          {!!job.benefits.length && <section><h2 className="font-semibold">Benefícios</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{job.benefits.map((benefit, index) => <li key={index}>{benefit}</li>)}</ul></section>}
          <section className="border-t border-border pt-4"><h2 className="font-semibold">Sobre o processo</h2><p className="mt-2 text-sm leading-6 text-fg-mut">Envie seus dados e currículo para avaliação da empresa. As etapas e os contatos seguintes são definidos pelo RH responsável por esta vaga.</p></section>
        </article>
        <section id="application" className="card-v2 min-w-0 scroll-mt-4 p-5 sm:p-6" aria-label="Candidatura">
          <h2 className="text-lg font-semibold">Enviar candidatura</h2><p className="mt-2 text-sm text-fg-mut">Campos com * são obrigatórios.</p>
          {success ? <div ref={successRef} tabIndex={-1} role="status" className="mt-5 space-y-4"><h3 className="font-semibold text-emerald-800">Candidatura recebida</h3><p className="text-sm">{success}</p>
            <Link className="btn btn-outline" href={companyPath}>Ver outras vagas desta empresa</Link><Link className="btn btn-ghost" href="/carreiras">Ver outras empresas</Link></div>
            : <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="sr-only" aria-hidden="true"><label htmlFor="candidate-website">Não preencha este campo</label><input id="candidate-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm(current => ({ ...current, website: e.target.value }))} /></div>
              <fieldset disabled={submitting} className="min-w-0 space-y-4">
                <legend className="sr-only">Dados do candidato</legend>
                <label className="block space-y-1"><span className="text-sm font-medium">Nome completo *</span><input name="name" required minLength={3} maxLength={120} autoComplete="name" className="input-v2 min-h-11 text-base sm:text-sm" value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} /></label>
                <label className="block space-y-1"><span className="text-sm font-medium">E-mail *</span><input name="email" type="email" required maxLength={160} autoComplete="email" className="input-v2 min-h-11 text-base sm:text-sm" value={form.email} onChange={e => setForm(current => ({ ...current, email: e.target.value }))} /></label>
                <label className="block space-y-1"><span className="text-sm font-medium">Telefone / WhatsApp *</span><input name="phone" type="tel" required minLength={10} maxLength={20} autoComplete="tel" inputMode="tel" pattern="[+()0-9 .-]{10,20}" className="input-v2 min-h-11 text-base sm:text-sm" value={form.phone} onChange={e => setForm(current => ({ ...current, phone: e.target.value }))} /></label>
                <label className="block space-y-1"><span className="text-sm font-medium">LinkedIn (opcional)</span><input name="linkedinUrl" type="url" maxLength={300} className="input-v2 min-h-11 text-base sm:text-sm" placeholder="https://linkedin.com/in/seu-perfil" value={form.linkedinUrl} onChange={e => setForm(current => ({ ...current, linkedinUrl: e.target.value }))} /></label>
                <label className="block space-y-1"><span className="text-sm font-medium">Apresentação (opcional)</span><textarea name="coverLetter" maxLength={1500} rows={4} className="input-v2 resize-y text-base sm:text-sm" aria-describedby="presentation-count" value={form.coverLetter} onChange={e => setForm(current => ({ ...current, coverLetter: e.target.value }))} /><span id="presentation-count" className="block text-right text-xs text-fg-mut">{form.coverLetter.length} / 1.500 caracteres</span></label>
                <label className="block space-y-2"><span className="text-sm font-medium">Currículo *</span><input ref={fileInput} name="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  aria-invalid={Boolean(fileError)} aria-describedby="resume-help resume-error" className="block min-h-11 w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:rounded-lg file:border-0 file:px-3"
                  onChange={e => { const file = e.target.files?.[0] ?? null; const issue = validateResume(file); setFileError(issue || ''); setResume(issue ? null : file); if (issue) e.target.value = ''; }} />
                  <span id="resume-help" className="block text-xs text-fg-mut">PDF ou DOCX até 5 MB. Use o seletor para anexar ou substituir.</span></label>
                {resume && <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="min-w-0 break-all text-sm">{resume.name} · {(resume.size / 1024 / 1024).toFixed(1)} MB</span><Button type="button" variant="outline" onClick={() => { setResume(null); setFileError(''); if (fileInput.current) fileInput.current.value = ''; }}>Remover currículo</Button></div>}
                <p id="resume-error" role={fileError ? 'alert' : undefined} className="text-sm text-rose-800">{fileError}</p>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-bg-sub p-3"><input type="checkbox" required className="mt-1 h-5 w-5 shrink-0" checked={form.consent} onChange={e => setForm(current => ({ ...current, consent: e.target.checked }))} />
                  <span className="text-sm leading-6">Autorizo o tratamento dos dados enviados para avaliação da minha candidatura. Li a <Link className="underline" href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>.</span></label>
              </fieldset>
              {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
              <Button type="submit" className="w-full" isLoading={submitting}>Enviar candidatura</Button>
            </form>}
        </section>
      </div>
    </main><CareersFooter company={company} />
  </div>;
}
