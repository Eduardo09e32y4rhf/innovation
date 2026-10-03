'use client';

import { History, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { date, errorText, money } from './format';
import { platformHub } from './hub-api';
import type { RuleGroup, RuleVersion, SimulationResult } from './types';

const input = 'input-v2 w-full text-base sm:text-sm';
const pct = (rate: number) => `${(rate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}%`;

const IRRF_FIELDS: [string, string][] = [
  ['dependentDeduction', 'Dedução por dependente (R$)'], ['simplifiedDeduction', 'Dedução simplificada (R$)'], ['fullExemptionLimit', 'Limite de isenção total (R$)'],
  ['partialExemptionLimit', 'Limite de redução parcial (R$)'], ['partialReductionBase', 'Redutor — base (R$)'], ['partialReductionFactor', 'Redutor — fator'],
];
const PARAM_FIELDS: [string, string, string][] = [
  ['overtime50MinFactor', 'Fator mínimo da hora extra 50%', 'Mínimo 1,5'], ['overtime100MinFactor', 'Fator mínimo da hora extra 100%', 'Mínimo 2,0'],
  ['nightMinPercent', 'Adicional noturno mínimo (%)', 'Mínimo 20'], ['monthlyDivisorFactor', 'Fator do divisor mensal', 'Padrão 5 (44h → 220h)'],
];

function summary(group: RuleGroup) {
  const v = group.current;
  if (!v) return 'Usando o padrão embutido (cadastre uma versão para controlar).';
  if (group.type === 'FGTS') return `Alíquota ${pct(v.brackets[0]?.rate ?? 0)}`;
  if (group.type === 'PAYROLL_PARAMS') return `HE 50%: ×${v.parameters?.overtime50MinFactor} · HE 100%: ×${v.parameters?.overtime100MinFactor} · noturno ${v.parameters?.nightMinPercent}%`;
  if (group.type === 'INSS') return `${v.brackets.length} faixas · teto ${money(v.brackets[v.brackets.length - 1]?.limit ?? 0)}`;
  return `${v.brackets.length} faixas · dedução simplificada ${money(v.parameters?.simplifiedDeduction)}`;
}

function RuleEditor({ group, onClose, onSaved }: { group: RuleGroup | null; onClose: () => void; onSaved: () => void }) {
  const [from, setFrom] = useState('');
  const [version, setVersion] = useState('');
  const [rows, setRows] = useState<{ limit: string; rate: string; deduction: string }[]>([]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!group) return;
    const cur = group.current;
    setFrom(''); setVersion('');
    setRows((cur?.brackets ?? [{ limit: 0, rate: 0 }]).map((b) => ({ limit: b.limit == null ? '' : String(b.limit), rate: String(Number((b.rate * 100).toFixed(4))), deduction: String(b.deduction ?? 0) })));
    setParams(Object.fromEntries(Object.entries(cur?.parameters ?? {}).map(([k, v]) => [k, String(v)])));
  }, [group]);

  if (!group) return null;
  const set = (index: number, key: 'limit' | 'rate' | 'deduction', value: string) => setRows((cur) => cur.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  async function save() {
    if (!group) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = { taxType: group.type, effectiveFrom: from, version: version.trim() || undefined };
      if (group.type === 'FGTS') body.rate = Number(rows[0]?.rate) / 100;
      else if (group.type === 'PAYROLL_PARAMS') body.parameters = Object.fromEntries(PARAM_FIELDS.map(([key]) => [key, Number(params[key])]));
      else {
        body.brackets = rows.map((row) => ({ limit: row.limit === '' ? null : Number(row.limit), rate: Number(row.rate) / 100, ...(group.type === 'IRRF' ? { deduction: Number(row.deduction || 0) } : {}) }));
        if (group.type === 'IRRF') body.parameters = Object.fromEntries(IRRF_FIELDS.map(([key]) => [key, Number(params[key])]));
      }
      await platformHub.saveRule(body);
      toast.success('Nova versão cadastrada. Os próximos cálculos já usam esta regra.');
      onSaved(); onClose();
    } catch (cause) { toast.error(errorText(cause, 'Não foi possível salvar a regra.')); }
    finally { setBusy(false); }
  }

  const bracketed = group.type === 'INSS' || group.type === 'IRRF';
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={`Nova versão — ${group.label}`} description="A versão anterior é encerrada no dia anterior à vigência. Fechamentos já fechados não mudam." maxWidth="max-w-2xl">
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (from) void save(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">Vigente a partir de *<input type="date" required className={input} value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="space-y-1.5 text-sm font-medium">Nome da versão (opcional)<input className={input} value={version} maxLength={40} placeholder="Ex.: 2027-01" onChange={(event) => setVersion(event.target.value)} /></label>
        </div>

        {group.type === 'FGTS' && <label className="block space-y-1.5 text-sm font-medium">Alíquota (%)<input type="number" step="0.01" min="0.1" max="50" className={input} value={rows[0]?.rate ?? ''} onChange={(event) => set(0, 'rate', event.target.value)} /></label>}

        {bracketed && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_110px_110px_auto] gap-2 text-xs text-fg-sub"><span>Até (R$) — vazio = sem teto</span><span>Alíquota %</span><span>{group.type === 'IRRF' ? 'Dedução R$' : ''}</span><span /></div>
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_110px_110px_auto] items-center gap-2">
                <input type="number" step="0.01" className={input} aria-label={`Limite da faixa ${index + 1}`} value={row.limit} onChange={(event) => set(index, 'limit', event.target.value)} />
                <input type="number" step="0.001" className={input} aria-label={`Alíquota da faixa ${index + 1}`} value={row.rate} onChange={(event) => set(index, 'rate', event.target.value)} />
                {group.type === 'IRRF' ? <input type="number" step="0.01" className={input} aria-label={`Dedução da faixa ${index + 1}`} value={row.deduction} onChange={(event) => set(index, 'deduction', event.target.value)} /> : <span />}
                <button type="button" className="btn-icon text-rose-600" aria-label="Remover faixa" disabled={rows.length <= 1} onClick={() => setRows((cur) => cur.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
              </div>
            ))}
            <Button variant="outline" size="sm" disabled={rows.length >= 12} onClick={() => setRows((cur) => [...cur, { limit: '', rate: '0', deduction: '0' }])}><Plus size={14} aria-hidden="true" /> Faixa</Button>
          </div>
        )}

        {group.type === 'IRRF' && (
          <div className="grid gap-3 sm:grid-cols-2">{IRRF_FIELDS.map(([key, label]) => <label key={key} className="space-y-1.5 text-sm font-medium">{label}<input type="number" step="any" min="0" className={input} value={params[key] ?? ''} onChange={(event) => setParams({ ...params, [key]: event.target.value })} /></label>)}</div>
        )}
        {group.type === 'PAYROLL_PARAMS' && (
          <div className="grid gap-3 sm:grid-cols-2">{PARAM_FIELDS.map(([key, label, hint]) => <label key={key} className="space-y-1.5 text-sm font-medium">{label}<input type="number" step="any" min="0" className={input} value={params[key] ?? ''} onChange={(event) => setParams({ ...params, [key]: event.target.value })} /><span className="block text-xs font-normal text-fg-sub">{hint}</span></label>)}</div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-3"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={!from}>Salvar versão</Button></div>
      </form>
    </Modal>
  );
}

