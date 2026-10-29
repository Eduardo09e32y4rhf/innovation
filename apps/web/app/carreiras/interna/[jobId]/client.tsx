'use client';

import { TurnstileWidget } from '@/app/_components/turnstile-widget';
import { Lock } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { QuestionField } from '../../[companyId]/[jobId]/job-details';
import { ActionShell, Notice, actionCard, primaryBtn } from '../../_components/action-shell';
import { errorMessage } from '../../_lib/process-public';
import { employmentTypeLabel, fetchPublic, workModeLabel, type PublicQuestion } from '../../_lib/public-jobs';

interface InternalJob {
  id: string; title: string; description: string; department?: string | null; location?: string | null; workMode?: string | null; seniority?: string | null; employmentType?: string | null;
  requirements: string[]; benefits: string[]; openings: number; deadline?: string | null; salaryRange?: string | null; salaryMin?: number | null; salaryMax?: number | null; salaryHidden: boolean;
  acceptsApplications: boolean; company: { name: string; logoUrl?: string | null }; questions: PublicQuestion[];
}

const maskCpf = (value: string) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const input = 'min-h-12 w-full rounded-[12px] border border-[#d9cdee] bg-white px-3 text-base outline-none focus:border-[#7240da]';

/** Vaga interna pelo link/QR: so funcionario ativo, que prova quem e com matricula + CPF. */
export function InternalJobClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<InternalJob | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ registration: '', cpf: '', email: '', phone: '', coverLetter: '', consent: false });
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => { (fetchPublic(`/public/internal-jobs/${encodeURIComponent(jobId)}`) as Promise<InternalJob>).then(setJob).catch((cause) => setError(errorMessage(cause, 'Vaga interna não encontrada.'))); }, [jobId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!form.registration.trim() || form.cpf.replace(/\D/g, '').length !== 11) { setError('Informe sua matrícula e o CPF completo.'); return; }
    if (!form.consent) { setError('Marque que autoriza o uso dos seus dados neste processo.'); return; }
    setBusy(true);
    try {
      const result = await fetchPublic(`/public/internal-jobs/${encodeURIComponent(jobId)}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration: form.registration.trim(), cpf: form.cpf, email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, coverLetter: form.coverLetter.trim() || undefined, consent: form.consent, answers }),
      }) as { name: string };
      setDone(result.name);
    } catch (cause) { setError(errorMessage(cause, 'Não foi possível enviar sua candidatura.')); } finally { setBusy(false); }
  }

  const salary = job && !job.salaryHidden ? (job.salaryMin && job.salaryMax ? `${brl(job.salaryMin)} a ${brl(job.salaryMax)}` : job.salaryMin ? `A partir de ${brl(job.salaryMin)}` : job.salaryRange) : null;
  return (
    <ActionShell>
      {!job && !error && <p role="status" className="text-sm text-[#5b5473]">Carregando…</p>}
      {!job && error && <Notice tone="error">{error}</Notice>}
      {job && (
        <>
          <header className="space-y-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[#f0eafa] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#5b29be]"><Lock size={13} aria-hidden="true" /> Vaga interna · {job.company.name}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1145]">{job.title}</h1>
            <p className="text-sm text-[#5b5473]">{[job.department, job.location, job.workMode ? workModeLabel(job.workMode) : null, job.employmentType ? employmentTypeLabel(job.employmentType) : null, job.seniority].filter(Boolean).join(' · ')}{salary ? ` · ${salary}` : ''}</p>
          </header>
          <section className={`${actionCard} space-y-4 text-sm`}>
            <p className="whitespace-pre-line">{job.description}</p>
            {job.requirements.length > 0 && <div><h2 className="mb-1 font-bold">Requisitos</h2><ul className="list-disc space-y-0.5 pl-5">{job.requirements.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {job.benefits.length > 0 && <div><h2 className="mb-1 font-bold">Benefícios</h2><ul className="list-disc space-y-0.5 pl-5">{job.benefits.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          </section>

          {done ? <Notice tone="success"><strong>Candidatura enviada, {done}!</strong> O RH recebeu seus dados do cadastro e suas respostas. Você será avisado pelos próximos passos.</Notice>
            : !job.acceptsApplications ? <Notice tone="info">Esta vaga não está recebendo candidaturas no momento.</Notice>
            : (
              <form onSubmit={submit} className={`${actionCard} space-y-4`} noValidate>
                <div><h2 className="text-lg font-bold">Candidate-se</h2><p className="text-sm text-[#5b5473]">Só para funcionários. Confirme sua matrícula e seu CPF: seus dados vêm do cadastro da empresa.</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium">Matrícula *<input className={input} autoComplete="off" value={form.registration} onChange={(event) => setForm({ ...form, registration: event.target.value })} /></label>
                  <label className="space-y-1 text-sm font-medium">CPF *<input className={input} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={form.cpf} onChange={(event) => setForm({ ...form, cpf: maskCpf(event.target.value) })} /></label>
                  <label className="space-y-1 text-sm font-medium">E-mail para contato<input className={input} type="email" placeholder="Se não estiver no cadastro" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                  <label className="space-y-1 text-sm font-medium">Telefone<input className={input} inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                </div>
                {job.questions.length > 0 && <div className="space-y-4 border-t border-[#ebe6f3] pt-4">{job.questions.map((question) => <QuestionField key={question.id} question={question} value={answers[question.id]} onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))} />)}</div>}
                <label className="block space-y-1 text-sm font-medium">Por que você quer esta vaga? (opcional)<textarea className={`${input} min-h-24 py-2`} maxLength={3000} value={form.coverLetter} onChange={(event) => setForm({ ...form, coverLetter: event.target.value })} /></label>
                <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#7240da]" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} /> Autorizo o uso dos meus dados do cadastro neste processo seletivo interno.</label>
                {error && <Notice tone="error">{error}</Notice>}
                <TurnstileWidget />
                <button type="submit" className={`${primaryBtn} w-full`} disabled={busy}>{busy ? 'Enviando…' : 'Enviar candidatura'}</button>
              </form>
            )}
        </>
      )}
    </ActionShell>
  );
}
