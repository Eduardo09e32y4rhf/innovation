'use client';

import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/components/ui';
import { Field, inputClass, Pill } from './bits';
import { QUESTION_TYPE_LABEL, type Question, type QuestionType } from '../types';

const OPTION_TYPES: QuestionType[] = ['SELECT', 'MULTI', 'YESNO'];

export const emptyQuestion = (): Question => ({ label: '', type: 'TEXT', required: false, options: [] });

function optionsOf(question: Question) {
  return question.type === 'YESNO' ? ['Sim', 'Não'] : question.options;
}

function QuestionRow({
  question, index, total, onChange, onRemove, onMove,
}: {
  question: Question; index: number; total: number;
  onChange: (next: Question) => void; onRemove: () => void; onMove: (delta: -1 | 1) => void;
}) {
  const [optionsText, setOptionsText] = useState(question.options.join('\n'));
  const [open, setOpen] = useState(Boolean(question.knockout || question.scoreRule));
  const options = optionsOf(question);
  const hasOptions = OPTION_TYPES.includes(question.type);
  const accepted = new Set(question.knockout?.acceptValues ?? []);
  const points = question.scoreRule?.points ?? {};
  const hasRules = Boolean(question.knockout || question.scoreRule);

  function patch(next: Partial<Question>) {
    onChange({ ...question, ...next });
  }

  function setAccepted(option: string, checked: boolean) {
    const next = new Set(accepted);
    if (checked) next.add(option); else next.delete(option);
    patch({ knockout: next.size ? { ...question.knockout, acceptValues: [...next], action: question.knockout?.action ?? 'FLAG' } : null });
  }

  function setPoints(option: string, value: string) {
    const next = { ...points };
    if (value === '' || Number(value) === 0) delete next[option]; else next[option] = Number(value);
    patch({ scoreRule: Object.keys(next).length ? { points: next } : null });
  }

  const range = question.scoreRule?.ranges?.[0];

  return (
    <li className="space-y-3 rounded-xl border border-border bg-bg-elev p-4">
      <div className="flex items-start gap-2">
        <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-semibold text-purple-700">{index + 1}</span>
        <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_190px]">
          <Field label="Pergunta" required>
            <input className={inputClass} value={question.label} maxLength={300} placeholder="Ex.: Você possui CNH categoria B?" onChange={(event) => patch({ label: event.target.value })} />
          </Field>
          <Field label="Tipo de resposta">
            <select className={inputClass} value={question.type} onChange={(event) => patch({ type: event.target.value as QuestionType, knockout: null, scoreRule: null })}>
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
        <Field label="Opções" hint="Uma opção por linha (mínimo 2).">
          <textarea className={`${inputClass} min-h-24`} value={optionsText} onChange={(event) => {
            setOptionsText(event.target.value);
            patch({ options: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean), knockout: null, scoreRule: null });
          }} />
        </Field>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={question.required} onChange={(event) => patch({ required: event.target.checked })} /> Resposta obrigatória</label>
        <div className="flex items-center gap-2">
          {hasRules && <Pill tone="brand">Regras ativas</Pill>}
          {(hasOptions || question.type === 'NUMBER') && (
            <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
              Regras do RH <ChevronDown size={14} className={open ? 'rotate-180' : ''} aria-hidden="true" />
            </button>
          )}
          <button type="button" className="btn-icon text-rose-600" aria-label="Remover pergunta" onClick={onRemove}><Trash2 size={16} /></button>
        </div>
      </div>

      {open && hasOptions && (
        <div className="space-y-3 rounded-lg bg-bg-sub p-3">
          <p className="text-xs text-fg-sub">Defina quais respostas são aceitas (as demais sinalizam ou eliminam) e quantos pontos cada opção vale. Tudo é opcional e visível para você na triagem.</p>
          {options.length < 2 ? <p className="text-sm text-amber-700">Adicione as opções acima para configurar as regras.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-fg-sub"><th className="py-1 font-medium">Opção</th><th className="py-1 font-medium">Aceita</th><th className="py-1 font-medium">Pontos</th></tr></thead>
              <tbody>
                {options.map((option) => (
                  <tr key={option}>
                    <td className="py-1 pr-2">{option}</td>
                    <td className="py-1"><input type="checkbox" aria-label={`Aceitar ${option}`} checked={accepted.has(option)} onChange={(event) => setAccepted(option, event.target.checked)} /></td>
                    <td className="py-1"><input type="number" className="input-v2 w-24" aria-label={`Pontos de ${option}`} value={points[option] ?? ''} onChange={(event) => setPoints(option, event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {accepted.size > 0 && (
            <Field label="Quando a resposta não for aceita">
              <select className={inputClass} value={question.knockout?.action ?? 'FLAG'} onChange={(event) => patch({ knockout: { ...question.knockout, acceptValues: [...accepted], action: event.target.value as 'FLAG' | 'REJECT' } })}>
                <option value="FLAG">Apenas sinalizar o candidato como "fora do critério"</option>
                <option value="REJECT">Mover automaticamente para Reprovado</option>
              </select>
            </Field>
          )}
        </div>
      )}

      {open && question.type === 'NUMBER' && (
        <div className="grid gap-3 rounded-lg bg-bg-sub p-3 sm:grid-cols-2">
          <Field label="Valor mínimo aceito">
            <input type="number" className={inputClass} value={question.knockout?.min ?? ''} onChange={(event) => {
              const min = event.target.value === '' ? undefined : Number(event.target.value);
              const next = { ...question.knockout, min, action: question.knockout?.action ?? 'FLAG' };
              patch({ knockout: next.min === undefined && next.max === undefined ? null : next });
            }} />
          </Field>
          <Field label="Valor máximo aceito">
            <input type="number" className={inputClass} value={question.knockout?.max ?? ''} onChange={(event) => {
              const max = event.target.value === '' ? undefined : Number(event.target.value);
              const next = { ...question.knockout, max, action: question.knockout?.action ?? 'FLAG' };
              patch({ knockout: next.min === undefined && next.max === undefined ? null : next });
            }} />
          </Field>
          {question.knockout && (
            <Field label="Fora do critério" className="sm:col-span-2">
              <select className={inputClass} value={question.knockout.action ?? 'FLAG'} onChange={(event) => patch({ knockout: { ...question.knockout, action: event.target.value as 'FLAG' | 'REJECT' } })}>
                <option value="FLAG">Apenas sinalizar</option>
                <option value="REJECT">Mover automaticamente para Reprovado</option>
              </select>
            </Field>
          )}
          <Field label="A partir de (valor)">
            <input type="number" className={inputClass} value={range?.min ?? ''} onChange={(event) => {
              const min = event.target.value === '' ? undefined : Number(event.target.value);
              patch({ scoreRule: min === undefined ? null : { ranges: [{ min, points: range?.points ?? 0 }] } });
            }} />
          </Field>
          <Field label="Somar pontos">
            <input type="number" className={inputClass} value={range?.points ?? ''} onChange={(event) => {
              if (range?.min === undefined) return;
              patch({ scoreRule: { ranges: [{ min: range.min, points: Number(event.target.value) || 0 }] } });
            }} />
          </Field>
        </div>
      )}
    </li>
  );
}

export function QuestionEditor({ questions, onChange }: { questions: Question[]; onChange: (next: Question[]) => void }) {
  const [keys, setKeys] = useState<string[]>(() => questions.map(() => crypto.randomUUID()));
  const keyList = questions.map((_, index) => keys[index] ?? `new-${index}`);

  function update(index: number, next: Question) { onChange(questions.map((item, i) => (i === index ? next : item))); }
  function remove(index: number) { setKeys(keyList.filter((_, i) => i !== index)); onChange(questions.filter((_, i) => i !== index)); }
  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions]; const nextKeys = [...keyList];
    [next[index], next[target]] = [next[target], next[index]];
    [nextKeys[index], nextKeys[target]] = [nextKeys[target], nextKeys[index]];
    setKeys(nextKeys); onChange(next);
  }
  function add() { setKeys([...keyList, crypto.randomUUID()]); onChange([...questions, emptyQuestion()]); }

  return (
    <div className="space-y-3">
      {questions.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-fg-sub">Nenhuma pergunta extra. O candidato informará apenas nome, e-mail, telefone, LinkedIn, apresentação e currículo.</p>}
      <ul className="space-y-3">
        {questions.map((question, index) => (
          <QuestionRow key={keyList[index]} question={question} index={index} total={questions.length}
            onChange={(next) => update(index, next)} onRemove={() => remove(index)} onMove={(delta) => move(index, delta)} />
        ))}
      </ul>
      <Button variant="outline" onClick={add} disabled={questions.length >= 30}><Plus size={16} aria-hidden="true" /> Adicionar pergunta</Button>
    </div>
  );
}
