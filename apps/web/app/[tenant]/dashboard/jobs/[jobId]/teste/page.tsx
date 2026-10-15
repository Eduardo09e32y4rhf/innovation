'use client';

import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { Field, SectionCard, inputClass } from '../../_components/bits';
import { jobsApi } from '../../jobs-api';
import { processApi, type JobAssessment, type TechnicalQuestion } from '../../process-api';

const blankQuestion = (): TechnicalQuestion => ({ text: '', options: ['', ''], correct: 0, weight: 1 });

/** Teste tecnico da vaga: multipla escolha com gabarito, peso, tempo e nota de corte. Corrigido sozinho. */
export default function JobTestPage() {
  const { tenant = '', jobId = '' } = useParams<{ tenant: string; jobId: string }>();
  const { user } = useAuth();
  const role = String(user?.profile ?? '').toUpperCase();
  const canEdit = ['DEV', 'ADMIN', 'RH', 'RH_RS'].includes(role);
  const job = useQuery(() => jobsApi.get(jobId), [jobId]);
  const saved = useQuery(() => processApi.jobAssessment(jobId), [jobId]);
  const [form, setForm] = useState<JobAssessment>({ title: '', instructions: '', timeLimitMinutes: null, passingScore: 60, autoReject: false, questions: [] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!saved.data) return;
    setForm({ title: saved.data.title ?? '', instructions: saved.data.instructions ?? '', timeLimitMinutes: saved.data.timeLimitMinutes ?? null, passingScore: saved.data.passingScore ?? 60, autoReject: Boolean(saved.data.autoReject), questions: saved.data.questions ?? [] });
  }, [saved.data]);

  const setQuestion = (index: number, patch: Partial<TechnicalQuestion>) => setForm({ ...form, questions: form.questions.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const problems = form.questions.flatMap((question, index) => {
    const out: string[] = [];
    if (!question.text.trim()) out.push(`Pergunta ${index + 1}: escreva o enunciado.`);
    if (question.options.filter((option) => option.trim()).length < 2) out.push(`Pergunta ${index + 1}: ao menos 2 alternativas.`);
    if (!question.options[question.correct]?.trim()) out.push(`Pergunta ${index + 1}: marque a alternativa correta.`);
    return out;
  });

  async function save() {
    if (problems.length || busy) { if (problems.length) toast.error(problems[0]); return; }
    setBusy(true);
    try {
      // Alternativas vazias saem, e o gabarito acompanha a nova posicao.
      const questions = form.questions.map((question) => {
        const kept = question.options.map((text, index) => ({ text: text.trim(), index })).filter((option) => option.text);
        return { ...question, text: question.text.trim(), options: kept.map((option) => option.text), correct: Math.max(0, kept.findIndex((option) => option.index === question.correct)) };
      });
      const result = await processApi.saveJobAssessment(jobId, { ...form, questions });
      toast.success(questions.length ? 'Teste salvo. Envie pela ficha do candidato, aba Testes.' : 'Teste removido.');
      setForm({ ...form, questions: result.questions ?? [] });
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar o teste.'); } finally { setBusy(false); }
  }

  if (job.loading || saved.loading) return <LoadingState label="Carregando teste…" />;
  if (job.error) return <ErrorState message={job.error} onRetry={job.refetch} />;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link href={`/${tenant}/dashboard/jobs/${jobId}`} className="inline-flex items-center gap-1 text-sm text-fg-sub hover:text-fg"><ArrowLeft size={15} aria-hidden="true" /> Voltar para a vaga</Link>
      <header><h1 className="text-xl font-semibold text-fg">Teste técnico</h1><p className="text-sm text-fg-sub">{job.data?.title}. O candidato recebe o link por e-mail, responde no celular ou computador e a nota sai na hora.</p></header>

      <SectionCard title="Configuração">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome do teste" className="sm:col-span-2"><input className={inputClass} maxLength={160} placeholder={`Teste: ${job.data?.title ?? ''}`} value={form.title ?? ''} disabled={!canEdit} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Instruções ao candidato" className="sm:col-span-2"><textarea className={`${inputClass} min-h-20`} maxLength={3000} value={form.instructions ?? ''} disabled={!canEdit} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></Field>
          <Field label="Tempo para responder"><select className={inputClass} value={form.timeLimitMinutes ?? ''} disabled={!canEdit} onChange={(event) => setForm({ ...form, timeLimitMinutes: event.target.value ? Number(event.target.value) : null })}><option value="">Sem limite</option>{[10, 15, 20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select></Field>
          <Field label="Nota de corte (0 a 100)"><input type="number" min={0} max={100} className={inputClass} value={form.passingScore ?? 60} disabled={!canEdit} onChange={(event) => setForm({ ...form, passingScore: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></Field>
          <label className="flex min-h-11 items-start gap-3 text-sm sm:col-span-2"><input type="checkbox" className="mt-0.5 h-5 w-5" checked={Boolean(form.autoReject)} disabled={!canEdit} onChange={(event) => setForm({ ...form, autoReject: event.target.checked })} /><span><span className="font-semibold text-fg">Reprovar automaticamente abaixo da nota de corte</span><span className="block text-xs text-fg-sub">O candidato recebe o e-mail de feedback de reprovação. Desmarcado, o RH decide olhando a nota.</span></span></label>
        </div>
      </SectionCard>

      <SectionCard title={`Perguntas (${form.questions.length})`} description="Múltipla escolha. Marque a alternativa correta e o peso de cada pergunta." actions={canEdit ? <Button variant="outline" size="sm" disabled={form.questions.length >= 60} onClick={() => setForm({ ...form, questions: [...form.questions, blankQuestion()] })}><Plus size={15} aria-hidden="true" /> Pergunta</Button> : undefined}>
        {form.questions.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-fg-sub">Nenhuma pergunta ainda.</p>}
        <ol className="space-y-4">
          {form.questions.map((question, index) => (
            <li key={question.id ?? index} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-sm font-semibold text-fg-sub">{index + 1}.</span>
                <textarea aria-label={`Enunciado da pergunta ${index + 1}`} className={`${inputClass} min-h-16`} maxLength={1000} value={question.text} disabled={!canEdit} onChange={(event) => setQuestion(index, { text: event.target.value })} />
                {canEdit && <button type="button" className="btn-icon text-rose-600" aria-label={`Remover pergunta ${index + 1}`} onClick={() => setForm({ ...form, questions: form.questions.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>}
              </div>
              <ul className="space-y-1.5 pl-6">
                {question.options.map((option, optionIndex) => (
                  <li key={optionIndex} className="flex items-center gap-2">
                    <button type="button" aria-label={`Marcar alternativa ${optionIndex + 1} como correta`} aria-pressed={question.correct === optionIndex} disabled={!canEdit} onClick={() => setQuestion(index, { correct: optionIndex })}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${question.correct === optionIndex ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border text-transparent hover:border-emerald-400'}`}><Check size={15} /></button>
                    <input aria-label={`Alternativa ${optionIndex + 1}`} className={inputClass} maxLength={300} value={option} disabled={!canEdit} onChange={(event) => setQuestion(index, { options: question.options.map((item, i) => (i === optionIndex ? event.target.value : item)) })} />
                    {canEdit && question.options.length > 2 && <button type="button" className="btn-icon text-fg-sub" aria-label={`Remover alternativa ${optionIndex + 1}`} onClick={() => setQuestion(index, { options: question.options.filter((_, i) => i !== optionIndex), correct: question.correct === optionIndex ? 0 : question.correct > optionIndex ? question.correct - 1 : question.correct })}><Trash2 size={14} /></button>}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 pl-6">
                {canEdit && question.options.length < 6 ? <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => setQuestion(index, { options: [...question.options, ''] })}>+ Alternativa</button> : <span />}
                <label className="flex items-center gap-2 text-sm text-fg-sub">Peso <select className="input-v2 text-sm" value={question.weight} disabled={!canEdit} onChange={(event) => setQuestion(index, { weight: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>
      {canEdit && <div className="flex justify-end"><Button onClick={save} isLoading={busy}>Salvar teste</Button></div>}
    </div>
  );
}
