'use client';

import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, ConfirmDialog, PageHeader } from '@/app/components/ui';
import { ApiError } from '@/app/lib/api';
import { jobsApi } from '../jobs-api';
import { EMPLOYMENT_TYPE_LABEL, WORK_MODE_LABEL, salaryLabel, type Criterion, type JobStatus, type Question } from '../types';
import { Field, Pill, SectionCard, inputClass } from './bits';
import { QuestionEditor } from './question-editor';

const STEPS = ['Básico', 'Descrição', 'Condições', 'Formulário', 'Avaliação', 'Revisão'] as const;
const EMPLOYMENT_OPTIONS = ['CLT', 'PJ', 'ESTAGIO', 'TEMPORARIO', 'JOVEM_APRENDIZ'];
const SENIORITY = ['Estágio', 'Júnior', 'Pleno', 'Sênior', 'Especialista', 'Liderança'];

interface Draft {
  title: string; department: string; location: string; workMode: string; employmentType: string; seniority: string; openings: number;
  description: string; requirementsText: string; benefitsText: string;
  salaryMin: string; salaryMax: string; salaryHidden: boolean; deadline: string; status: JobStatus;
  questions: Question[]; criteria: Criterion[];
}

const EMPTY: Draft = {
  title: '', department: '', location: '', workMode: '', employmentType: 'CLT', seniority: '', openings: 1,
  description: '', requirementsText: '', benefitsText: '',
  salaryMin: '', salaryMax: '', salaryHidden: false, deadline: '', status: 'DRAFT',
  questions: [], criteria: [],
};

const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

function validate(draft: Draft): { step: number; message: string }[] {
  const issues: { step: number; message: string }[] = [];
  if (!draft.title.trim()) issues.push({ step: 0, message: 'Informe o título da vaga.' });
  if (!draft.description.trim()) issues.push({ step: 1, message: 'Descreva a vaga.' });
  const min = draft.salaryMin ? Number(draft.salaryMin) : null;
  const max = draft.salaryMax ? Number(draft.salaryMax) : null;
  if (min !== null && max !== null && min > max) issues.push({ step: 2, message: 'A faixa salarial mínima não pode ser maior que a máxima.' });
  draft.questions.forEach((question, index) => {
    if (!question.label.trim()) issues.push({ step: 3, message: `A pergunta ${index + 1} está sem texto.` });
    if (['SELECT', 'MULTI'].includes(question.type) && question.options.length < 2) issues.push({ step: 3, message: `A pergunta ${index + 1} precisa de ao menos 2 opções.` });
  });
  draft.criteria.forEach((criterion, index) => {
    if (!criterion.name.trim()) issues.push({ step: 4, message: `O critério ${index + 1} está sem nome.` });
  });
  return issues;
}

