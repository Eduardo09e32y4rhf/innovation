'use client';

import { Check, Clock3, MapPin } from 'lucide-react';
import { Fragment, useState } from 'react';

const TABS = [
  { id: 'ponto', label: 'Ponto', title: 'Bata o ponto onde estiver — com local e hora do servidor', points: ['Botão único, sem aplicativo e sem reconhecimento facial', 'Cerca virtual por unidade, com política da empresa', 'Comprovante e histórico de cada batida'] },
  { id: 'escalas', label: 'Escalas', title: 'Escala, trocas e aprovações na mesma tela', points: ['Modelos 5x2, 6x1, 12x36 e ciclos personalizados', 'Funcionário pede troca ou ajuste; o gestor aprova ou reprova', 'Alertas de conflito antes de publicar'] },
  { id: 'folha', label: 'Folha', title: 'Fechamento com as regras que a sua empresa define', points: ['Horas, adicionais e encargos conforme as regras cadastradas', 'Conferência por funcionário antes de fechar', 'Relatórios em PDF em um clique'] },
  { id: 'vagas', label: 'Vagas', title: 'Recrutamento com o funil do seu RH', points: ['Etapas, perguntas e filtros configurados pelo RH', 'Portal de carreiras com envio de currículo', 'Triagem sem depender de IA'] },
] as const;

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-[#120a2e]/80 p-4 shadow-2xl backdrop-blur sm:p-5" role="img" aria-label={label}>
      <div className="mb-4 flex items-center gap-1.5" aria-hidden="true"><i className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><i className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /><span className="ml-3 h-4 w-40 rounded bg-white/10" /></div>
      {children}
      <p className="mt-4 text-[10px] text-white/40">Exemplo ilustrativo</p>
    </div>
  );
}

function PontoMock() {
  return (
    <Frame label="Exemplo da tela de ponto">
      <div className="grid gap-4 sm:grid-cols-[1fr_1.1fr]">
        <div className="rounded-xl bg-white/5 p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-purple-300">Agora</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">08:00<span className="text-purple-300">:12</span></p>
          <div className="relative mx-auto mt-4 w-fit">
            <span className="lp-ring absolute inset-0 rounded-xl bg-purple-500/60" aria-hidden="true" />
            <span className="relative inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-brand)] px-6 text-sm font-semibold"><Clock3 size={16} aria-hidden="true" /> Registrar entrada</span>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-300"><MapPin size={13} aria-hidden="true" /> Dentro da cerca da unidade</p>
        </div>
        <div className="space-y-2 text-sm">
          {[['Entrada', '08:00'], ['Intervalo', '12:00'], ['Retorno', '13:00'], ['Saída', '17:00']].map(([k, v], i) => (
            <div key={k} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5"><span className="text-white/70">{k}</span><span className={`font-semibold tabular-nums ${i === 0 ? 'text-emerald-300' : 'text-white/50'}`}>{i === 0 ? v : `${v} previsto`}</span></div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function EscalasMock() {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const rows: [string, string[]][] = [['Ana', ['M', 'M', 'M', 'M', 'M', '–', '–']], ['Bruno', ['T', 'T', '–', 'T', 'T', 'T', '–']], ['Carla', ['N', '–', 'N', 'N', '–', 'N', 'N']]];
  const tone: Record<string, string> = { M: 'bg-sky-400/25 text-sky-200', T: 'bg-purple-400/25 text-purple-200', N: 'bg-indigo-400/30 text-indigo-200', '–': 'bg-white/5 text-white/30' };
  return (
    <Frame label="Exemplo da grade de escalas">
      <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-1.5 text-center text-xs">
        <span />{days.map((d) => <span key={d} className="text-white/50">{d}</span>)}
        {rows.map(([name, cells]) => (<Fragment key={name}><span className="self-center text-left text-white/80">{name}</span>{cells.map((c, i) => <span key={`${name}-${i}`} className={`rounded-md py-2 font-semibold ${tone[c]}`}>{c}</span>)}</Fragment>))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2.5 text-sm">
        <span>Bruno pediu troca de folga (Qua → Sáb)</span>
        <span className="flex gap-2"><span className="rounded-md bg-emerald-400/90 px-2.5 py-1 text-xs font-semibold text-emerald-950">Aprovar</span><span className="rounded-md bg-white/10 px-2.5 py-1 text-xs">Reprovar</span></span>
      </div>
    </Frame>
  );
}

function FolhaMock() {
  const lines: [string, number][] = [['Salário base', 100], ['Horas extras', 34], ['Adicional noturno', 18], ['Descontos', 26]];
  return (
    <Frame label="Exemplo do fechamento da folha">
      <div className="space-y-3">
        {lines.map(([label, pct], i) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs text-white/70"><span>{label}</span><span>{i === 3 ? '−' : '+'}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className={`lp-bar h-full rounded-full ${i === 3 ? 'bg-rose-400' : 'bg-gradient-to-r from-purple-400 to-sky-300'}`} style={{ width: `${pct}%`, animationDelay: `${i * 120}ms` }} /></div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-200"><span className="flex items-center gap-2"><Check size={16} aria-hidden="true" /> Conferência concluída</span><span className="rounded-md bg-white/10 px-2.5 py-1 text-xs">Baixar PDF</span></div>
    </Frame>
  );
}

function VagasMock() {
  const cols: [string, string[]][] = [['Triagem', ['Maria S.', 'João P.']], ['Entrevista', ['Lia C.']], ['Proposta', ['Davi R.']]];
  return (
    <Frame label="Exemplo do funil de vagas">
      <div className="grid grid-cols-3 gap-2">
        {cols.map(([name, cards]) => (
          <div key={name} className="rounded-lg bg-white/5 p-2"><p className="mb-2 text-xs font-semibold text-purple-200">{name}</p>
            <div className="space-y-1.5">{cards.map((c) => <p key={c} className="rounded-md bg-white/10 px-2 py-2 text-xs">{c}</p>)}</div></div>
        ))}
      </div>
    </Frame>
  );
}

const MOCKS = { ponto: PontoMock, escalas: EscalasMock, folha: FolhaMock, vagas: VagasMock };

export function Showcase() {
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('ponto');
  const tab = TABS.find((t) => t.id === active)!;
  const Mock = MOCKS[active];
  return (
    <div>
      <div role="tablist" aria-label="Módulos" className="mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-white/15 bg-white/5 p-1">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={active === t.id} onClick={() => setActive(t.id)}
            className={`min-h-10 whitespace-nowrap rounded-lg px-5 text-sm font-semibold transition ${active === t.id ? 'bg-white text-[var(--color-brand-800)]' : 'text-white/75 hover:bg-white/10'}`}>{t.label}</button>
        ))}
      </div>
      <div key={active} role="tabpanel" className="lp-pop mt-10 grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{tab.title}</h3>
          <ul className="mt-5 space-y-3">{tab.points.map((p) => <li key={p} className="flex items-start gap-3 text-white/80"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-400/30 text-purple-200"><Check size={13} aria-hidden="true" /></span>{p}</li>)}</ul>
        </div>
        <Mock />
      </div>
    </div>
  );
}
