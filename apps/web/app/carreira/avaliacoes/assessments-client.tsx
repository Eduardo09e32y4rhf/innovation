'use client';

import { useEffect, useRef, useState } from 'react';
import { candidateApi, type PortalAssessment, type PortalAssessmentSummary } from '@/app/carreiras/_lib/candidate-api';
import { useConfirm } from '@/app/components/ui/confirm-provider';

const button = 'min-h-11 rounded-xl bg-[#5b2bd6] px-4 py-2 font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const secondary = 'min-h-11 rounded-xl border border-[#d5cceb] px-4 py-2 font-semibold disabled:opacity-50';
const statusLabel: Record<string, string> = { NOT_STARTED: 'Não iniciada', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída' };

export function AssessmentsClient() {
  const [list, setList] = useState<PortalAssessmentSummary[]>([]);
  const [test, setTest] = useState<PortalAssessment | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const confirm = useConfirm();
  async function loadList() { setList(await candidateApi.assessments()); }
  useEffect(() => { let alive = true; candidateApi.assessments().then(rows => { if (alive) setList(rows); }).catch(() => { if (alive) setError('Não foi possível carregar as avaliações. Tente novamente.'); }).finally(() => { if (alive) setBusy(false); }); return () => { alive = false; }; }, []);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  useEffect(() => { if (test) heading.current?.focus(); }, [index, test?.kind]);
  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar. Suas respostas continuam nesta tela.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function open(kind: string) { await perform(async () => { setTest(await candidateApi.startAssessment(kind)); setIndex(0); setDirty(false); }); }
  async function save(complete = false, next?: number) {
    if (!test) return;
    if (complete && !(await confirm({ title: 'Concluir avaliação', description: 'Confira suas respostas. Após concluir, elas não poderão ser alteradas.', confirmText: 'Concluir', cancelText: 'Revisar', variant: 'primary' }))) return;
    await perform(async () => {
      const updated = await candidateApi.saveAssessment(test.kind, { revision: test.revision, answers: test.answers, essay: test.essay, shareConsent: Boolean(test.shareConsent), complete });
      setTest(updated); setDirty(false); setNotice(complete ? 'Avaliação concluída e salva.' : 'Rascunho salvo. Você pode continuar depois.');
      if (next !== undefined) setIndex(next);
      if (complete) await loadList();
    });
  }
  async function back() {
    if (dirty && !(await confirm({ title: 'Há respostas não salvas', description: 'Voltar à lista descartará apenas as alterações ainda não salvas. Use “Salvar rascunho” para guardá-las.', confirmText: 'Descartar alterações', cancelText: 'Continuar respondendo' }))) return;
    await perform(async () => { await loadList(); setTest(null); setDirty(false); });
  }
  const done = test?.status === 'COMPLETED';
  const question = test?.questions[index];
  const answered = test ? Object.keys(test.answers).length : 0;
  const wordCount = test?.essay.trim().split(/\s+/u).filter(Boolean).length ?? 0;
  const essay = test?.kind === 'ESSAY';
  const subjective = test && ['CULTURE', 'WORK_STYLE'].includes(test.kind);
  const ready = test && (essay ? wordCount >= 150 && wordCount <= 600 : answered === test.questions.length);
  const required = list.filter(item => item.required);

  return <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 text-slate-900 sm:px-6">
    <h1 className="text-2xl font-bold">Avaliações</h1>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4"><p>{error}</p><button type="button" disabled={busy} className={`${secondary} mt-3`} onClick={() => test ? void open(test.kind) : void perform(loadList)}>{test ? 'Reabrir versão salva' : 'Tentar novamente'}</button></div>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</p>}
    {!test ? <>
      <p>Conclua português, matemática e redação para liberar o envio de candidaturas. Não há nota mínima automática. As questões objetivas têm alternativas de A a E. Não há limite de tempo; você pode salvar e continuar depois.</p>
      <p className="font-semibold">Obrigatórias concluídas: {required.filter(item => item.status === 'COMPLETED').length} de 3</p>
      {busy && <p role="status">Carregando avaliações…</p>}
      <div className="grid gap-4 sm:grid-cols-2">{list.map(item => <section key={item.kind} className="flex flex-col rounded-2xl border border-[#e9e4f1] bg-white p-5">
        <h2 className="text-lg font-bold">{item.title}</h2>
        <p className="mt-2 text-sm">{item.required ? 'Obrigatória' : 'Opcional'} · {statusLabel[item.status] ?? item.status}</p>
        <p className="mt-2 text-sm text-slate-600">{['PORTUGUESE', 'MATH'].includes(item.kind) ? '20 perguntas selecionadas do banco de questões.' : item.kind === 'ESSAY' ? 'Texto de 150 a 600 palavras. Revisão humana, sem nota automática.' : '12 perguntas sobre preferências e rotina. Sem respostas certas ou erradas.'}</p>
        {item.score != null && <p className="mt-2 font-semibold">Resultado: {item.score}/100</p>}
        <button aria-label={`${item.status === 'COMPLETED' ? 'Ver respostas e privacidade' : item.status === 'IN_PROGRESS' ? 'Continuar' : 'Começar'}: ${item.title}`} disabled={busy} className={`${button} mt-4`} onClick={() => void open(item.kind)}>{item.status === 'COMPLETED' ? 'Ver respostas e privacidade' : item.status === 'IN_PROGRESS' ? 'Continuar' : 'Começar'}<span className="sr-only">: {item.title}</span></button>
      </section>)}</div>
      <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Avaliação psicológica profissional</h2><p className="mt-2 text-sm">Os questionários deste portal não fazem diagnóstico psicológico nem geram laudos. Uma avaliação psicológica depende de profissional responsável e de instrumento autorizado para a modalidade de aplicação. Se a empresa solicitar essa etapa, ela deverá informar o profissional e as orientações específicas.</p></section>
    </> : <section aria-busy={busy} className="space-y-5 rounded-2xl border border-[#e9e4f1] bg-white p-5 sm:p-7">
      <button disabled={busy} className={secondary} onClick={() => void back()}>Voltar às avaliações</button>
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">{test.title}</h2>
      {done && <p role="status" className="rounded-xl bg-emerald-50 p-4">Concluída.{test.score != null ? ` Resultado: ${test.score}/100.` : essay ? ' Redação enviada, sem nota automática. A empresa poderá revisá-la se você autorizar o compartilhamento.' : subjective ? ' Suas respostas descrevem preferências; não são um diagnóstico nem uma nota de adequação à empresa.' : ' Sua avaliação foi enviada.'}</p>}
      {subjective && <p className="text-sm">Responda conforme suas preferências. Não há gabarito, diagnóstico ou reprovação automática. O fit cultural deve ser discutido com a empresa, considerando o contexto da vaga.</p>}
      {essay ? <div className="space-y-3"><p>{test.prompt}</p><label className="block font-semibold" htmlFor="essay">Sua redação</label><textarea id="essay" value={test.essay} disabled={busy || done} maxLength={12000} rows={14} aria-describedby="essay-count essay-rubric" className="w-full rounded-xl border p-3 text-base" onChange={event => { setTest({ ...test, essay: event.target.value }); setDirty(true); }} /><p id="essay-count" role="status">{wordCount} palavras · mínimo 150, máximo 600</p><p id="essay-rubric" className="text-sm text-slate-600">Critérios de revisão: {test.rubric.join('; ')}.</p></div> : <>
        <p>Pergunta {index + 1} de {test.questions.length} · {answered} {answered === 1 ? 'respondida' : 'respondidas'}</p>
        <div role="progressbar" aria-label="Perguntas respondidas" aria-valuemin={0} aria-valuenow={answered} aria-valuemax={test.questions.length} className="h-3 w-full overflow-hidden rounded-full bg-violet-100">
          <div aria-hidden="true" className="h-full rounded-full bg-[#5b2bd6] transition-[width]" style={{ width: `${test.questions.length ? answered / test.questions.length * 100 : 0}%` }} />
        </div>
        {question && <fieldset disabled={busy || done} className="space-y-3"><legend className="mb-4 whitespace-pre-line font-semibold">{question.text}</legend>{question.options.map((option, position) => <label key={position} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 ${test.answers[question.id] === position ? 'border-violet-600 bg-violet-50' : ''}`}><input type="radio" className="mt-1 h-4 w-4 shrink-0 accent-[#5b2bd6]" name={question.id} checked={test.answers[question.id] === position} onChange={() => { setTest({ ...test, answers: { ...test.answers, [question.id]: position } }); setDirty(true); }} /><span><strong>{'ABCDE'[position]}.</strong> {option}</span></label>)}</fieldset>}
        <div className="flex flex-wrap justify-between gap-3"><button disabled={busy || index === 0} className={secondary} onClick={() => done ? setIndex(index - 1) : void save(false, index - 1)}>Anterior</button><button disabled={busy || index === test.questions.length - 1} className={secondary} onClick={() => done ? setIndex(index + 1) : void save(false, index + 1)}>Próxima</button></div>
      </>}
      <div className="rounded-xl bg-slate-50 p-4"><label className="flex items-start gap-3"><input type="checkbox" checked={Boolean(test.shareConsent)} disabled={busy} className="mt-1 h-4 w-4" onChange={event => { const shareConsent = event.target.checked; if (done) void perform(async () => { setTest({ ...test, shareConsent }); try { await candidateApi.shareAssessment(test.kind, shareConsent); setNotice(shareConsent ? 'Compartilhamento autorizado.' : 'Compartilhamento revogado.'); } catch (cause) { setTest(test); throw cause; } }); else { setTest({ ...test, shareConsent }); setDirty(true); } }} /><span>Autorizo compartilhar esta avaliação concluída com as empresas às quais me candidatei usando meu perfil autenticado.</span></label><p className="mt-2 text-sm text-slate-600">Rascunhos são privados. Você pode revogar este acesso aqui. A exclusão da sua conta também remove estas avaliações do portal.</p></div>
      {!done && <div className="flex flex-wrap items-center gap-3"><button disabled={busy} className={secondary} onClick={() => void save()}>Salvar rascunho</button><button disabled={busy || !ready} className={button} onClick={() => void save(true)}>Concluir avaliação</button><span role="status" className="text-sm">{busy ? 'Salvando…' : dirty ? 'Alterações ainda não salvas.' : 'Respostas salvas.'}</span>{!ready && <p className="w-full text-sm">{essay ? 'Escreva entre 150 e 600 palavras para concluir.' : 'Responda todas as perguntas para concluir.'}</p>}</div>}
    </section>}
  </main>;
}
