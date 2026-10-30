'use client';

import { ArrowLeft, ArrowRight, Building2, Check, EyeOff, Globe2, Lock, Plus, Sparkles, Trash2, Undo2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, ConfirmDialog, PageHeader } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { BENEFIT_SUGGESTIONS, CRITERIA_LIBRARY, draftFromTemplate, questionFromLibrary, ROLE_TEMPLATES, templateForTitle, TITLE_CATALOG, type RoleTemplate } from '../job-library';
import { jobsApi } from '../jobs-api';
import { toWholeReais } from '../payloads';
import { EMPLOYMENT_TYPE_LABEL, STAGE_KIND_LABEL, WORK_MODE_LABEL, salaryLabel, type Criterion, type Job, type JobStatus, type Question, type StageKind } from '../types';
import { workflowApi } from '../workflow-api';
import { Field, Pill, SectionCard, inputClass } from './bits';
import { DocumentPicker } from './document-picker';
import { ScreeningEditor } from './screening-editor';
import { JobSharePanel } from './share-dialog';

const STEPS = ['Tipo e cargo', 'Detalhes da vaga', 'Triagem', 'Etapas e avaliação', 'Publicar'] as const;
const EMPLOYMENT_OPTIONS = ['CLT', 'PJ', 'ESTAGIO', 'TEMPORARIO', 'JOVEM_APRENDIZ'];
const SENIORITY = ['Estágio', 'Júnior', 'Pleno', 'Sênior', 'Especialista', 'Liderança'];
type Kind = 'EXTERNAL' | 'INTERNAL' | 'CONFIDENTIAL';

interface Draft {
  kind: Kind; title: string; department: string; location: string; workMode: string; employmentType: string; seniority: string; openings: number;
  description: string; requirementsText: string; benefitsText: string; interviewGuideText: string;
  salaryMin: string; salaryMax: string; salaryHidden: boolean; deadline: string; status: JobStatus;
  questions: Question[]; criteria: Criterion[]; screeningMinScore: number | null; screeningAction: 'FLAG' | 'REJECT';
  requiredDocuments: string[];
}

const EMPTY: Draft = {
  kind: 'EXTERNAL', title: '', department: '', location: '', workMode: '', employmentType: 'CLT', seniority: '', openings: 1,
  description: '', requirementsText: '', benefitsText: '', interviewGuideText: '',
  salaryMin: '', salaryMax: '', salaryHidden: false, deadline: '', status: 'DRAFT',
  questions: [], criteria: [], screeningMinScore: null, screeningAction: 'REJECT', requiredDocuments: [],
};

const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);
const KIND: Record<Kind, { title: string; text: string; icon: typeof Globe2 }> = {
  EXTERNAL: { title: 'Externa', text: 'Aparece no portal de vagas. Qualquer pessoa se candidata pelo link ou QR code.', icon: Globe2 },
  INTERNAL: { title: 'Interna', text: 'Só funcionários. No link, a pessoa confirma matrícula + CPF e o sistema confere com o cadastro.', icon: Lock },
  CONFIDENTIAL: { title: 'Confidencial', text: 'Não aparece no portal. Só quem recebe o link ou o QR code vê (reposição, substituição).', icon: EyeOff },
};
const STAGE_HELP: Record<StageKind, string> = {
  APPLIED: 'Candidatura chega e passa pela triagem automática (perguntas e nota).',
  SCREENING: 'RH analisa currículos e respostas. Pode enviar teste técnico ou comportamental.',
  INTERVIEW: 'Ao mover para cá, abre o agendamento: presencial ou online, convite por e-mail e lembrete.',
  OFFER: 'Proposta digital: aprovação interna e aceite do candidato pelo link.',
  HIRED: 'Contratar: vira funcionário em admissão (documentos e ASO).',
  REJECTED: 'Reprovado: o candidato recebe um retorno educado por e-mail.',
};

