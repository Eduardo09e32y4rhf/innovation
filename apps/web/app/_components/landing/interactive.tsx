'use client';

import { Check, Clock3, MapPin, PartyPopper, RotateCcw, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Palavra que troca sozinha no título. */
export function RotatingWord({ words }: { words: readonly string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % words.length), 2200);
    return () => window.clearInterval(timer);
  }, [words.length]);
  return <span key={index} className="lp-pop lp-text-warm inline-block">{words[index]}</span>;
}

const STAGES = ['Triagem', 'Entrevista', 'Proposta', 'Contratado'] as const;
const START: { name: string; role: string; stage: number }[] = [
  { name: 'Marina', role: 'Analista de RH', stage: 0 },
  { name: 'Rafael', role: 'Atendente', stage: 0 },
  { name: 'Joana', role: 'Analista de RH', stage: 1 },
  { name: 'Caio', role: 'Atendente', stage: 2 },
];
const AVATAR = ['bg-fuchsia-400', 'bg-amber-400', 'bg-sky-400', 'bg-emerald-400', 'bg-rose-400'];

/** Funil de vagas de verdade: clique para avançar cada pessoa pelas etapas. */
export function VagasBoard() {
  const [people, setPeople] = useState(START);
  const [burst, setBurst] = useState(0);
  const hired = people.filter((p) => p.stage === STAGES.length - 1).length;

  const advance = (name: string) => setPeople((list) => list.map((p) => {
    if (p.name !== name || p.stage >= STAGES.length - 1) return p;
    if (p.stage + 1 === STAGES.length - 1) setBurst((b) => b + 1);
    return { ...p, stage: p.stage + 1 };
  }));
  const addPerson = () => setPeople((list) => [...list, { name: ['Bia', 'Lucas', 'Paula', 'Davi', 'Lia'][list.length % 5], role: 'Nova candidatura', stage: 0 }]);

  return (
    <div className="rounded-3xl border border-white/15 bg-[#120a2e]/80 p-4 shadow-2xl backdrop-blur sm:p-6" role="group" aria-label="Funil de vagas interativo">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white/90">Toque em um nome para avançar a pessoa no funil</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={addPerson} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold hover:bg-white/20"><UserPlus size={14} aria-hidden="true" /> Nova candidatura</button>
          <button type="button" onClick={() => { setPeople(START); setBurst(0); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold hover:bg-white/20"><RotateCcw size={14} aria-hidden="true" /> Reiniciar</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAGES.map((stage, s) => (
          <div key={stage} className={`min-h-40 rounded-2xl p-3 ${s === STAGES.length - 1 ? 'bg-emerald-400/10 ring-1 ring-emerald-300/30' : 'bg-white/5'}`}>
            <p className={`mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider ${s === STAGES.length - 1 ? 'text-emerald-300' : 'text-purple-200'}`}>{stage}<span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">{people.filter((p) => p.stage === s).length}</span></p>
            <div className="space-y-2">
              {people.map((p, i) => p.stage === s && (
                <button key={p.name} type="button" disabled={s === STAGES.length - 1} onClick={() => advance(p.name)}
                  className="lp-pop flex w-full items-center gap-2.5 rounded-xl bg-white/10 px-2.5 py-2 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:bg-white/20 disabled:cursor-default">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#1e1b4b] ${AVATAR[i % AVATAR.length]}`}>{p.name[0]}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="block truncate text-[11px] text-white/55">{p.role}</span></span>
                  {s === STAGES.length - 1 && <Check size={16} className="ml-auto shrink-0 text-emerald-300" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p key={burst} aria-live="polite" className={`mt-4 flex items-center justify-center gap-2 text-sm font-semibold ${hired ? 'lp-pop text-emerald-300' : 'text-white/50'}`}>
        <PartyPopper size={16} aria-hidden="true" />{hired ? `${hired} contratação${hired > 1 ? 'ões' : ''} fechada${hired > 1 ? 's' : ''}! 🎉` : 'Nenhuma contratação ainda — avance alguém até o fim'}
      </p>
      <p className="mt-2 text-center text-[10px] text-white/40">Exemplo ilustrativo, com nomes fictícios</p>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** Ponto com relógio ao vivo: registra e mostra o comprovante na hora. */
export function PontoDemo() {
  const [now, setNow] = useState<Date | null>(null);
  const [marks, setMarks] = useState<string[]>([]);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const labels = ['Entrada', 'Intervalo', 'Retorno', 'Saída'];
  const next = marks.length;
  const done = next >= labels.length;

  return (
    <div className="rounded-3xl border border-white/15 bg-[#120a2e]/80 p-5 shadow-2xl backdrop-blur" role="group" aria-label="Ponto interativo">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-purple-300">Agora</p>
      <p className="mt-1 text-center text-5xl font-extrabold tabular-nums" suppressHydrationWarning>{now ? fmt(now) : '--:--:--'}</p>
      <div className="relative mx-auto mt-5 w-fit">
        {!done && <span className="lp-ring absolute inset-0 rounded-xl bg-fuchsia-500/60" aria-hidden="true" />}
        <button type="button" onClick={() => done ? setMarks([]) : setMarks((m) => [...m, fmt(new Date())])}
          className="relative inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-7 text-sm font-bold shadow-lg transition hover:scale-105 active:scale-95">
          {done ? <><RotateCcw size={16} aria-hidden="true" /> Recomeçar</> : <><Clock3 size={16} aria-hidden="true" /> Registrar {labels[next].toLowerCase()}</>}
        </button>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-300"><MapPin size={13} aria-hidden="true" /> Localização conferida com a cerca da unidade</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {labels.map((label, i) => (
          <li key={label} className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${marks[i] ? 'lp-pop bg-emerald-400/15' : 'bg-white/5'}`}>
            <span className="text-white/70">{label}</span>
            <span className={`font-semibold tabular-nums ${marks[i] ? 'text-emerald-300' : 'text-white/30'}`}>{marks[i] ?? '--:--'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-[10px] text-white/40">Demonstração: nada é gravado</p>
    </div>
  );
}
