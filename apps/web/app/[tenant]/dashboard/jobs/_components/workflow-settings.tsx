'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { workflowApi } from '../workflow-api';
import { SectionCard, inputClass } from './bits';

const STEPS: Array<[string, string]> = [['GESTOR', 'Gestor'], ['RH', 'RH'], ['FINANCEIRO', 'Financeiro']];
const message = (cause: unknown, fallback: string) => (cause instanceof ApiError ? cause.message : fallback);

/** Requisição de vaga: etapas de aprovação, orçamento por área e modelos de vaga. */
export function WorkflowSettings() {
  const steps = useQuery(() => workflowApi.steps(), []);
  const budgets = useQuery(() => workflowApi.budgets(), []);
  const templates = useQuery(() => workflowApi.templates(), []);
  const [picked, setPicked] = useState<string[]>([]);
  const [dept, setDept] = useState(''); const [value, setValue] = useState('');
  useEffect(() => { if (steps.data) setPicked(steps.data.steps); }, [steps.data]);

  async function saveSteps() {
    try { await workflowApi.saveSteps(picked); toast.success(picked.length ? 'Etapas de aprovação salvas.' : 'Aprovação desligada: vagas abrem direto.'); steps.refetch(); }
    catch (cause) { toast.error(message(cause, 'Não foi possível salvar.')); }
  }
  async function saveBudget(department: string, budget: number | null) {
    try { await workflowApi.saveBudget(department, budget); budgets.refetch(); toast.success('Orçamento atualizado.'); }
    catch (cause) { toast.error(message(cause, 'Não foi possível salvar.')); }
  }

  return (
    <>
      <SectionCard title="Aprovação da requisição de vaga" description="Marque quem precisa aprovar antes de a vaga ser publicada, sempre na ordem gestor, RH, financeiro. Sem nenhuma marcada, as vagas abrem direto.">
        {steps.error && <ErrorState message={steps.error} onRetry={steps.refetch} />}
        <div className="flex flex-wrap gap-3">
          {STEPS.map(([id, label]) => <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(id)} onChange={(event) => setPicked(event.target.checked ? [...picked, id] : picked.filter((item) => item !== id))} />{label}</label>)}
        </div>
        <Button onClick={saveSteps}>Salvar etapas</Button>
      </SectionCard>

      <SectionCard title="Orçamento de vagas por área" description="Limite de vagas abertas ao mesmo tempo em cada área (aberta, pausada ou aguardando aprovação). Sem orçamento, não há limite.">
        {budgets.loading && !budgets.data ? <LoadingState label="Carregando…" /> : (
          <ul className="space-y-2">
            {(budgets.data ?? []).map((row) => (
              <li key={row.department} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="min-w-[160px] font-medium">{row.department}</span><span className="text-fg-sub">em uso: {row.used}</span>
                <input type="number" min={0} className={`${inputClass} w-24`} aria-label={`Orçamento de ${row.department}`} defaultValue={row.budget ?? ''} placeholder="sem limite" onBlur={(event) => { const v = event.target.value.trim(); const next = v === '' ? null : Number(v); if (next !== row.budget) void saveBudget(row.department, next); }} />
              </li>
            ))}
            {(budgets.data ?? []).length === 0 && <li className="text-sm text-fg-sub">Nenhuma área ainda. Adicione abaixo ou crie vagas com área preenchida.</li>}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <input className={`${inputClass} max-w-xs`} placeholder="Nova área (ex.: Comercial)" aria-label="Nova área" value={dept} onChange={(event) => setDept(event.target.value)} />
          <input type="number" min={0} className={`${inputClass} w-24`} placeholder="Limite" aria-label="Limite da nova área" value={value} onChange={(event) => setValue(event.target.value)} />
          <Button disabled={!dept.trim() || value === ''} onClick={async () => { await saveBudget(dept.trim(), Number(value)); setDept(''); setValue(''); }}>Definir</Button>
        </div>
      </SectionCard>

      <SectionCard title="Modelos de vaga" description="Crie um modelo a partir de uma vaga (botão Modelo no card da vaga) e abra vagas parecidas com um clique.">
        {templates.loading && !templates.data ? <LoadingState label="Carregando…" /> : (templates.data ?? []).length === 0 ? <EmptyState message="Nenhum modelo salvo." /> : (
          <ul className="space-y-1">{(templates.data ?? []).map((item) => <li key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">{item.name}<button type="button" className="text-rose-600" aria-label={`Excluir modelo ${item.name}`} onClick={async () => { try { await workflowApi.removeTemplate(item.id); templates.refetch(); } catch (cause) { toast.error(message(cause, 'Falha ao excluir.')); } }}><Trash2 size={14} /></button></li>)}</ul>
        )}
      </SectionCard>
    </>
  );
}