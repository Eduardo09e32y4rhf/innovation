'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActionShell, Notice, actionCard, primaryBtn } from '../../_components/action-shell';
import { errorMessage, processPublic, type PublicAssessment } from '../../_lib/process-public';
import { useConfirm } from '@/app/components/ui/confirm-provider';

type Item = { id: string; title: string; options: { value: number; text: string }[] };

/** Teste online: comeca quando o candidato clica (o tempo conta dali), responde e envia uma vez. */
export function AssessmentClient({ token }: { token: string }) {
  const [data, setData] = useState<PublicAssessment | null>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { processPublic.assessment(token).then(setData).catch((cause) => setError(errorMessage(cause, 'Teste não encontrado.'))); }, [token]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!data?.questions) return;
    try { const saved = window.sessionStorage.getItem(`teste-${token}`); if (saved) setAnswers(JSON.parse(saved)); } catch { /* sem rascunho */ }
  }, [data?.questions, token]);
  useEffect(() => { try { window.sessionStorage.setItem(`teste-${token}`, JSON.stringify(answers)); } catch { /* sem rascunho */ } }, [answers, token]);

  const items: Item[] = useMemo(() => (data?.questions ?? []).map((question) => 'question' in question
    ? { id: question.id, title: question.question, options: question.options }
    : { id: question.id, title: question.text, options: question.options.map((text, value) => ({ value, text })) }), [data?.questions]);
  const answered = items.filter((item) => answers[item.id] !== undefined).length;
  const remaining = data?.deadline ? Math.max(0, new Date(data.deadline).getTime() - now) : null;
  const clock = remaining === null ? null : `${String(Math.floor(remaining / 60000)).padStart(2, '0')}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  const behavioral = data?.kind === 'BEHAVIORAL';

  async function start() {
    setBusy(true); setError('');
    try { setData(await processPublic.startAssessment(token)); } catch (cause) { setError(errorMessage(cause, 'Não foi possível começar.')); } finally { setBusy(false); }
  }
  const askConfirm = useConfirm();
  async function submit() {
    if (behavioral && answered < items.length) { setError('Responda todas as situações antes de enviar.'); return; }
    if (!behavioral && answered < items.length && !(await askConfirm({ title: 'Enviar com perguntas em branco', description: `Você respondeu ${answered} de ${items.length}. Perguntas em branco contam como erradas.`, confirmText: 'Enviar mesmo assim', cancelText: 'Voltar e responder', variant: 'primary' }))) return;
    setBusy(true); setError('');
    try { await processPublic.submitAssessment(token, answers); setDone(true); try { window.sessionStorage.removeItem(`teste-${token}`); } catch { /* ok */ } }
    catch (cause) { setError(errorMessage(cause, 'Não foi possível enviar.')); } finally { setBusy(false); }
  }

  return (
    <ActionShell>
      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p role="status" className="text-sm text-[#5b5473]">Carregando…</p>}
      {data && (
        <>
          <header className="space-y-1">
            <p className="text-sm font-semibold text-[#7240da]">{data.company} · {data.job}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1145]">{data.title}</h1>
          </header>
          {(done || data.status === 'COMPLETED') && <Notice tone="success"><strong>Respostas enviadas. Obrigado, {data.candidate}!</strong> A empresa recebe o resultado e segue com o processo.</Notice>}
          {!done && data.status === 'EXPIRED' && <Notice tone="info">O prazo para responder terminou. Fale com a empresa se precisar de um novo link.</Notice>}
          {!done && data.status === 'CANCELED' && <Notice tone="info">Este teste foi cancelado pela empresa.</Notice>}
          {!done && data.status === 'SENT' && (
            <section className={`${actionCard} space-y-3`}>
              <p>Olá, {data.candidate}!</p>
              {data.instructions && <p className="whitespace-pre-wrap text-sm text-[#5b5473]">{data.instructions}</p>}
              <ul className="list-disc space-y-1 pl-5 text-sm text-[#5b5473]">
                <li>{data.questionCount} {behavioral ? 'situações' : 'perguntas de múltipla escolha'}.</li>
                {data.timeLimitMinutes ? <li>Você terá <strong>{data.timeLimitMinutes} minutos</strong> a partir do momento em que clicar em começar.</li> : <li>Sem limite de tempo.</li>}
                <li>Só pode ser enviado uma vez. Disponível até {new Date(data.expiresAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</li>
              </ul>
              <button type="button" className={primaryBtn} disabled={busy} onClick={start}>Começar agora</button>
            </section>
          )}
          {!done && data.status === 'STARTED' && items.length > 0 && (
            <>
              <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 border-b border-[#ebe6f3] bg-[#fbfafc]/95 px-4 py-2 text-sm backdrop-blur">
                <span>{answered} de {items.length} respondidas</span>
                {clock && <span className={`font-bold tabular-nums ${remaining !== null && remaining < 120_000 ? 'text-rose-700' : 'text-[#5b29be]'}`} aria-live="polite">⏱ {clock}</span>}
              </div>
              {behavioral && <Notice tone="info">Em cada situação, escolha a frase que <strong>mais parece com você</strong> no trabalho.</Notice>}
              {(() => {
                const item = items[Math.min(index, items.length - 1)];
                const last = index >= items.length - 1;
                const chosen = answers[item.id] !== undefined;
                return (
                  <>
                    <div className="h-2 overflow-hidden rounded-full bg-[#ebe6f3]" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={index + 1} aria-label="Progresso do teste"><div className="h-full rounded-full bg-[#7240da] transition-all" style={{ width: `${((index + 1) / items.length) * 100}%` }} /></div>
                    <section key={item.id} className={actionCard}>
                      <fieldset>
                        <legend className="mb-4 text-base font-bold leading-snug"><span className="block text-xs font-semibold uppercase tracking-wide text-[#7240da]">{behavioral ? 'Situação' : 'Pergunta'} {index + 1} de {items.length}</span>{item.title}</legend>
                        <div className="space-y-2">
                          {item.options.map((option) => (
                            <label key={option.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 text-sm transition ${answers[item.id] === option.value ? 'border-[#7240da] bg-[#f0eafa] font-semibold text-[#3b2a63]' : 'border-[#e4dcef] hover:bg-[#f8f5fd]'}`}>
                              <input type="radio" name={item.id} className="h-5 w-5 shrink-0 accent-[#7240da]" checked={answers[item.id] === option.value} onChange={() => setAnswers({ ...answers, [item.id]: option.value })} /> {option.text}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </section>
                    <div className="flex items-center gap-2">
                      <button type="button" className="min-h-12 rounded-[12px] border border-[#e4dcef] px-5 text-sm font-semibold disabled:opacity-40" disabled={index === 0} onClick={() => setIndex(index - 1)}>Voltar</button>
                      {last
                        ? <button type="button" className={`${primaryBtn} flex-1`} disabled={busy} onClick={submit}>{busy ? 'Enviando…' : 'Enviar respostas'}</button>
                        : <button type="button" className={`${primaryBtn} flex-1`} onClick={() => setIndex(index + 1)}>{chosen ? 'Próxima' : 'Pular por agora'}</button>}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </>
      )}
    </ActionShell>
  );
}
