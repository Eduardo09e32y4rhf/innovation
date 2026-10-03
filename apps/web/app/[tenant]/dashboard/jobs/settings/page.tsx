'use client';

import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { SectionCard, TagChip, inputClass } from '../_components/bits';
import { jobsApi } from '../jobs-api';
import { STAGE_KIND_LABEL, type Stage, type StageKind } from '../types';

const COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6', '#10b981', '#f43f5e', '#6b7280'];
const message = (cause: unknown, fallback: string) => (cause instanceof ApiError ? cause.message : fallback);

export default function RecruitmentSettingsPage() {
  const { tenant = '' } = useParams<{ tenant: string }>();
  const { user, company } = useAuth();
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const allowed = ['DEV', 'ADMIN', 'RH'].includes(role);
  const pipeline = useQuery(() => jobsApi.pipeline(), [company?.id], { enabled: allowed });
  const tags = useQuery(() => jobsApi.tags(), [company?.id], { enabled: allowed });
  const [stages, setStages] = useState<Stage[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState(COLORS[0]);
  const base = `/${tenant}/dashboard/jobs`;

  useEffect(() => { if (pipeline.data) setStages(pipeline.data.stages.map(({ id, name, color, kind }) => ({ id, name, color, kind }))); }, [pipeline.data]);

  const patch = (index: number, next: Partial<Stage>) => setStages((current) => current.map((stage, i) => (i === index ? { ...stage, ...next } : stage)));
  const move = (index: number, delta: -1 | 1) => setStages((current) => {
    const target = index + delta;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });

  async function savePipeline() {
    setSaving(true);
    try { await jobsApi.savePipeline(stages); toast.success('Funil atualizado.'); pipeline.refetch(); }
    catch (cause) { toast.error(message(cause, 'Não foi possível salvar o funil.')); }
    finally { setSaving(false); }
  }

  async function addTag() {
    if (!tagName.trim()) return;
    try { await jobsApi.createTag(tagName.trim(), tagColor); setTagName(''); tags.refetch(); }
    catch (cause) { toast.error(message(cause, 'Não foi possível criar a tag.')); }
  }

  if (!allowed) return <div className="p-6"><EmptyState message="Apenas Admin, RH ou Dev configuram o funil." /></div>;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
      <Link href={base} className="inline-flex items-center gap-1 text-sm text-fg-sub hover:text-fg"><ArrowLeft size={15} aria-hidden="true" /> Voltar para vagas</Link>
      <PageHeader title="Funil e tags" subtitle="Defina as etapas do seu processo seletivo e as etiquetas usadas para organizar candidatos." />

      <SectionCard title="Etapas do funil" description="Todas as vagas usam este funil. Cada etapa tem um tipo que define o comportamento: contratação gera o cadastro do funcionário; reprovação pede o motivo."
        actions={<Button variant="outline" size="sm" disabled={stages.length >= 20} onClick={() => setStages([...stages, { name: '', color: '#6b7280', kind: 'SCREENING' }])}><Plus size={15} aria-hidden="true" /> Etapa</Button>}>
        {pipeline.error && <ErrorState message={pipeline.error} onRetry={pipeline.refetch} />}
        {pipeline.loading && !pipeline.data ? <LoadingState label="Carregando funil…" /> : (
          <>
            <ul className="space-y-2">
              {stages.map((stage, index) => (
                <li key={stage.id ?? `new-${index}`} className="grid grid-cols-[auto_1fr_150px_auto] items-center gap-2">
                  <input type="color" aria-label={`Cor da etapa ${index + 1}`} value={stage.color} onChange={(event) => patch(index, { color: event.target.value })} className="h-9 w-9 cursor-pointer rounded border border-border" />
                  <input className={inputClass} aria-label={`Nome da etapa ${index + 1}`} value={stage.name} maxLength={60} placeholder="Nome da etapa" onChange={(event) => patch(index, { name: event.target.value })} />
                  <select className={inputClass} aria-label={`Tipo da etapa ${index + 1}`} value={stage.kind} onChange={(event) => patch(index, { kind: event.target.value as StageKind })}>
                    {Object.entries(STAGE_KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <div className="flex">
                    <button type="button" className="btn-icon" aria-label="Subir" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
                    <button type="button" className="btn-icon" aria-label="Descer" disabled={index === stages.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
                    <button type="button" className="btn-icon text-rose-600" aria-label="Remover etapa" onClick={() => setStages(stages.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <Button isLoading={saving} disabled={stages.some((stage) => !stage.name.trim())} onClick={savePipeline}>Salvar funil</Button>
          </>
        )}
      </SectionCard>

      <SectionCard title="Tags" description="Etiquetas livres para marcar candidatos (ex.: Talento futuro, Indicação, Urgente).">
        <div className="flex flex-wrap items-end gap-2">
          <input className={`${inputClass} max-w-xs`} aria-label="Nome da tag" placeholder="Nova tag" value={tagName} maxLength={40} onChange={(event) => setTagName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addTag(); }} />
          <div className="flex gap-1" role="radiogroup" aria-label="Cor da tag">
            {COLORS.map((color) => <button key={color} type="button" role="radio" aria-checked={tagColor === color} aria-label={color} onClick={() => setTagColor(color)} className={`h-7 w-7 rounded-full ${tagColor === color ? 'ring-2 ring-offset-2 ring-purple-500' : ''}`} style={{ background: color }} />)}
          </div>
          <Button onClick={addTag} disabled={!tagName.trim()}>Criar tag</Button>
        </div>
        <ul className="flex flex-wrap gap-2">
          {(tags.data ?? []).map((tag) => (
            <li key={tag.id} className="inline-flex items-center gap-1">
              <TagChip name={tag.name} color={tag.color} />
              <button type="button" className="text-rose-600" aria-label={`Excluir tag ${tag.name}`} onClick={async () => { try { await jobsApi.deleteTag(tag.id); tags.refetch(); } catch (cause) { toast.error(message(cause, 'Falha ao excluir.')); } }}><Trash2 size={13} /></button>
            </li>
          ))}
          {tags.data?.length === 0 && <li className="text-sm text-fg-sub">Nenhuma tag criada.</li>}
        </ul>
      </SectionCard>
    </div>
  );
}
