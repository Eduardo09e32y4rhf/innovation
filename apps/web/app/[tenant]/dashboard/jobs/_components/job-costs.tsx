'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { jobsApi } from '../jobs-api';
import { toMoney } from '../payloads';
import { SectionCard, inputClass } from './bits';

export const SOURCE_LABEL: Record<string, string> = {
  CAREERS_PORTAL: 'Portal de carreiras', LINKEDIN: 'LinkedIn', INDEED: 'Indeed', GUPY: 'Gupy', VAGAS: 'Vagas.com', CATHO: 'Catho', INFOJOBS: 'InfoJobs',
  WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', EMAIL: 'E-mail', INDICACAO: 'Indicação', SITE: 'Site da empresa', OUTRO: 'Outro',
};
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
type Row = { source: string; amount: string };

/** Custos do recrutamento da vaga: custo fixo e custo por origem (anúncio, agência). Só RH, administrador e DEV. */
export function JobCosts({ jobId }: { jobId: string }) {
  const costs = useQuery(() => jobsApi.costs(jobId), [jobId]);
  const [fixed, setFixed] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!costs.data) return;
    setFixed(costs.data.costAmount != null ? String(costs.data.costAmount).replace('.', ',') : '');
    setRows(costs.data.sources.map((row) => ({ source: row.source, amount: String(row.amount).replace('.', ',') })));
  }, [costs.data]);

  if (costs.loading && !costs.data) return <LoadingState label="Carregando custos…" />;
  if (costs.error) return <ErrorState message={costs.error} onRetry={costs.refetch} />;

  const used = new Set(rows.map((row) => row.source));
  const free = Object.keys(SOURCE_LABEL).filter((source) => !used.has(source));
  const total = (toMoney(fixed) ?? 0) + rows.reduce((sum, row) => sum + (toMoney(row.amount) ?? 0), 0);
  const invalid = rows.some((row) => row.amount.trim() !== '' && toMoney(row.amount) === undefined) || (fixed.trim() !== '' && toMoney(fixed) === undefined);

  async function save() {
    setSaving(true);
    try {
      await jobsApi.saveCosts(jobId, { costAmount: toMoney(fixed) ?? null, sources: rows.map((row) => ({ source: row.source, amount: toMoney(row.amount) ?? 0 })) });
      toast.success('Custos salvos.'); costs.refetch();
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar os custos.'); }
    finally { setSaving(false); }
  }

  return (
    <SectionCard title="Custos do recrutamento" description="Base do custo por contratação nos relatórios. Informe o custo fixo e quanto foi gasto em cada canal.">
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <label className="block space-y-1 text-sm font-medium">Custo fixo da vaga (R$)<input inputMode="decimal" className={inputClass} placeholder="0,00" value={fixed} onChange={(event) => setFixed(event.target.value)} /></label>
        <div className="space-y-2">
          <p className="text-sm font-medium">Custo por origem</p>
          {rows.length === 0 && <p className="text-sm text-fg-sub">Nenhum custo por canal informado.</p>}
          {rows.map((row, index) => (
            <div key={row.source} className="flex items-center gap-2">
              <span className="w-40 shrink-0 truncate text-sm">{SOURCE_LABEL[row.source] ?? row.source}</span>
              <input inputMode="decimal" aria-label={`Custo em ${SOURCE_LABEL[row.source] ?? row.source} (R$)`} className={inputClass} placeholder="0,00" value={row.amount} onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, amount: event.target.value } : item)))} />
              <button type="button" className="btn-icon text-rose-600" aria-label={`Remover ${SOURCE_LABEL[row.source] ?? row.source}`} onClick={() => setRows(rows.filter((_, i) => i !== index))}><Trash2 size={15} aria-hidden="true" /></button>
            </div>
          ))}
          {free.length > 0 && (
            <label className="inline-flex items-center gap-2 text-sm"><Plus size={14} aria-hidden="true" />
              <select className={inputClass} aria-label="Adicionar origem de custo" value="" onChange={(event) => event.target.value && setRows([...rows, { source: event.target.value, amount: '' }])}>
                <option value="">Adicionar canal…</option>{free.map((source) => <option key={source} value={source}>{SOURCE_LABEL[source]}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-sub">Total desta vaga: <strong className="text-fg">{money(total)}</strong></p>
        <Button isLoading={saving} disabled={invalid} onClick={save}>Salvar custos</Button>
      </div>
    </SectionCard>
  );
}
