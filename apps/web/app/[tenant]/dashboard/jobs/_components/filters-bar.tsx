'use client';

import { Bookmark, Download, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { ApiError } from '@/app/lib/api';
import { jobsApi } from '../jobs-api';
import type { ApplicationFilters, Pipeline, SavedView, Tag, Question } from '../types';
import { PromptDialog } from './dialogs';

const sel = 'input-v2 text-sm';

export function FiltersBar({
  filters, onChange, pipeline, tags, questions, views, onViewsChanged, onExport, total,
}: {
  filters: ApplicationFilters; onChange: (next: ApplicationFilters) => void;
  pipeline?: Pipeline; tags: Tag[]; questions: Question[]; views: SavedView[];
  onViewsChanged: () => void; onExport: () => void; total: number;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const patch = (next: Partial<ApplicationFilters>) => onChange({ ...filters, ...next });
  const active = Object.entries(filters).some(([key, value]) => key !== 'sort' && value);

  return (
    <section aria-label="Filtros de candidatos" className="card-v2 space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-fg-sub" />
          <input className="input-v2 !pl-10 w-full text-base sm:text-sm" placeholder="Buscar por nome, e-mail, telefone ou qualquer resposta" aria-label="Buscar candidatos" value={filters.q ?? ''} onChange={(event) => patch({ q: event.target.value })} />
        </div>
        <select aria-label="Ordenar" className={sel} value={filters.sort ?? ''} onChange={(event) => patch({ sort: event.target.value })}>
          <option value="">Mais recentes</option><option value="oldest">Mais antigos</option><option value="score">Maior pontuação</option><option value="rating">Melhor avaliação</option><option value="name">Nome (A–Z)</option>
        </select>
        <Button variant="outline" onClick={onExport}><Download size={16} aria-hidden="true" /> CSV</Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <select aria-label="Etapa" className={sel} value={filters.stageId ?? ''} onChange={(event) => patch({ stageId: event.target.value })}>
          <option value="">Todas as etapas</option>{pipeline?.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
        </select>
        <select aria-label="Tag" className={sel} value={filters.tagId ?? ''} onChange={(event) => patch({ tagId: event.target.value })}>
          <option value="">Todas as tags</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
        <select aria-label="Critérios" className={sel} value={filters.knockedOut ?? ''} onChange={(event) => patch({ knockedOut: event.target.value })}>
          <option value="">Dentro e fora do critério</option><option value="false">Somente dentro do critério</option><option value="true">Somente fora do critério</option>
        </select>
        <input type="number" min={0} aria-label="Pontuação mínima" className={sel} placeholder="Pontuação mín." value={filters.minScore ?? ''} onChange={(event) => patch({ minScore: event.target.value })} />
        <input type="number" min={1} max={5} step={0.5} aria-label="Avaliação mínima" className={sel} placeholder="Nota mín. (1-5)" value={filters.minRating ?? ''} onChange={(event) => patch({ minRating: event.target.value })} />
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={filters.favorite === 'true'} onChange={(event) => patch({ favorite: event.target.checked ? 'true' : '' })} /> Só favoritos</label>
        <input type="date" aria-label="Inscritos a partir de" className={sel} value={filters.from ?? ''} onChange={(event) => patch({ from: event.target.value })} />
        <input type="date" aria-label="Inscritos até" className={sel} value={filters.to ?? ''} onChange={(event) => patch({ to: event.target.value })} />
        {questions.length > 0 && (
          <>
            <select aria-label="Filtrar por pergunta" className={sel} value={filters.answerQ ?? ''} onChange={(event) => patch({ answerQ: event.target.value })}>
              <option value="">Filtrar por resposta…</option>{questions.map((question) => <option key={question.id} value={question.id}>{question.label}</option>)}
            </select>
            <input aria-label="Valor da resposta" className={sel} placeholder="contém…" disabled={!filters.answerQ} value={filters.answerV ?? ''} onChange={(event) => patch({ answerV: event.target.value })} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-fg-sub" role="status">{total} candidato(s)</span>
        {active && <Button size="sm" variant="ghost" onClick={() => onChange({ sort: filters.sort })}><X size={14} aria-hidden="true" /> Limpar filtros</Button>}
        {active && <Button size="sm" variant="outline" onClick={() => setSaveOpen(true)}><Bookmark size={14} aria-hidden="true" /> Salvar visão</Button>}
        {views.map((view) => (
          <span key={view.id} className="inline-flex items-center overflow-hidden rounded-full border border-border">
            <button type="button" className="px-3 py-1 hover:bg-bg-sub" onClick={() => onChange(view.filters)}>{view.name}</button>
            <button type="button" className="px-2 py-1 text-rose-600 hover:bg-rose-50" aria-label={`Excluir visão ${view.name}`}
              onClick={async () => { try { await jobsApi.deleteView(view.id); onViewsChanged(); } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Falha ao excluir.'); } }}><Trash2 size={13} /></button>
          </span>
        ))}
      </div>

      <PromptDialog isOpen={saveOpen} title="Salvar visão" label="Nome da visão" confirmText="Salvar" onClose={() => setSaveOpen(false)}
        onConfirm={async (name) => { try { await jobsApi.createView(name, filters); toast.success('Visão salva.'); setSaveOpen(false); onViewsChanged(); } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar.'); } }} />
    </section>
  );
}
