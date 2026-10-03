'use client';

import { AlertTriangle, Star } from 'lucide-react';
import { useState } from 'react';
import type { ApplicationItem, Pipeline } from '../types';
import { daysSince } from '../types';
import { Pill, TagChip } from './bits';

function CandidateCard({ app, onOpen, dragging, onDragStart, onDragEnd, selected, onToggle }: {
  app: ApplicationItem; onOpen: () => void; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; selected: boolean; onToggle: () => void;
}) {
  return (
    <article draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      className={`space-y-2 rounded-lg border bg-bg-elev p-3 shadow-sm ${dragging ? 'opacity-40' : ''} ${selected ? 'border-purple-500 ring-1 ring-purple-300' : 'border-border'}`}>
      <div className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" aria-label={`Selecionar ${app.candidate?.name}`} checked={selected} onChange={onToggle} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-fg">{app.candidate?.name}</p>
          <p className="truncate text-xs text-fg-sub">{app.candidate?.email}</p>
        </button>
        {app.favorite && <Star size={15} className="shrink-0 fill-amber-400 text-amber-500" aria-label="Favorito" />}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {app.score !== null && <Pill tone="info">{app.score} pts</Pill>}
        {app.evaluationScore !== null && <Pill tone="brand">★ {app.evaluationScore}</Pill>}
        {app.knockedOut && <Pill tone="danger"><AlertTriangle size={11} aria-hidden="true" /> Fora do critério</Pill>}
        {app.tags.slice(0, 3).map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
      </div>
      <p className="text-[11px] text-fg-sub">{daysSince(app.stageMovedAt)} dia(s) nesta etapa</p>
    </article>
  );
}

export function KanbanBoard({ pipeline, applications, selectedIds, onToggle, onOpen, onDrop }: {
  pipeline: Pipeline; applications: ApplicationItem[]; selectedIds: Set<string>;
  onToggle: (id: string) => void; onOpen: (id: string) => void; onDrop: (applicationId: string, stageId: string) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-3" role="list" aria-label="Funil de candidatos">
      {pipeline.stages.map((stage) => {
        const items = applications.filter((app) => app.stageId === stage.id);
        return (
          <section key={stage.id} role="listitem" aria-label={stage.name}
            onDragOver={(event) => { event.preventDefault(); setOver(stage.id); }} onDragLeave={() => setOver(null)}
            onDrop={(event) => { event.preventDefault(); setOver(null); if (dragging) onDrop(dragging, stage.id); setDragging(null); }}
            className={`flex w-[290px] shrink-0 flex-col rounded-xl border bg-bg-sub p-2 ${over === stage.id ? 'border-purple-400' : 'border-border'}`}>
            <header className="flex items-center justify-between px-2 py-1.5">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />{stage.name}</h3>
              <span className="text-xs tabular-nums text-fg-sub">{items.length}</span>
            </header>
            <div className="max-h-[68vh] min-h-24 space-y-2 overflow-y-auto p-1">
              {items.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-fg-sub">Nenhum candidato</p>}
              {items.map((app) => (
                <CandidateCard key={app.id} app={app} dragging={dragging === app.id} selected={selectedIds.has(app.id)}
                  onDragStart={() => setDragging(app.id)} onDragEnd={() => setDragging(null)} onOpen={() => onOpen(app.id)} onToggle={() => onToggle(app.id)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function CandidatesTable({ pipeline, applications, selectedIds, onToggle, onToggleAll, onOpen, onStageChange }: {
  pipeline: Pipeline; applications: ApplicationItem[]; selectedIds: Set<string>;
  onToggle: (id: string) => void; onToggleAll: () => void; onOpen: (id: string) => void; onStageChange: (applicationId: string, stageId: string) => void;
}) {
  const allSelected = applications.length > 0 && applications.every((app) => selectedIds.has(app.id));
  return (
    <div className="card-v2 overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <caption className="sr-only">Candidatos da vaga</caption>
        <thead className="border-b border-border bg-bg-sub text-fg-sub">
          <tr>
            <th scope="col" className="w-10 px-3 py-3"><input type="checkbox" aria-label="Selecionar todos" checked={allSelected} onChange={onToggleAll} /></th>
            {['Candidato', 'Etapa', 'Pontos', 'Nota', 'Tags', 'Inscrição', ''].map((label) => <th key={label} scope="col" className="px-3 py-3 font-medium">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="border-b border-border last:border-0">
              <td className="px-3 py-3"><input type="checkbox" aria-label={`Selecionar ${app.candidate?.name}`} checked={selectedIds.has(app.id)} onChange={() => onToggle(app.id)} /></td>
              <th scope="row" className="px-3 py-3 font-medium">
                <button type="button" className="flex items-center gap-1.5 text-left hover:underline" onClick={() => onOpen(app.id)}>
                  {app.favorite && <Star size={13} className="fill-amber-400 text-amber-500" aria-label="Favorito" />}{app.candidate?.name}
                </button>
                <span className="block text-xs font-normal text-fg-sub">{app.candidate?.email}</span>
                {app.knockedOut && <span className="text-xs font-normal text-rose-600">Fora do critério</span>}
              </th>
              <td className="px-3 py-3">
                <select aria-label={`Etapa de ${app.candidate?.name}`} className="input-v2 text-sm" value={app.stageId ?? ''} disabled={app.status === 'HIRED'} onChange={(event) => onStageChange(app.id, event.target.value)}>
                  {pipeline.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                </select>
              </td>
              <td className="px-3 py-3 tabular-nums">{app.score ?? '—'}</td>
              <td className="px-3 py-3 tabular-nums">{app.evaluationScore ?? '—'}</td>
              <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{app.tags.map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}</div></td>
              <td className="px-3 py-3 text-fg-sub">{new Date(app.createdAt).toLocaleDateString('pt-BR')}</td>
              <td className="px-3 py-3"><button type="button" className="btn btn-outline btn-sm" onClick={() => onOpen(app.id)}>Abrir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