export function JobWizard({ jobId }: { jobId?: string }) {
  const router = useRouter();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const base = `/${tenant}/dashboard/jobs`;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const baseline = useRef(JSON.stringify(EMPTY));
  const dirty = JSON.stringify(draft) !== baseline.current;

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    setLoading(true); setLoadError('');
    Promise.all([jobsApi.get(jobId), jobsApi.questions(jobId), jobsApi.criteria(jobId)])
      .then(([job, questions, criteria]) => {
        if (!active) return;
        const loaded: Draft = {
          title: job.title, department: job.department ?? '', location: job.location ?? '', workMode: job.workMode ?? '',
          employmentType: job.employmentType ?? '', seniority: job.seniority ?? '', openings: job.openings ?? 1,
          description: job.description, requirementsText: (job.requirements ?? []).join('\n'), benefitsText: (job.benefits ?? []).join('\n'),
          salaryMin: job.salaryMin != null ? String(job.salaryMin) : '', salaryMax: job.salaryMax != null ? String(job.salaryMax) : '',
          salaryHidden: job.salaryHidden, deadline: job.deadline ? job.deadline.slice(0, 10) : '', status: job.status,
          questions: questions.map((question) => ({ ...question, options: question.options ?? [] })),
          criteria: criteria.map(({ id, name, weight }) => ({ id, name, weight })),
        };
        setDraft(loaded); baseline.current = JSON.stringify(loaded);
      })
      .catch((cause) => active && setLoadError(cause instanceof ApiError ? cause.message : 'Não foi possível carregar a vaga.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [jobId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty && !saving) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);

  const issues = useMemo(() => validate(draft), [draft]);
  const stepHasIssue = (index: number) => issues.some((issue) => issue.step === index);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));

  async function save(status: JobStatus) {
    if (saving) return;
    if (issues.length) { setStep(issues[0].step); toast.error(issues[0].message); return; }
    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(), description: draft.description.trim(),
        department: draft.department.trim() || undefined, location: draft.location.trim() || undefined,
        workMode: draft.workMode || undefined, employmentType: draft.employmentType || undefined, seniority: draft.seniority || undefined,
        openings: Math.max(1, Number(draft.openings) || 1),
        requirements: lines(draft.requirementsText), benefits: lines(draft.benefitsText),
        salaryMin: draft.salaryMin ? Number(draft.salaryMin) : undefined, salaryMax: draft.salaryMax ? Number(draft.salaryMax) : undefined,
        salaryHidden: draft.salaryHidden, deadline: draft.deadline || null, status,
      };
      const saved = jobId ? await jobsApi.update(jobId, payload) : await jobsApi.create(payload);
      await jobsApi.saveQuestions(saved.id, draft.questions.map((question) => ({ ...question, label: question.label.trim() })));
      await jobsApi.saveCriteria(saved.id, draft.criteria.map((criterion) => ({ ...criterion, name: criterion.name.trim() })));
      baseline.current = JSON.stringify(draft);
      toast.success(status === 'OPEN' ? 'Vaga publicada.' : 'Vaga salva.');
      router.push(base);
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar a vaga.');
    } finally { setSaving(false); }
  }

  if (loading) return <LoadingState label="Carregando vaga…" />;
  if (loadError) return <div className="p-6"><ErrorState message={loadError} /><Link href={base} className="btn btn-outline btn-md mt-3 inline-flex">Voltar</Link></div>;

  const last = step === STEPS.length - 1;
  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-5 p-4 sm:p-6">
      <PageHeader
        title={jobId ? 'Editar vaga' : 'Nova vaga'}
        subtitle="Monte a vaga, o formulário e os critérios de avaliação do seu jeito."
        actions={<Button variant="outline" onClick={() => (dirty ? setLeaveOpen(true) : router.push(base))}><ArrowLeft size={16} aria-hidden="true" /> Voltar</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)_320px]">
        <nav aria-label="Etapas" className="card-v2 flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
          {STEPS.map((label, index) => (
            <button key={label} type="button" onClick={() => setStep(index)} aria-current={step === index ? 'step' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${step === index ? 'bg-purple-600 text-white' : 'hover:bg-bg-sub'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step === index ? 'bg-white/20' : stepHasIssue(index) ? 'bg-rose-100 text-rose-700' : index < step ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                {index < step && !stepHasIssue(index) ? <Check size={13} aria-hidden="true" /> : index + 1}
              </span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          {step === 0 && (
            <SectionCard title="Informações básicas" description="O essencial para o candidato reconhecer a vaga.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Título da vaga" required className="sm:col-span-2"><input className={inputClass} value={draft.title} maxLength={160} placeholder="Ex.: Analista de RH Sênior" onChange={(event) => set('title', event.target.value)} /></Field>
                <Field label="Departamento"><input className={inputClass} value={draft.department} maxLength={120} placeholder="Ex.: Recursos Humanos" onChange={(event) => set('department', event.target.value)} /></Field>
                <Field label="Senioridade"><select className={inputClass} value={draft.seniority} onChange={(event) => set('seniority', event.target.value)}><option value="">Não informar</option>{SENIORITY.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Local"><input className={inputClass} value={draft.location} maxLength={180} placeholder="Cidade, estado ou remoto" onChange={(event) => set('location', event.target.value)} /></Field>
                <Field label="Modalidade"><select className={inputClass} value={draft.workMode} onChange={(event) => set('workMode', event.target.value)}><option value="">Não informar</option>{Object.entries(WORK_MODE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                <Field label="Tipo de contratação"><select className={inputClass} value={draft.employmentType} onChange={(event) => set('employmentType', event.target.value)}>{EMPLOYMENT_OPTIONS.map((value) => <option key={value} value={value}>{EMPLOYMENT_TYPE_LABEL[value]}</option>)}</select></Field>
                <Field label="Quantidade de vagas"><input type="number" min={1} className={inputClass} value={draft.openings} onChange={(event) => set('openings', Number(event.target.value))} /></Field>
              </div>
            </SectionCard>
          )}

          {step === 1 && (
            <SectionCard title="Descrição" description="Explique o papel, as responsabilidades e o que você espera do candidato.">
              <Field label="Descrição da vaga" required hint={`${draft.description.length} / 12.000 caracteres`}>
                <textarea className={`${inputClass} min-h-56`} maxLength={12000} value={draft.description} onChange={(event) => set('description', event.target.value)} />
              </Field>
              <Field label="Requisitos" hint="Um por linha. Aparecem como lista na página da vaga."><textarea className={`${inputClass} min-h-28`} value={draft.requirementsText} onChange={(event) => set('requirementsText', event.target.value)} /></Field>
              <Field label="Benefícios" hint="Um por linha."><textarea className={`${inputClass} min-h-28`} value={draft.benefitsText} onChange={(event) => set('benefitsText', event.target.value)} /></Field>
            </SectionCard>
          )}

          {step === 2 && (
            <SectionCard title="Condições" description="Remuneração e prazo das inscrições.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Salário mínimo (R$)"><input type="number" min={0} className={inputClass} value={draft.salaryMin} onChange={(event) => set('salaryMin', event.target.value)} /></Field>
                <Field label="Salário máximo (R$)"><input type="number" min={0} className={inputClass} value={draft.salaryMax} onChange={(event) => set('salaryMax', event.target.value)} /></Field>
                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.salaryHidden} onChange={(event) => set('salaryHidden', event.target.checked)} /> Não divulgar a faixa salarial no portal (exibir &quot;A combinar&quot;)</label>
                <Field label="Inscrições até" hint="Depois desta data a vaga sai do portal automaticamente. Deixe em branco para não ter prazo."><input type="date" className={inputClass} value={draft.deadline} onChange={(event) => set('deadline', event.target.value)} /></Field>
              </div>
            </SectionCard>
          )}

          {step === 3 && (
            <SectionCard title="Formulário de candidatura" description="Perguntas extras para filtrar os candidatos do seu jeito. Nome, e-mail, telefone, LinkedIn, apresentação e currículo já são pedidos.">
              <QuestionEditor questions={draft.questions} onChange={(next) => set('questions', next)} />
            </SectionCard>
          )}

          {step === 4 && (
            <SectionCard title="Critérios de avaliação" description="Crie sua própria ficha de avaliação. Cada avaliador dá notas de 1 a 5 e o sistema calcula a média ponderada." actions={
              <Button variant="outline" size="sm" disabled={draft.criteria.length >= 12} onClick={() => set('criteria', [...draft.criteria, { name: '', weight: 1 }])}><Plus size={15} aria-hidden="true" /> Critério</Button>
            }>
              {draft.criteria.length === 0 && (
                <div className="space-y-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-fg-sub">
                  <p>Nenhum critério. Você pode começar com um modelo:</p>
                  <Button variant="outline" size="sm" onClick={() => set('criteria', [{ name: 'Conhecimento técnico', weight: 3 }, { name: 'Comunicação', weight: 2 }, { name: 'Aderência cultural', weight: 2 }])}>Usar modelo básico</Button>
                </div>
              )}
              <ul className="space-y-2">
                {draft.criteria.map((criterion, index) => (
                  <li key={criterion.id ?? index} className="grid grid-cols-[1fr_130px_auto] items-end gap-2">
                    <Field label={index === 0 ? 'Critério' : ''}><input className={inputClass} aria-label={`Critério ${index + 1}`} value={criterion.name} maxLength={80} onChange={(event) => set('criteria', draft.criteria.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))} /></Field>
                    <Field label={index === 0 ? 'Peso (1-5)' : ''}><select className={inputClass} aria-label={`Peso do critério ${index + 1}`} value={criterion.weight} onChange={(event) => set('criteria', draft.criteria.map((item, i) => (i === index ? { ...item, weight: Number(event.target.value) } : item)))}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></Field>
                    <button type="button" className="btn-icon mb-1 text-rose-600" aria-label="Remover critério" onClick={() => set('criteria', draft.criteria.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {step === 5 && (
            <SectionCard title="Revisão" description="Confira tudo antes de salvar.">
              {issues.length > 0 && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  <p className="font-semibold">Corrija antes de salvar:</p>
                  <ul className="mt-1 list-disc pl-5">{issues.map((issue, index) => <li key={index}><button type="button" className="underline" onClick={() => setStep(issue.step)}>{STEPS[issue.step]}: {issue.message}</button></li>)}</ul>
                </div>
              )}
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-fg-sub">Título</dt><dd className="font-medium">{draft.title || '—'}</dd></div>
                <div><dt className="text-fg-sub">Departamento / Local</dt><dd className="font-medium">{[draft.department, draft.location].filter(Boolean).join(' · ') || '—'}</dd></div>
                <div><dt className="text-fg-sub">Remuneração</dt><dd className="font-medium">{salaryLabel({ salaryMin: Number(draft.salaryMin) || null, salaryMax: Number(draft.salaryMax) || null, salaryRange: null, salaryHidden: draft.salaryHidden })}</dd></div>
                <div><dt className="text-fg-sub">Prazo</dt><dd className="font-medium">{draft.deadline ? new Date(`${draft.deadline}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'}</dd></div>
                <div><dt className="text-fg-sub">Perguntas no formulário</dt><dd className="font-medium">{draft.questions.length} ({draft.questions.filter((q) => q.knockout).length} eliminatória(s))</dd></div>
                <div><dt className="text-fg-sub">Critérios de avaliação</dt><dd className="font-medium">{draft.criteria.length}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button isLoading={saving} onClick={() => save('OPEN')}>{jobId && draft.status === 'OPEN' ? 'Salvar alterações' : 'Publicar vaga'}</Button>
                {(!jobId || draft.status !== 'OPEN') && <Button variant="outline" isLoading={saving} onClick={() => save(jobId ? draft.status : 'DRAFT')}>Salvar {jobId ? '' : 'como '}rascunho</Button>}
              </div>
            </SectionCard>
          )}

          <div className="flex justify-between">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} aria-hidden="true" /> Anterior</Button>
            {!last && <Button onClick={() => setStep(step + 1)}>Próxima <ArrowRight size={16} aria-hidden="true" /></Button>}
          </div>
        </div>

        <aside aria-label="Prévia da página pública" className="hidden lg:block">
          <div className="card-v2 sticky top-4 space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-sub">Prévia no portal</p>
            <h3 className="text-lg font-semibold text-fg">{draft.title || 'Título da vaga'}</h3>
            <p className="text-sm text-fg-sub">{[draft.department, draft.location, draft.workMode && WORK_MODE_LABEL[draft.workMode], draft.employmentType && EMPLOYMENT_TYPE_LABEL[draft.employmentType]].filter(Boolean).join(' · ') || 'Local · Modalidade · Contrato'}</p>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone="brand">{salaryLabel({ salaryMin: Number(draft.salaryMin) || null, salaryMax: Number(draft.salaryMax) || null, salaryRange: null, salaryHidden: draft.salaryHidden })}</Pill>
              {draft.seniority && <Pill>{draft.seniority}</Pill>}
              {draft.openings > 1 && <Pill>{draft.openings} vagas</Pill>}
            </div>
            <p className="line-clamp-6 whitespace-pre-line text-sm text-fg-sub">{draft.description || 'A descrição aparecerá aqui.'}</p>
            {lines(draft.benefitsText).length > 0 && <ul className="flex flex-wrap gap-1.5">{lines(draft.benefitsText).slice(0, 6).map((item) => <li key={item}><Pill tone="success">{item}</Pill></li>)}</ul>}
            <p className="border-t border-border pt-3 text-xs text-fg-sub">{draft.questions.length} pergunta(s) extra(s) no formulário</p>
          </div>
        </aside>
      </div>

      <ConfirmDialog isOpen={leaveOpen} onClose={() => setLeaveOpen(false)} onConfirm={() => router.push(base)} title="Descartar alterações?" description="Você tem alterações não salvas nesta vaga." confirmText="Descartar e sair" cancelText="Continuar editando" />
    </div>
  );
}
