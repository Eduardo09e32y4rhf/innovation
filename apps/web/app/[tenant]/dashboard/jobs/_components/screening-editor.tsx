'use client';

import { ArrowDown, ArrowUp, Check, Library, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Modal } from '@/app/components/ui';
import { applyLevels, applyNumberRules, IMPORTANCE, LEVELS, levelsOf, numberRulesOf, optionsOf, QUESTION_CATEGORIES, QUESTION_LIBRARY, questionFromLibrary, weightOf, weightShares, type Level } from '../job-library';
import { QUESTION_TYPE_LABEL, type Question, type QuestionType } from '../types';
import { Field, inputClass } from './bits';

const num = (value: string) => (value.trim() === '' ? undefined : Number(value.replace(',', '.')));

/** Uma pergunta: texto, tipo, importancia (com % da nota) e o valor de cada resposta (Ideal ... Elimina). */
function QuestionCard({ question, index, total, share, eliminate, onChange, onRemove, onMove }: {
  question: Question; index: number; total: number; share: number; eliminate: 'FLAG' | 'REJECT';
  onChange: (next: Question) => void; onRemove: () => void; onMove: (delta: -1 | 1) => void;
}) {
  const [optionsText, setOptionsText] = useState(question.options.join('\n'));
  const weight = weightOf(question);
  const hasOptions = ['SELECT', 'MULTI', 'YESNO'].includes(question.type);
  const levels = levelsOf(question);
  const options = optionsOf(question);
  const numberRules = numberRulesOf(question);
  // Peso 0 + regras: guardamos o peso escolhido mesmo sem regra, para nao perder a escolha ao trocar de opcao.
  const setLevels = (next: Record<string, Level>, nextWeight: number = weight) => onChange(applyLevels(question, next, nextWeight, eliminate));
  const setWeight = (next: number) => {
    if (question.type === 'NUMBER') onChange(applyNumberRules(question, next, numberRules.ideal, numberRules.accept, eliminate));
    else setLevels(Object.keys(levels).length ? levels : Object.fromEntries(options.map((option) => [option, 0 as Level])), next);
  };

  return (
    <li className="space-y-3 rounded-2xl border border-border bg-bg p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-bold text-purple-700">{index + 1}</span>
        <div className="grid flex-1 gap-3 md:grid-cols-[1fr_200px]">
          <Field label="Pergunta" required><input className={inputClass} value={question.label} maxLength={300} placeholder="Ex.: Você possui CNH categoria B?" onChange={(event) => onChange({ ...question, label: event.target.value })} /></Field>
          <Field label="Tipo de resposta">
            <select className={inputClass} value={question.type} onChange={(event) => { setOptionsText(''); onChange({ ...question, type: event.target.value as QuestionType, options: [], knockout: null, scoreRule: null }); }}>
              {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex shrink-0 flex-col">
          <button type="button" className="btn-icon" aria-label="Mover para cima" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={16} /></button>
          <button type="button" className="btn-icon" aria-label="Mover para baixo" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown size={16} /></button>
        </div>
      </div>

      {['SELECT', 'MULTI'].includes(question.type) && (
        <Field label="Opções de resposta" hint="Uma por linha (mínimo 2).">
          <textarea className={`${inputClass} min-h-20`} value={optionsText} onChange={(event) => {
            setOptionsText(event.target.value);
            const next = event.target.value.split('\n').map((line) => line.trim()).filter(Boolean);
            onChange(applyLevels({ ...question, options: next }, Object.fromEntries(next.map((option) => [option, levels[option] ?? 0])), weight, eliminate));
          }} />
        </Field>
      )}

      {(hasOptions || question.type === 'NUMBER') && (
        <div className="space-y-3">
          <Field className="max-w-sm" label="Peso na nota" hint={weight ? `Esta pergunta vale ${share}% da nota da triagem.` : 'Não conta na nota (só informativa ou eliminatória).'}>
            <select className={inputClass} value={weight} onChange={(event) => setWeight(Number(event.target.value))}>
              {IMPORTANCE.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          {hasOptions && options.length >= 2 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-fg">Quanto vale cada resposta</p>
              <ul className="space-y-1.5">
                {options.map((option) => (
                  <li key={option} className="flex flex-col gap-1.5 rounded-xl bg-bg-sub/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-fg">{option}</span>
                    <div className="flex flex-wrap gap-1 sm:flex-nowrap" role="radiogroup" aria-label={`Valor da resposta ${option}`}>
                      {LEVELS.map((level) => {
                        const on = (levels[option] ?? 0) === level.value;
                        const disabled = level.value !== 'X' && !weight;
                        return (
                          <button key={String(level.value)} type="button" role="radio" aria-checked={on} disabled={disabled}
                            title={disabled ? 'Escolha um peso para pontuar' : undefined}
                            className={`min-h-8 rounded-lg border px-2 text-xs font-semibold transition disabled:opacity-40 ${on ? level.tone : 'border-border text-fg-sub hover:bg-bg-sub'}`}
                            onClick={() => setLevels({ ...levels, [option]: level.value })}>{level.short}{on && level.value !== 'X' ? ` ${level.value}%` : ''}</button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasOptions && options.length < 2 && <p className="self-center text-sm text-amber-700">Adicione as opções para definir o valor de cada resposta.</p>}
          {question.type === 'NUMBER' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <fieldset className="rounded-xl bg-emerald-50/60 p-2"><legend className="px-1 text-xs font-semibold text-emerald-800">Vale 100% entre</legend>
                <div className="flex items-center gap-1"><input aria-label="Ideal a partir de" className={inputClass} inputMode="decimal" placeholder="mín." disabled={!weight} value={numberRules.ideal.min ?? ''} onChange={(event) => onChange(applyNumberRules(question, weight, { ...numberRules.ideal, min: num(event.target.value) }, numberRules.accept, eliminate))} /><span className="text-xs">e</span><input aria-label="Ideal até" className={inputClass} inputMode="decimal" placeholder="máx." disabled={!weight} value={numberRules.ideal.max ?? ''} onChange={(event) => onChange(applyNumberRules(question, weight, { ...numberRules.ideal, max: num(event.target.value) }, numberRules.accept, eliminate))} /></div>
              </fieldset>
              <fieldset className="rounded-xl bg-rose-50/60 p-2"><legend className="px-1 text-xs font-semibold text-rose-800">Elimina fora de</legend>
                <div className="flex items-center gap-1"><input aria-label="Aceita a partir de" className={inputClass} inputMode="decimal" placeholder="mín." value={numberRules.accept.min ?? ''} onChange={(event) => onChange(applyNumberRules(question, weight, numberRules.ideal, { ...numberRules.accept, min: num(event.target.value) }, eliminate))} /><span className="text-xs">a</span><input aria-label="Aceita até" className={inputClass} inputMode="decimal" placeholder="máx." value={numberRules.accept.max ?? ''} onChange={(event) => onChange(applyNumberRules(question, weight, numberRules.ideal, { ...numberRules.accept, max: num(event.target.value) }, eliminate))} /></div>
              </fieldset>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={question.required} onChange={(event) => onChange({ ...question, required: event.target.checked })} /> Resposta obrigatória</label>
        <button type="button" className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-rose-700" onClick={onRemove}><Trash2 size={15} aria-hidden="true" /> Remover</button>
      </div>
    </li>
  );
}

/** Biblioteca: perguntas prontas por assunto, ja com as regras. Sugeridas para o cargo aparecem primeiro. */
function LibraryDialog({ isOpen, suggested, existing, onClose, onAdd }: { isOpen: boolean; suggested: string[]; existing: string[]; onClose: () => void; onAdd: (keys: string[]) => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const has = (label: string) => existing.some((item) => item.trim().toLowerCase() === label.toLowerCase());
  const groups = useMemo(() => [
    ...(suggested.length ? [{ title: 'Sugeridas para este cargo', items: QUESTION_LIBRARY.filter((item) => suggested.includes(item.key)) }] : []),
    ...QUESTION_CATEGORIES.map((category) => ({ title: category, items: QUESTION_LIBRARY.filter((item) => item.category === category && !suggested.includes(item.key)) })),
  ], [suggested]);
  const toggle = (key: string) => setPicked((previous) => { const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Perguntas prontas" description="Marque as que quiser. Elas já vêm com o valor de cada resposta e o que elimina; você pode ajustar depois." maxWidth="max-w-2xl">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        {groups.map((group) => group.items.length > 0 && (
          <section key={group.title}>
            <h3 className={`mb-1.5 text-xs font-bold uppercase tracking-wide ${group.title.startsWith('Sugeridas') ? 'text-purple-700' : 'text-fg-mut'}`}>{group.title}</h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const already = has(item.label);
                return (
                  <li key={item.key}>
                    <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm ${picked.has(item.key) ? 'border-purple-400 bg-purple-50' : 'border-border hover:bg-bg-sub'} ${already ? 'opacity-50' : ''}`}>
                      <input type="checkbox" className="mt-0.5 h-4 w-4" disabled={already} checked={picked.has(item.key)} onChange={() => toggle(item.key)} />
                      <span className="flex-1"><span className="font-medium text-fg">{item.label}</span>
                        <span className="block text-xs text-fg-sub">{QUESTION_TYPE_LABEL[item.type]}{item.options?.length ? ` · ${item.options.join(' / ')}` : item.type === 'YESNO' ? ' · Sim / Não' : ''}{Object.values(item.levels ?? {}).includes('X') ? ' · tem resposta eliminatória' : ''}{already ? ' · já adicionada' : ''}</span></span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!picked.size} onClick={() => { onAdd([...picked]); setPicked(new Set()); }}><Check size={15} aria-hidden="true" /> Adicionar {picked.size || ''}</Button></div>
    </Modal>
  );
}

/**
 * Triagem: perguntas prontas ou proprias; cada uma com peso e valor por resposta. A nota do candidato fica sempre
 * de 0 a 100% e a nota minima corta quem fica abaixo.
 */
export function ScreeningEditor({ questions, suggested, minScore, action, onChange, onMinScore, onAction }: {
  questions: Question[]; suggested: string[]; minScore: number | null; action: 'FLAG' | 'REJECT';
  onChange: (next: Question[]) => void; onMinScore: (value: number | null) => void; onAction: (value: 'FLAG' | 'REJECT') => void;
}) {
  const [keys, setKeys] = useState<string[]>(() => questions.map(() => crypto.randomUUID()));
  const [library, setLibrary] = useState(false);
  const keyList = questions.map((_, index) => keys[index] ?? `q-${index}`);
  const shares = weightShares(questions);
  const scored = shares.some((share) => share > 0);
  const eliminating = questions.filter((question) => question.knockout).length;

  const setAll = (next: Question[], nextKeys = keyList) => { setKeys(nextKeys); onChange(next); };
  const add = (items: Question[]) => setAll([...questions, ...items], [...keyList, ...items.map(() => crypto.randomUUID())]);
  const changeAction = (value: 'FLAG' | 'REJECT') => {
    onAction(value);
    // O que acontece com a resposta eliminatoria vale para todas as perguntas da vaga.
    onChange(questions.map((question) => (question.knockout ? { ...question, knockout: { ...question.knockout, action: value } } : question)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setLibrary(true)}><Library size={16} aria-hidden="true" /> Perguntas prontas</Button>
        {suggested.length > 0 && questions.length === 0 && <Button variant="outline" onClick={() => add(suggested.map((key) => questionFromLibrary(key, action)))}><Sparkles size={16} aria-hidden="true" /> Usar as sugeridas para o cargo ({suggested.length})</Button>}
        <Button variant="ghost" onClick={() => add([{ label: '', type: 'YESNO', required: true, options: [], knockout: null, scoreRule: null }])} disabled={questions.length >= 30}><Plus size={16} aria-hidden="true" /> Criar pergunta própria</Button>
      </div>

      {questions.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-sub">Sem perguntas extras: o candidato envia só nome, contato e currículo. Use as perguntas prontas para filtrar automaticamente.</p>}

      <ul className="space-y-3">
        {questions.map((question, index) => (
          <QuestionCard key={keyList[index]} question={question} index={index} total={questions.length} share={shares[index]} eliminate={action}
            onChange={(next) => onChange(questions.map((item, i) => (i === index ? next : item)))}
            onRemove={() => setAll(questions.filter((_, i) => i !== index), keyList.filter((_, i) => i !== index))}
            onMove={(delta) => {
              const target = index + delta;
              const next = [...questions]; const nextKeys = [...keyList];
              [next[index], next[target]] = [next[target], next[index]];
              [nextKeys[index], nextKeys[target]] = [nextKeys[target], nextKeys[index]];
              setAll(next, nextKeys);
            }} />
        ))}
      </ul>

      {questions.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
          <h3 className="font-semibold text-fg">Corte da triagem</h3>
          {scored ? (
            <>
              <p className="text-sm text-fg-sub">A nota do candidato vai de 0 a 100% (as perguntas com peso somam 100%). Defina a nota mínima para seguir no processo:</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Nota mínima">
                {[null, 40, 50, 60, 70, 80].map((value) => (
                  <button key={String(value)} type="button" role="radio" aria-checked={minScore === value} onClick={() => onMinScore(value)}
                    className={`min-h-10 rounded-xl border px-3 text-sm font-semibold ${minScore === value ? 'border-purple-600 bg-purple-600 text-white' : 'border-border bg-bg text-fg-sub hover:bg-bg-sub'}`}>{value === null ? 'Sem nota mínima' : `${value}%`}</button>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-fg-sub">Nenhuma pergunta tem peso, então não há nota. Dê peso às perguntas que devem pontuar.</p>}
          {(eliminating > 0 || (scored && minScore)) && (
            <Field label="Quem não passar (resposta eliminatória ou abaixo da nota mínima)">
              <select className={inputClass} value={action} onChange={(event) => changeAction(event.target.value as 'FLAG' | 'REJECT')}>
                <option value="REJECT">Reprovar automaticamente (o candidato recebe um retorno educado 24h depois)</option>
                <option value="FLAG">Só marcar como "fora do critério" (o RH decide)</option>
              </select>
            </Field>
          )}
          <p className="text-xs text-fg-sub">{questions.length} pergunta(s) · {shares.filter((share) => share > 0).length} com peso · {eliminating} com resposta eliminatória</p>
        </section>
      )}

      <LibraryDialog isOpen={library} suggested={suggested} existing={questions.map((question) => question.label)} onClose={() => setLibrary(false)} onAdd={(picked) => { add(picked.map((key) => questionFromLibrary(key, action))); setLibrary(false); }} />
    </div>
  );
}
