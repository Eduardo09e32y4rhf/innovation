'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';

type Scope = 'NATIONAL' | 'STATE' | 'MUNICIPAL';
type Row = { name: string; date: string; scope: Scope };
const SCOPES: Record<Scope, string> = { NATIONAL: 'Nacional', STATE: 'Estadual', MUNICIPAL: 'Municipal' };

export function HolidaysSection() {
  const holidays = useQuery(() => api.companies.getHolidays(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!holidays.data) return;
    setRows(holidays.data.map((item: { name: string; date: string; scope?: Scope }) => ({ name: item.name, date: String(item.date).slice(0, 10), scope: item.scope ?? 'NATIONAL' })));
  }, [holidays.data]);

  const patch = (index: number, change: Partial<Row>) => setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...change } : row)));
  const invalid = rows.some((row) => !row.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(row.date));

  async function save() {
    if (invalid) return setError('Preencha nome e data de todos os feriados.');
    setSaving(true); setError(null);
    try {
      await api.companies.updateHolidays(rows.map((row) => ({ ...row, name: row.name.trim() })));
      toast.success('Feriados salvos.');
      await holidays.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar os feriados.'); }
    finally { setSaving(false); }
  }

  if (holidays.error) return <ErrorState message={holidays.error} onRetry={holidays.refetch} />;
  if (holidays.loading && !holidays.data) return <LoadingState label="Carregando feriados…" />;

  return (
    <section className="card-v2 space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-base font-semibold text-fg">Feriados da empresa</h2><p className="text-sm text-fg-sub">Usados na escala, no ponto e no cálculo da folha.</p></div>
        <Button variant="outline" onClick={() => setRows((prev) => [...prev, { name: '', date: '', scope: 'NATIONAL' }])}><Plus size={15} aria-hidden="true" /> Adicionar</Button>
      </div>
      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-fg-sub">Nenhum feriado cadastrado.</p> : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_140px_auto]">
              <input className="input-v2" aria-label="Nome do feriado" placeholder="Nome" value={row.name} onChange={(e) => patch(index, { name: e.target.value })} />
              <input type="date" className="input-v2" aria-label="Data" value={row.date} onChange={(e) => patch(index, { date: e.target.value })} />
              <select className="input-v2" aria-label="Abrangência" value={row.scope} onChange={(e) => patch(index, { scope: e.target.value as Scope })}>
                {Object.entries(SCOPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Button variant="ghost" size="sm" aria-label="Remover feriado" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}><Trash2 size={15} aria-hidden="true" /></Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end"><Button onClick={save} isLoading={saving}>Salvar feriados</Button></div>
    </section>
  );
}
