'use client';

import { CalendarPlus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { cardClass, errorText, inputClass } from './types';

type Scope = 'NATIONAL' | 'STATE' | 'MUNICIPAL';
type Row = { name: string; date: string; scope: Scope };
const SCOPES: Record<Scope, string> = { NATIONAL: 'Nacional', STATE: 'Estadual', MUNICIPAL: 'Municipal' };
const SCOPE_TONE: Record<Scope, string> = { NATIONAL: 'bg-emerald-50 text-emerald-700', STATE: 'bg-sky-50 text-sky-700', MUNICIPAL: 'bg-amber-50 text-amber-700' };

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

/** Páscoa (algoritmo de Meeus/Jones/Butcher). */
function easter(year: number) {
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100;
  const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4); const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function nationalHolidays(year: number): Row[] {
  const fixed: Array<[string, string]> = [
    ['01-01', 'Confraternização Universal'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['09-07', 'Independência do Brasil'],
    ['10-12', 'Nossa Senhora Aparecida'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Consciência Negra'], ['12-25', 'Natal'],
  ];
  const paschoa = easter(year);
  return [
    ...fixed.map(([md, name]) => ({ name, date: `${year}-${md}`, scope: 'NATIONAL' as Scope })),
    { name: 'Carnaval', date: iso(addDays(paschoa, -47)), scope: 'NATIONAL' as Scope },
    { name: 'Sexta-feira Santa', date: iso(addDays(paschoa, -2)), scope: 'NATIONAL' as Scope },
    { name: 'Corpus Christi', date: iso(addDays(paschoa, 60)), scope: 'NATIONAL' as Scope },
  ];
}

const br = (date: string) => date.split('-').reverse().join('/');

export function HolidaysSection() {
  const holidays = useQuery(() => api.companies.getHolidays(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [original, setOriginal] = useState('[]');
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!holidays.data) return;
    const loaded = holidays.data.map((item: { name: string; date: string; scope?: Scope }) => ({ name: item.name, date: String(item.date).slice(0, 10), scope: item.scope ?? 'NATIONAL' }));
    setRows(loaded); setOriginal(JSON.stringify(loaded));
  }, [holidays.data]);

  const dirty = JSON.stringify(rows) !== original;
  const patch = (index: number, change: Partial<Row>) => setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...change } : row)));
  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear(), new Date().getFullYear() + 1]);
    rows.forEach((r) => { const y = Number(r.date.slice(0, 4)); if (y) set.add(y); });
    return [...set].sort();
  }, [rows]);
  const visible = rows.map((row, index) => ({ row, index })).filter(({ row }) => !row.date || row.date.startsWith(String(year))).sort((a, b) => (a.row.date || '9').localeCompare(b.row.date || '9'));

  function addNational() {
    const existing = new Set(rows.map((r) => r.date));
    const toAdd = nationalHolidays(year).filter((h) => !existing.has(h.date));
    if (!toAdd.length) return void toast.info(`Os feriados nacionais de ${year} já estão na lista.`);
    setRows((prev) => [...prev, ...toAdd]);
    toast.success(`${toAdd.length} feriado(s) nacional(is) de ${year} adicionados. Clique em salvar para confirmar.`);
  }

  async function save() {
    setError(null);
    const incomplete = rows.some((row) => !row.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(row.date));
    if (incomplete) return setError('Preencha o nome e a data de todos os feriados.');
    const dup = rows.find((row, i) => rows.findIndex((o) => o.date === row.date && o.name.trim().toLowerCase() === row.name.trim().toLowerCase()) !== i);
    if (dup) return setError(`"${dup.name}" aparece repetido em ${br(dup.date)}.`);
    setSaving(true);
    try {
      await api.companies.updateHolidays(rows.map((row) => ({ ...row, name: row.name.trim() })));
      toast.success('Feriados salvos.');
      await holidays.refetch();
    } catch (cause) { setError(errorText(cause, 'Não foi possível salvar os feriados.')); }
    finally { setSaving(false); }
  }

  if (holidays.error) return <ErrorState message={holidays.error} onRetry={holidays.refetch} />;
  if (holidays.loading && !holidays.data) return <LoadingState label="Carregando feriados…" />;

  return (
    <section className={`${cardClass} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Ano">
          {years.map((y) => (
            <button key={y} type="button" role="tab" aria-selected={year === y} onClick={() => setYear(y)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold ${year === y ? 'bg-purple-600 text-white' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{y}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={addNational}><CalendarPlus size={15} aria-hidden="true" /> Adicionar nacionais de {year}</Button>
          <Button variant="outline" onClick={() => setRows((prev) => [...prev, { name: '', date: `${year}-01-01`, scope: 'MUNICIPAL' }])}><Plus size={15} aria-hidden="true" /> Novo feriado</Button>
        </div>
      </div>
      <p className="text-xs text-fg-sub">Os feriados valem para a escala, o ponto e a folha. Adicione os da sua cidade e estado como Municipal ou Estadual.</p>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      {visible.length === 0 ? <p className="py-8 text-center text-sm text-fg-sub">Nenhum feriado em {year}. Use "Adicionar nacionais de {year}" para começar.</p> : (
        <ul className="space-y-2">
          {visible.map(({ row, index }) => (
            <li key={index} className="grid items-center gap-2 rounded-xl border border-border p-2 sm:grid-cols-[150px_minmax(0,1fr)_130px_auto]">
              <input type="date" className={inputClass.replace('mt-1 ', '')} aria-label="Data" value={row.date} onChange={(e) => patch(index, { date: e.target.value })} />
              <input className={inputClass.replace('mt-1 ', '')} aria-label="Nome do feriado" placeholder="Nome do feriado" value={row.name} onChange={(e) => patch(index, { name: e.target.value })} />
              <select className={`${inputClass.replace('mt-1 ', '')} ${SCOPE_TONE[row.scope]}`} aria-label="Abrangência" value={row.scope} onChange={(e) => patch(index, { scope: e.target.value as Scope })}>
                {Object.entries(SCOPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Button variant="ghost" size="sm" aria-label="Remover feriado" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}><Trash2 size={15} aria-hidden="true" /></Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-fg-sub">{dirty ? 'Há alterações não salvas.' : `${rows.length} feriado(s) cadastrado(s).`}</span>
        <Button onClick={save} isLoading={saving} disabled={!dirty}>Salvar feriados</Button>
      </div>
    </section>
  );
}