function Simulator() {
  const [form, setForm] = useState({ salary: '5000', dependents: '0', overtime50Minutes: '600', overtime100Minutes: '0', nightShiftMinutes: '0', absenceMinutes: '0' });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setBusy(true); setError('');
    try { setResult(await platformHub.simulate(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value || 0)])))); }
    catch (cause) { setError(errorText(cause, 'Não foi possível simular.')); setResult(null); }
    finally { setBusy(false); }
  }
  useEffect(() => { void run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const r = result?.result;
  const fields: [keyof typeof form, string][] = [['salary', 'Salário (R$)'], ['dependents', 'Dependentes'], ['overtime50Minutes', 'HE 50% (min)'], ['overtime100Minutes', 'HE 100% (min)'], ['nightShiftMinutes', 'Noturno (min)'], ['absenceMinutes', 'Faltas (min)']];
  return (
    <section className="card-v2 space-y-4 p-5" aria-label="Simulador">
      <header><h2 className="text-base font-semibold">Simulador de holerite</h2><p className="text-sm text-fg-sub">Mostra exatamente o que o fechamento calcula com as regras vigentes hoje.</p></header>
      <form className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        {fields.map(([key, label]) => <label key={key} className="space-y-1 text-xs font-medium">{label}<input type="number" min="0" step="any" className={input} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
        <div className="sm:col-span-3 lg:col-span-6"><Button type="submit" isLoading={busy}>Simular</Button></div>
      </form>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {r && result && (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            {([['Salário base', r.salaryBase], ['Hora (R$/h)', r.hourlyRate], ['HE 50%', r.overtime50Value], ['HE 100%', r.overtime100Value], ['Noturno', r.nightShiftValue], ['DSR', r.dsrValue], ['Desc. faltas', -r.absenceDiscount], ['Bruto', r.grossPay], ['INSS', -r.inssDiscount], ['Base IRRF', r.irrfBase], ['IRRF', -r.irrfDiscount], ['FGTS (patronal)', r.fgtsAmount], ['Líquido', r.netPay]] as [string, number][]).map(([label, value]) => (
              <div key={label} className={`flex justify-between gap-2 border-b border-border/60 py-1 ${label === 'Líquido' || label === 'Bruto' ? 'font-semibold' : ''}`}><dt className="text-fg-sub">{label}</dt><dd className="tabular-nums">{label === 'Hora (R$/h)' ? value.toFixed(2) : money(value)}</dd></div>
            ))}
          </dl>
          <div className="rounded-lg bg-bg-sub p-3 text-xs text-fg-sub lg:w-64">
            <p className="font-semibold text-fg">Regras usadas</p>
            <p>INSS {result.rulesUsed.inss} · IRRF {result.rulesUsed.irrf}</p>
            <p>FGTS {result.rulesUsed.fgts ?? '—'} ({pct(result.rulesUsed.fgtsRate ?? 0)}) · Params {result.rulesUsed.params ?? '—'}</p>
            {result.rulesUsed.builtin.length > 0 && <p className="mt-1 text-amber-700">Padrão embutido em: {result.rulesUsed.builtin.join(', ')}. Cadastre versões acima.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

export function RulesPanel({ canEdit }: { canEdit: boolean }) {
  const rules = useQuery(() => platformHub.rules(), []);
  const [editing, setEditing] = useState<RuleGroup | null>(null);
  const [history, setHistory] = useState<string | null>(null);

  if (rules.error) return <ErrorState message={rules.error} onRetry={rules.refetch} />;
  if (rules.loading && !rules.data) return <LoadingState label="Carregando regras…" />;

  async function deactivate(version: RuleVersion) {
    try { await platformHub.deactivateRule(version.id); toast.success('Versão desativada.'); rules.refetch(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível desativar.')); }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {(rules.data?.rules ?? []).map((group) => (
          <section key={group.type} className="card-v2 space-y-3 p-5" aria-label={group.label}>
            <header className="flex items-start justify-between gap-2">
              <div><h2 className="text-base font-semibold">{group.label}</h2><p className="text-xs text-fg-sub">{group.description}</p></div>
              {canEdit && <Button size="sm" onClick={() => setEditing(group)}><Plus size={14} aria-hidden="true" /> Nova versão</Button>}
            </header>
            <p className="text-sm">{summary(group)}</p>
            {group.current && <p className="text-xs text-fg-sub">Versão <strong>{group.current.version}</strong> · vigente desde {date(group.current.effectiveFrom)}</p>}
            <button type="button" className="inline-flex items-center gap-1 text-xs text-purple-700 underline" onClick={() => setHistory(history === group.type ? null : group.type)}><History size={12} aria-hidden="true" /> Histórico ({group.history.length})</button>
            {history === group.type && (
              <ul className="divide-y divide-border rounded-lg border border-border text-xs">
                {group.history.map((version) => (
                  <li key={version.id} className="flex items-center justify-between gap-2 px-3 py-2"><span>{version.version} · {date(version.effectiveFrom)}{version.effectiveTo ? ` a ${date(version.effectiveTo)}` : ' em diante'}{!version.active && ' · desativada'}</span>
                    {canEdit && version.active && <button type="button" className="text-rose-600 underline" onClick={() => deactivate(version)}>Desativar</button>}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <Simulator />
      <RuleEditor group={editing} onClose={() => setEditing(null)} onSaved={rules.refetch} />
    </div>
  );
}