function validate(draft: Draft): { step: number; message: string }[] {
  const issues: { step: number; message: string }[] = [];
  if (!draft.title.trim()) issues.push({ step: 0, message: 'Informe o cargo / título da vaga.' });
  if (!draft.description.trim()) issues.push({ step: 1, message: 'Descreva a vaga.' });
  const min = toWholeReais(draft.salaryMin) ?? null;
  const max = toWholeReais(draft.salaryMax) ?? null;
  if (min !== null && max !== null && min > max) issues.push({ step: 1, message: 'O salário mínimo não pode ser maior que o máximo.' });
  draft.questions.forEach((question, index) => {
    if (!question.label.trim()) issues.push({ step: 2, message: `A pergunta ${index + 1} está sem texto.` });
    if (['SELECT', 'MULTI'].includes(question.type) && question.options.length < 2) issues.push({ step: 2, message: `A pergunta ${index + 1} precisa de ao menos 2 opções.` });
  });
  draft.criteria.forEach((criterion, index) => { if (!criterion.name.trim()) issues.push({ step: 3, message: `O critério ${index + 1} está sem nome.` }); });
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
  const savingRef = useRef(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saved, setSaved] = useState<Job | null>(null);
  const [autoFilled, setAutoFilled] = useState<{ template: RoleTemplate; before: Draft } | null>(null);
  const baseline = useRef(JSON.stringify(EMPTY));
  const dirty = JSON.stringify(draft) !== baseline.current;

  const titles = useQuery(() => jobsApi.titleSuggestions(), []);
  const pipeline = useQuery(() => jobsApi.pipeline(), []);
  const savedTemplates = useQuery(() => workflowApi.templates(), [], { enabled: !jobId });

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    setLoading(true); setLoadError('');
    Promise.all([jobsApi.get(jobId), jobsApi.questions(jobId), jobsApi.criteria(jobId)])
      .then(([job, questions, criteria]) => {
        if (!active) return;
        const loaded: Draft = {
          kind: job.isInternal ? 'INTERNAL' : job.confidential ? 'CONFIDENTIAL' : 'EXTERNAL',
          title: job.title, department: job.department ?? '', location: job.location ?? '', workMode: job.workMode ?? '',
          employmentType: job.employmentType ?? '', seniority: job.seniority ?? '', openings: job.openings ?? 1,
          description: job.description, requirementsText: (job.requirements ?? []).join('\n'), benefitsText: (job.benefits ?? []).join('\n'), interviewGuideText: (job.interviewGuide ?? []).join('\n'),
          salaryMin: job.salaryMin != null ? String(job.salaryMin) : '', salaryMax: job.salaryMax != null ? String(job.salaryMax) : '',
          salaryHidden: job.salaryHidden, deadline: job.deadline ? job.deadline.slice(0, 10) : '', status: job.status,
          questions: questions.map(({ id, label, type, required, options, knockout, scoreRule }) => ({ id, label, type, required, options: options ?? [], knockout: knockout ?? null, scoreRule: scoreRule ?? null })),
          criteria: criteria.map(({ id, name, weight }) => ({ id, name, weight })),
          screeningMinScore: job.screeningMinScore ?? null, screeningAction: job.screeningAction ?? 'REJECT',
          requiredDocuments: (job.requiredDocuments ?? []).map((item) => item.label),
        };
        setDraft(loaded); baseline.current = JSON.stringify(loaded);
      })
      .catch((cause) => active && setLoadError(cause instanceof ApiError ? cause.message : 'Não foi possível carregar a vaga.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [jobId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty && !saving && !saved) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving, saved]);

  const issues = useMemo(() => validate(draft), [draft]);
  const stepHasIssue = (index: number) => issues.some((issue) => issue.step === index);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const template = useMemo(() => templateForTitle(draft.title), [draft.title]);
  const suggestions = useMemo(() => {
    const own = titles.data?.titles ?? [];
    const seen = new Set(own.map((item) => item.title.toLowerCase()));
    return [...own.map((item) => item.title), ...TITLE_CATALOG.map((item) => item.title).filter((title) => !seen.has(title.toLowerCase()))];
  }, [titles.data]);

  /** Preenche o que estiver vazio com o modelo do cargo (descricao, requisitos, beneficios, perguntas, criterios, roteiro). */
  function fillFromTemplate(chosen: RoleTemplate, title = draft.title) {
    const model = draftFromTemplate(title.trim() || chosen.titles[0], chosen);
    const before = draft;
    setDraft((previous) => ({
      ...previous,
      title: previous.title.trim() || chosen.titles[0],
      department: previous.department || model.department,
      employmentType: model.employmentType ?? previous.employmentType,
      workMode: previous.workMode || model.workMode || '',
      description: previous.description.trim() ? previous.description : model.description,
      requirementsText: previous.requirementsText.trim() ? previous.requirementsText : model.requirements.join('\n'),
      benefitsText: previous.benefitsText.trim() ? previous.benefitsText : model.benefits.join('\n'),
      interviewGuideText: previous.interviewGuideText.trim() ? previous.interviewGuideText : model.guide.join('\n'),
      criteria: previous.criteria.length ? previous.criteria : model.criteria,
      questions: previous.questions.length ? previous.questions : model.questions.map((key) => questionFromLibrary(key, previous.screeningAction)),
      screeningMinScore: previous.questions.length ? previous.screeningMinScore : previous.screeningMinScore ?? 50,
    }));
    setAutoFilled({ template: chosen, before });
  }

  async function save(status: JobStatus) {
    if (saving || savingRef.current) return;
    if (issues.length) { setStep(issues[0].step); toast.error(issues[0].message); return; }
    savingRef.current = true; setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(), description: draft.description.trim(),
        department: draft.department.trim() || null, location: draft.location.trim() || null,
        workMode: draft.workMode || null, employmentType: draft.employmentType || null, seniority: draft.seniority || null,
        openings: Math.max(1, Number(draft.openings) || 1),
        requirements: lines(draft.requirementsText), benefits: lines(draft.benefitsText), interviewGuide: lines(draft.interviewGuideText).slice(0, 30),
        salaryMin: toWholeReais(draft.salaryMin) ?? null, salaryMax: toWholeReais(draft.salaryMax) ?? null,
        salaryHidden: draft.salaryHidden, deadline: draft.deadline || null, status,
        isInternal: draft.kind === 'INTERNAL', confidential: draft.kind === 'CONFIDENTIAL',
        screeningMinScore: draft.screeningMinScore, screeningAction: draft.screeningAction,
        requiredDocuments: draft.requiredDocuments.map((label) => ({ label, required: true })),
      };
      const result = jobId ? await jobsApi.update(jobId, payload) : await jobsApi.create(payload);
      await jobsApi.saveQuestions(result.id, draft.questions);
      await jobsApi.saveCriteria(result.id, draft.criteria);
      baseline.current = JSON.stringify(draft);
      if (result.status === 'PENDING_APPROVAL') toast.info('A vaga foi para aprovação. O link funciona depois de aprovada.');
      setSaved(result);
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar a vaga.');
    } finally { savingRef.current = false; setSaving(false); }
  }

  if (loading) return <LoadingState label="Carregando vaga…" />;
  if (loadError) return <div className="p-6"><ErrorState message={loadError} /><Link href={base} className="btn btn-outline btn-md mt-3 inline-flex">Voltar</Link></div>;

  if (saved) {
    const published = saved.status === 'OPEN';
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={28} aria-hidden="true" /></span>
          <h1 className="text-2xl font-bold text-fg">{published ? 'Vaga publicada!' : saved.status === 'PENDING_APPROVAL' ? 'Vaga enviada para aprovação' : 'Vaga salva como rascunho'}</h1>
          <p className="text-sm text-fg-sub">{saved.title}{published ? ' · divulgue o link ou o QR code abaixo.' : ' · o link passa a funcionar quando a vaga for publicada.'}</p>
        </div>
        <ShareInline job={saved} />
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`${base}/${saved.id}`} className="btn btn-primary btn-md">Ver candidatos</Link>
          <Link href={`${base}/${saved.id}/edit`} className="btn btn-outline btn-md">Editar</Link>
          <Link href={base} className="btn btn-ghost btn-md">Voltar para vagas</Link>
        </div>
      </div>
    );
  }

  const last = step === STEPS.length - 1;
  const benefits = lines(draft.benefitsText);
  const criteriaTotal = draft.criteria.reduce((sum, criterion) => sum + (Number(criterion.weight) || 0), 0);

  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-5 p-4 sm:p-6">
      <PageHeader title={jobId ? 'Editar vaga' : 'Nova vaga'} subtitle="Escolha o cargo e o sistema monta a vaga para você revisar."
        actions={<Button variant="outline" onClick={() => (dirty ? setLeaveOpen(true) : router.push(base))}><ArrowLeft size={16} aria-hidden="true" /> Voltar</Button>} />

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
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
          {autoFilled && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
              <span className="flex items-center gap-2"><Sparkles size={16} aria-hidden="true" /> Preenchemos descrição, requisitos, benefícios, perguntas, critérios e roteiro com o modelo <strong>{autoFilled.template.label}</strong>. Revise e ajuste.</span>
              <button type="button" className="inline-flex min-h-9 items-center gap-1 font-semibold underline" onClick={() => { setDraft(autoFilled.before); setAutoFilled(null); }}><Undo2 size={14} aria-hidden="true" /> Desfazer</button>
            </div>
          )}

          {step === 0 && (
            <>
              <SectionCard title="Tipo de processo" description="Define quem pode se candidatar e como o link funciona.">
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de processo">
                  {(Object.keys(KIND) as Kind[]).map((kind) => {
                    const meta = KIND[kind];
                    const on = draft.kind === kind;
                                        return (
                      <button key={kind} type="button" role="radio" aria-checked={on} onClick={() => set('kind', kind)}
                        className={`flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition ${on ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200' : 'border-border hover:bg-bg-sub'}`}>
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${on ? 'bg-purple-600 text-white' : 'bg-bg-sub text-fg-sub'}`}><meta.icon size={18} aria-hidden="true" /></span>
                        <span className="font-semibold text-fg">{meta.title}</span>
                        <span className="text-xs text-fg-sub">{meta.text}</span>
                      </button>
                    );
                  })}
                </div>
                {jobId && <p className="text-xs text-fg-sub">Você pode mudar o público a qualquer momento. O link muda junto (divulgue o novo link/QR code) e quem já se candidatou continua no processo.</p>}
              </SectionCard>

              <SectionCard title="Cargo" description="Digite ou escolha. Cargos conhecidos já trazem descrição, perguntas e critérios prontos.">
                <Field label="Cargo / título da vaga" required>
                  <input className={inputClass} list="job-title-options" value={draft.title} maxLength={160} placeholder="Ex.: Vendedor, Auxiliar Administrativo, Motorista…"
                    onChange={(event) => set('title', event.target.value)} />
                  <datalist id="job-title-options">{suggestions.slice(0, 400).map((title) => <option key={title} value={title} />)}</datalist>
                </Field>
                {template && !autoFilled && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-sm">
                    <span>Reconhecemos o cargo como <strong>{template.label}</strong>. Quer montar a vaga automaticamente?</span>
                    <Button size="sm" onClick={() => fillFromTemplate(template)}><Sparkles size={14} aria-hidden="true" /> Preencher automaticamente</Button>
                  </div>
                )}
                {!draft.title.trim() && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-fg">Ou comece por uma área:</p>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_TEMPLATES.map((item) => <button key={item.id} type="button" className="min-h-9 rounded-full border border-border px-3 text-sm hover:border-purple-400 hover:bg-purple-50" onClick={() => fillFromTemplate(item, item.titles[0])}>{item.label}</button>)}
                    </div>
                  </div>
                )}
                {!jobId && (savedTemplates.data?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-fg">Modelos salvos pela sua empresa:</p>
                    <div className="flex flex-wrap gap-2">
                      {savedTemplates.data!.map((row) => <button key={row.id} type="button" className="min-h-9 rounded-full border border-border px-3 text-sm hover:bg-bg-sub" onClick={async () => {
                        try { const created = await workflowApi.useTemplate(row.id); toast.success('Vaga criada a partir do modelo. Revise e publique.'); router.push(`${base}/${created.id}/edit`); } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível usar o modelo.'); }
                      }}>{row.name}</button>)}
                    </div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Departamento"><input className={inputClass} list="job-department-options" value={draft.department} maxLength={120} placeholder="Ex.: Comercial" onChange={(event) => set('department', event.target.value)} />
                    <datalist id="job-department-options">{[...new Set([...(titles.data?.titles ?? []).map((item) => item.department).filter(Boolean) as string[], ...ROLE_TEMPLATES.map((item) => item.department)])].map((item) => <option key={item} value={item} />)}</datalist></Field>
                  <Field label="Quantidade de vagas"><input type="number" min={1} className={inputClass} value={draft.openings} onChange={(event) => set('openings', Number(event.target.value))} /></Field>
                  <Field label="Senioridade" className="sm:col-span-2">
                    <div className="flex flex-wrap gap-1.5">{['', ...SENIORITY].map((item) => <button key={item || 'none'} type="button" aria-pressed={draft.seniority === item} onClick={() => set('seniority', item)} className={`min-h-9 rounded-full border px-3 text-sm ${draft.seniority === item ? 'border-purple-600 bg-purple-600 text-white' : 'border-border hover:bg-bg-sub'}`}>{item || 'Não informar'}</button>)}</div>
                  </Field>
                  <Field label="Local"><input className={inputClass} value={draft.location} maxLength={180} placeholder="Cidade - UF, bairro ou remoto" onChange={(event) => set('location', event.target.value)} /></Field>
                  <Field label="Modalidade"><select className={inputClass} value={draft.workMode} onChange={(event) => set('workMode', event.target.value)}><option value="">Não informar</option>{Object.entries(WORK_MODE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                  <Field label="Contratação"><select className={inputClass} value={draft.employmentType} onChange={(event) => set('employmentType', event.target.value)}>{EMPLOYMENT_OPTIONS.map((value) => <option key={value} value={value}>{EMPLOYMENT_TYPE_LABEL[value]}</option>)}</select></Field>
                </div>
              </SectionCard>
            </>
          )}

          {step === 1 && (
            <SectionCard title="Detalhes da vaga" description="O que aparece para o candidato. Já vem preenchido quando o cargo é reconhecido.">
              {template && !draft.description.trim() && <Button variant="outline" size="sm" onClick={() => fillFromTemplate(template)}><Sparkles size={14} aria-hidden="true" /> Gerar texto para {draft.title || template.label}</Button>}
              <Field label="Descrição da vaga" required hint={`${draft.description.length} / 12.000 caracteres`}>
                <textarea className={`${inputClass} min-h-48`} maxLength={12000} value={draft.description} onChange={(event) => set('description', event.target.value)} />
              </Field>
              <Field label="Requisitos" hint="Um por linha."><textarea className={`${inputClass} min-h-24`} value={draft.requirementsText} onChange={(event) => set('requirementsText', event.target.value)} /></Field>
              <Field label="Benefícios" hint="Clique para adicionar ou escreva um por linha.">
                <div className="mb-2 flex flex-wrap gap-1.5">{BENEFIT_SUGGESTIONS.map((item) => {
                  const on = benefits.some((benefit) => benefit.toLowerCase() === item.toLowerCase());
                  return <button key={item} type="button" aria-pressed={on} onClick={() => set('benefitsText', on ? benefits.filter((benefit) => benefit.toLowerCase() !== item.toLowerCase()).join('\n') : [...benefits, item].join('\n'))} className={`min-h-8 rounded-full border px-2.5 text-xs font-medium ${on ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-border text-fg-sub hover:bg-bg-sub'}`}>{on ? '✓ ' : '+ '}{item}</button>;
                })}</div>
                <textarea aria-label="Benefícios da vaga, um por linha" className={`${inputClass} min-h-24`} value={draft.benefitsText} onChange={(event) => set('benefitsText', event.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Salário de (R$)"><input inputMode="decimal" className={inputClass} placeholder="2.000" value={draft.salaryMin} onChange={(event) => set('salaryMin', event.target.value)} /></Field>
                <Field label="até (R$)"><input inputMode="decimal" className={inputClass} placeholder="2.500" value={draft.salaryMax} onChange={(event) => set('salaryMax', event.target.value)} /></Field>
                <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4" checked={draft.salaryHidden} onChange={(event) => set('salaryHidden', event.target.checked)} /> Não mostrar o salário (aparece &quot;A combinar&quot;)</label>
                <Field label="Inscrições até" hint="Depois desta data a vaga para de receber candidaturas. Em branco = sem prazo."><input type="date" className={inputClass} value={draft.deadline} onChange={(event) => set('deadline', event.target.value)} /></Field>
              </div>
            </SectionCard>
          )}

          {step === 2 && (
            <SectionCard title="Triagem automática" description="Perguntas que o candidato responde ao se candidatar. O sistema dá uma nota de 0 a 100% e separa quem não atende.">
              <ScreeningEditor questions={draft.questions} suggested={template?.questions ?? []} minScore={draft.screeningMinScore} action={draft.screeningAction}
                onChange={(next) => set('questions', next)} onMinScore={(value) => set('screeningMinScore', value)} onAction={(value) => set('screeningAction', value)} />
            </SectionCard>
          )}

          {step === 3 && (
            <>
              <SectionCard title="Etapas do processo" description="O caminho de cada candidato nesta vaga. Você move pelo quadro de candidatos e o sistema faz o resto.">
                {pipeline.loading && <p className="text-sm text-fg-sub">Carregando etapas…</p>}
                <ol className="space-y-2">
                  {(pipeline.data?.stages ?? []).map((stage, index) => (
                    <li key={stage.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: stage.color || '#7c3aed' }}>{index + 1}</span>
                      <span><span className="font-semibold text-fg">{stage.name}</span> <span className="text-xs text-fg-mut">({STAGE_KIND_LABEL[stage.kind]})</span><span className="block text-sm text-fg-sub">{STAGE_HELP[stage.kind]}</span></span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-fg-sub">Quer mudar os nomes ou a ordem das etapas? <Link href={`${base}/settings`} className="font-semibold text-brand-700 underline">Configurar funil</Link> (vale para todas as vagas).</p>
              </SectionCard>

              <SectionCard title="Critérios para avaliar o candidato" description="Usados por quem entrevista (notas de 1 a 5). O peso vira a porcentagem de cada critério na nota final.">
                <div className="flex flex-wrap gap-1.5">{CRITERIA_LIBRARY.map((item) => {
                  const on = draft.criteria.some((criterion) => criterion.name.toLowerCase() === item.name.toLowerCase());
                  return <button key={item.name} type="button" disabled={!on && draft.criteria.length >= 12} aria-pressed={on} onClick={() => set('criteria', on ? draft.criteria.filter((criterion) => criterion.name.toLowerCase() !== item.name.toLowerCase()) : [...draft.criteria, { ...item }])} className={`min-h-8 rounded-full border px-2.5 text-xs font-medium ${on ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-border text-fg-sub hover:bg-bg-sub'}`}>{on ? '✓ ' : '+ '}{item.name}</button>;
                })}</div>
                <ul className="space-y-2">
                  {draft.criteria.map((criterion, index) => (
                    <li key={criterion.id ?? index} className="grid grid-cols-[1fr_150px_56px_auto] items-center gap-2">
                      <input className={inputClass} aria-label={`Critério ${index + 1}`} value={criterion.name} maxLength={80} onChange={(event) => set('criteria', draft.criteria.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))} />
                      <select className={inputClass} aria-label={`Peso do critério ${index + 1}`} value={criterion.weight} onChange={(event) => set('criteria', draft.criteria.map((item, i) => (i === index ? { ...item, weight: Number(event.target.value) } : item)))}>{[[1, 'Peso baixo'], [2, 'Peso médio'], [3, 'Peso alto']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                      <span className="text-right text-sm font-semibold tabular-nums text-purple-700">{criteriaTotal ? Math.round(((Number(criterion.weight) || 0) / criteriaTotal) * 100) : 0}%</span>
                      <button type="button" className="btn-icon text-rose-600" aria-label="Remover critério" onClick={() => set('criteria', draft.criteria.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" size="sm" disabled={draft.criteria.length >= 12} onClick={() => set('criteria', [...draft.criteria, { name: '', weight: 2 }])}><Plus size={15} aria-hidden="true" /> Critério próprio</Button>
                {draft.criteria.length > 0 && <p className="text-xs text-fg-sub">Os pesos somam sempre 100%.</p>}
              </SectionCard>

              <SectionCard title="Roteiro de entrevista" description="Perguntas que quem entrevista deve fazer (uma por linha). Aparecem na ficha do candidato e na hora de avaliar.">
                {!draft.interviewGuideText.trim() && <Button variant="outline" size="sm" onClick={() => set('interviewGuideText', (template ?? ROLE_TEMPLATES[2]).guide.join('\n'))}><Sparkles size={14} aria-hidden="true" /> Usar roteiro pronto</Button>}
                <textarea className={`${inputClass} min-h-32`} aria-label="Roteiro de entrevista" value={draft.interviewGuideText} onChange={(event) => set('interviewGuideText', event.target.value)} />
                <p className="text-sm text-fg-sub">Teste técnico com nota de corte: {jobId ? <Link className="font-semibold text-brand-700 underline" href={`${base}/${jobId}/teste`}>montar o teste desta vaga</Link> : 'monte depois de salvar a vaga (botão Teste técnico).'} O questionário comportamental já está pronto na ficha do candidato.</p>
              </SectionCard>

              <SectionCard title="Documentos da admissão" description="Documentos que o candidato escolhido precisa enviar. Sem seleção, usamos o kit do tipo de contrato (CLT, PJ, estágio, aprendiz ou temporário).">
                <DocumentPicker value={draft.requiredDocuments} onChange={(items) => set('requiredDocuments', items)} />
                {draft.requiredDocuments.length === 0 && <p className="text-xs text-fg-sub">Nenhum documento escolhido: será usado o kit do contrato {draft.employmentType || 'CLT'}.</p>}
              </SectionCard>
            </>
          )}

          {step === 4 && (
            <SectionCard title="Revisar e publicar" description="Ao publicar, você recebe o link e o QR code da vaga.">
              {issues.length > 0 && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  <p className="font-semibold">Corrija antes de publicar:</p>
                  <ul className="mt-1 list-disc pl-5">{issues.map((issue, index) => <li key={index}><button type="button" className="underline" onClick={() => setStep(issue.step)}>{STEPS[issue.step]}: {issue.message}</button></li>)}</ul>
                </div>
              )}
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-fg-sub">Tipo</dt><dd className="font-medium">{KIND[draft.kind].title}</dd></div>
                <div><dt className="text-fg-sub">Cargo</dt><dd className="font-medium">{draft.title || '—'}{draft.openings > 1 ? ` · ${draft.openings} vagas` : ''}</dd></div>
                <div><dt className="text-fg-sub">Departamento / Local</dt><dd className="font-medium">{[draft.department, draft.location].filter(Boolean).join(' · ') || '—'}</dd></div>
                <div><dt className="text-fg-sub">Salário</dt><dd className="font-medium">{salaryLabel({ salaryMin: toWholeReais(draft.salaryMin) ?? null, salaryMax: toWholeReais(draft.salaryMax) ?? null, salaryRange: null, salaryHidden: draft.salaryHidden })}</dd></div>
                <div><dt className="text-fg-sub">Triagem</dt><dd className="font-medium">{draft.questions.length} pergunta(s) · {draft.screeningMinScore ? `nota mínima ${draft.screeningMinScore}%` : 'sem nota mínima'} · {draft.questions.filter((q) => q.knockout).length} eliminatória(s)</dd></div>
                <div><dt className="text-fg-sub">Quem não passa</dt><dd className="font-medium">{draft.screeningAction === 'REJECT' ? 'Reprovado automaticamente (retorno em 24h)' : 'Marcado para o RH decidir'}</dd></div>
                <div><dt className="text-fg-sub">Critérios de avaliação</dt><dd className="font-medium">{draft.criteria.length || 'Nenhum'}</dd></div>
                <div><dt className="text-fg-sub">Prazo</dt><dd className="font-medium">{draft.deadline ? new Date(`${draft.deadline}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button isLoading={saving} onClick={() => save('OPEN')}>{jobId && draft.status === 'OPEN' ? 'Salvar alterações' : 'Publicar e gerar link'}</Button>
                {(!jobId || draft.status !== 'OPEN') && <Button variant="outline" isLoading={saving} onClick={() => save(jobId ? draft.status : 'DRAFT')}>Salvar {jobId ? '' : 'como '}rascunho</Button>}
              </div>
            </SectionCard>
          )}

          <div className="flex justify-between">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} aria-hidden="true" /> Anterior</Button>
            {!last && <Button onClick={() => setStep(step + 1)}>Próxima <ArrowRight size={16} aria-hidden="true" /></Button>}
          </div>
        </div>

        <aside aria-label="Prévia" className="hidden lg:block">
          <div className="card-v2 sticky top-4 space-y-3 p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-sub">{draft.kind === 'INTERNAL' ? <><Users size={13} aria-hidden="true" /> Vaga interna</> : draft.kind === 'CONFIDENTIAL' ? <><EyeOff size={13} aria-hidden="true" /> Confidencial</> : <><Building2 size={13} aria-hidden="true" /> Prévia no portal</>}</p>
            <h3 className="text-lg font-semibold text-fg">{draft.title || 'Cargo'}</h3>
            <p className="text-sm text-fg-sub">{[draft.department, draft.location, draft.workMode && WORK_MODE_LABEL[draft.workMode], draft.employmentType && EMPLOYMENT_TYPE_LABEL[draft.employmentType]].filter(Boolean).join(' · ') || 'Local · Modalidade · Contrato'}</p>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone="brand">{salaryLabel({ salaryMin: toWholeReais(draft.salaryMin) ?? null, salaryMax: toWholeReais(draft.salaryMax) ?? null, salaryRange: null, salaryHidden: draft.salaryHidden })}</Pill>
              {draft.seniority && <Pill>{draft.seniority}</Pill>}
              {draft.openings > 1 && <Pill>{draft.openings} vagas</Pill>}
            </div>
            <p className="line-clamp-6 whitespace-pre-line text-sm text-fg-sub">{draft.description || 'A descrição aparece aqui.'}</p>
            {benefits.length > 0 && <ul className="flex flex-wrap gap-1.5">{benefits.slice(0, 6).map((item) => <li key={item}><Pill tone="success">{item}</Pill></li>)}</ul>}
            <p className="border-t border-border pt-3 text-xs text-fg-sub">{draft.questions.length} pergunta(s) na triagem{draft.screeningMinScore ? ` · corte em ${draft.screeningMinScore}%` : ''}</p>
          </div>
        </aside>
      </div>

      <ConfirmDialog isOpen={leaveOpen} onClose={() => setLeaveOpen(false)} onConfirm={() => router.push(base)} title="Descartar alterações?" description="Você tem alterações não salvas nesta vaga." confirmText="Descartar e sair" cancelText="Continuar editando" />
    </div>
  );
}

/** Link + QR na propria tela de sucesso (sem abrir janela). */
function ShareInline({ job }: { job: Job }) {
  return <div className="card-v2 p-5"><JobSharePanel job={job} /></div>;
}
