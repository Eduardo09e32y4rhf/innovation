'use client';

import { CalendarClock, CheckCircle2, ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { date, errorText, money } from './format';
import { platformHub } from './hub-api';
import type { RuleGroup, RuleVersion, SimulationResult } from './types';

const input = 'input-v2 w-full text-base sm:text-sm';
const pct = (rate: number) => `${(rate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}%`;
const todayIso = () => new Date().toISOString().slice(0, 10);

const GROUP_META: Record<string, { icon: string; tone: string; what: string }> = {
  INSS: { icon: 'INSS', tone: 'from-sky-500 to-indigo-600', what: 'Contribuição do funcionário, por faixas progressivas, até o teto.' },
  IRRF: { icon: 'IR', tone: 'from-amber-500 to-orange-600', what: 'Imposto de renda retido, com deduções e redutor.' },
  FGTS: { icon: 'FGTS', tone: 'from-emerald-500 to-teal-600', what: 'Depósito mensal do empregador, sobre o bruto.' },
  PAYROLL_PARAMS: { icon: 'CLT', tone: 'from-fuchsia-500 to-purple-600', what: 'Adicionais mínimos de hora extra, noturno e divisor mensal.' },
};

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
  if (!v) return 'Usando o padrão embutido do sistema.';
  if (group.type === 'FGTS') return `Alíquota de ${pct(v.brackets[0]?.rate ?? 0)}`;
  if (group.type === 'PAYROLL_PARAMS') return `HE 50%: ×${v.parameters?.overtime50MinFactor} · HE 100%: ×${v.parameters?.overtime100MinFactor} · noturno ${v.parameters?.nightMinPercent}%`;
  if (group.type === 'INSS') return `${v.brackets.length} faixas · teto ${money(v.brackets[v.brackets.length - 1]?.limit ?? 0)}`;
  return `${v.brackets.length} faixas · dedução simplificada ${money(v.parameters?.simplifiedDeduction)}`;
}

// ---------- editor de versão ----------

function RuleEditor({ group, onClose, onSaved }: { group: RuleGroup | null; onClose: () => void; onSaved: () => void }) {
  const [from, setFrom] = useState('');
  const [version, setVersion] = useState('');
  const [rows, setRows] = useState<{ limit: string; rate: string; deduction: string }[]>([]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!group) return;
    const cur = group.current;
    setFrom(''); setVersion(''); setError('');
    setRows((cur?.brackets ?? [{ limit: 0, rate: 0 }]).map((b) => ({ limit: b.limit == null ? '' : String(b.limit), rate: String(Number((b.rate * 100).toFixed(4))), deduction: String(b.deduction ?? 0) })));
    setParams(Object.fromEntries(Object.entries(cur?.parameters ?? {}).map(([k, v]) => [k, String(v)])));
  }, [group]);

  if (!group) return null;
  const set = (index: number, key: 'limit' | 'rate' | 'deduction', value: string) => setRows((cur) => cur.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  const bracketed = group.type === 'INSS' || group.type === 'IRRF';

  async function save() {
    if (!group) return;
    setError('');
    if (bracketed) {
      const limits = rows.map((r) => (r.limit === '' ? Infinity : Number(r.limit)));
      if (limits.some((l, i) => i > 0 && l <= limits[i - 1])) return setError('Os limites das faixas precisam estar em ordem crescente.');
      if (group.type === 'INSS' && rows[rows.length - 1].limit === '') return setError('A última faixa do INSS precisa de um teto.');
    }
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
    } catch (cause) { setError(errorText(cause, 'Não foi possível salvar a regra.')); }
    finally { setBusy(false); }
  }

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={`Nova versão — ${group.label}`} description="Começa com os valores vigentes: altere só o que mudou. A versão anterior termina no dia anterior à vigência e fechamentos já fechados não mudam." maxWidth="max-w-2xl">
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (from) void save(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold">Vigente a partir de *<input type="date" required className={input} value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="space-y-1.5 text-sm font-semibold">Nome da versão (opcional)<input className={input} value={version} maxLength={40} placeholder="Ex.: 2027-01" onChange={(event) => setVersion(event.target.value)} /></label>
        </div>

        {group.type === 'FGTS' && <label className="block space-y-1.5 text-sm font-semibold">Alíquota (%)<input type="number" step="0.01" min="0.1" max="50" className={input} value={rows[0]?.rate ?? ''} onChange={(event) => set(0, 'rate', event.target.value)} /></label>}

        {bracketed && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_110px_110px_auto] gap-2 text-xs font-semibold text-fg-sub"><span>Até (R$) — vazio = sem teto</span><span>Alíquota %</span><span>{group.type === 'IRRF' ? 'Dedução R$' : ''}</span><span /></div>
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

        {group.type === 'IRRF' && <div className="grid gap-3 sm:grid-cols-2">{IRRF_FIELDS.map(([key, label]) => <label key={key} className="space-y-1.5 text-sm font-semibold">{label}<input type="number" step="any" min="0" className={input} value={params[key] ?? ''} onChange={(event) => setParams({ ...params, [key]: event.target.value })} /></label>)}</div>}
        {group.type === 'PAYROLL_PARAMS' && <div className="grid gap-3 sm:grid-cols-2">{PARAM_FIELDS.map(([key, label, hint]) => <label key={key} className="space-y-1.5 text-sm font-semibold">{label}<input type="number" step="any" min="0" className={input} value={params[key] ?? ''} onChange={(event) => setParams({ ...params, [key]: event.target.value })} /><span className="block text-xs font-normal text-fg-sub">{hint}</span></label>)}</div>}

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-3"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={!from}>Salvar versão</Button></div>
      </form>
    </Modal>
  );
}

// ---------- cartão de regra ----------

function BracketTable({ group, version }: { group: RuleGroup; version: RuleVersion }) {
  if (group.type === 'FGTS' || group.type === 'PAYROLL_PARAMS') return null;
  let previous = 0;
  return (
    <table className="mt-2 w-full text-left text-xs">
      <thead className="text-fg-mut"><tr><th className="py-1 font-semibold">Faixa</th><th className="py-1 font-semibold">Alíquota</th>{group.type === 'IRRF' && <th className="py-1 font-semibold">Dedução</th>}</tr></thead>
      <tbody>
        {version.brackets.map((b, i) => {
          const from = previous; previous = b.limit ?? previous;
          return <tr key={i} className="border-t border-border/60"><td className="py-1 tabular-nums">{i === 0 ? 'Até' : `De ${money(from)} até`} {b.limit == null ? 'sem teto' : money(b.limit)}</td><td className="py-1 tabular-nums">{pct(b.rate)}</td>{group.type === 'IRRF' && <td className="py-1 tabular-nums">{money(b.deduction ?? 0)}</td>}</tr>;
        })}
      </tbody>
    </table>
  );
}

function RuleCard({ group, canEdit, onNew, onChanged }: { group: RuleGroup; canEdit: boolean; onNew: () => void; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const meta = GROUP_META[group.type];
  const today = todayIso();
  const future = group.history.filter((v) => v.active && v.effectiveFrom.slice(0, 10) > today);

  async function deactivate(version: RuleVersion) {
    if (!window.confirm(`Desativar a versão ${version.version}? Os cálculos passam a usar a versão anterior.`)) return;
    try { await platformHub.deactivateRule(version.id); toast.success('Versão desativada.'); onChanged(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível desativar.')); }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-bg shadow-sm" aria-label={group.label}>
      <div className={`flex items-center gap-3 bg-gradient-to-r ${meta.tone} p-4 text-white`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xs font-black">{meta.icon}</span>
        <div className="min-w-0 flex-1"><h2 className="text-base font-black">{group.label}</h2><p className="text-xs text-white/85">{meta.what}</p></div>
        {canEdit && <button type="button" onClick={onNew} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold text-slate-900 hover:bg-slate-100"><Plus size={14} aria-hidden="true" /> Nova versão</button>}
      </div>
      <div className="space-y-3 p-4">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          {group.current ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800"><CheckCircle2 size={12} aria-hidden="true" /> Versão {group.current.version} vigente</span>
            : <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">Padrão embutido</span>}
          <span className="text-fg-sub">{summary(group)}</span>
        </p>
        {group.current && <p className="text-xs text-fg-sub">Vigente desde {date(group.current.effectiveFrom)}{group.current.effectiveTo ? ` até ${date(group.current.effectiveTo)}` : ''}.</p>}
        {future.length > 0 && (
          <p className="flex items-center gap-2 rounded-xl bg-sky-50 p-2.5 text-xs font-semibold text-sky-900"><CalendarClock size={14} aria-hidden="true" /> Agendada: versão {future[0].version} entra em {date(future[0].effectiveFrom)}.</p>
        )}
        {group.current && <BracketTable group={group} version={group.current} />}
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-xs font-bold text-purple-700"><ChevronDown size={13} className={open ? 'rotate-180' : ''} aria-hidden="true" /> Histórico de versões ({group.history.length})</button>
        {open && (
          <ul className="divide-y divide-border rounded-xl border border-border text-xs">
            {group.history.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span><strong>{version.version}</strong> · {date(version.effectiveFrom)}{version.effectiveTo ? ` a ${date(version.effectiveTo)}` : ' em diante'}{!version.active && <em className="ml-1 text-rose-600">desativada</em>}</span>
                {canEdit && version.active && <button type="button" className="font-bold text-rose-600" onClick={() => deactivate(version)}>Desativar</button>}
              </li>
            ))}
            {group.history.length === 0 && <li className="px-3 py-2 text-fg-sub">Nenhuma versão cadastrada.</li>}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------- simulador ----------

const PRESETS: Array<{ label: string; values: Record<string, string> }> = [
  { label: 'Salário mínimo', values: { salary: '1621', dependents: '0', overtime50Minutes: '0', overtime100Minutes: '0', nightShiftMinutes: '0', absenceMinutes: '0' } },
  { label: 'R$ 5.000 com extras', values: { salary: '5000', dependents: '0', overtime50Minutes: '600', overtime100Minutes: '0', nightShiftMinutes: '0', absenceMinutes: '0' } },
  { label: 'R$ 9.000, 2 dependentes', values: { salary: '9000', dependents: '2', overtime50Minutes: '0', overtime100Minutes: '0', nightShiftMinutes: '0', absenceMinutes: '0' } },
];

function Simulator() {
  const [form, setForm] = useState<Record<string, string>>(PRESETS[1].values);
  const [referenceDate, setReferenceDate] = useState('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(values = form) {
    setBusy(true); setError('');
    try { setResult(await platformHub.simulate({ ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value || 0)])), ...(referenceDate ? { referenceDate } : {}) })); }
    catch (cause) { setError(errorText(cause, 'Não foi possível simular.')); setResult(null); }
    finally { setBusy(false); }
  }
  useEffect(() => { void run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const r = result?.result;
  const fields: [string, string][] = [['salary', 'Salário (R$)'], ['dependents', 'Dependentes'], ['overtime50Minutes', 'HE 50% (min)'], ['overtime100Minutes', 'HE 100% (min)'], ['nightShiftMinutes', 'Noturno (min)'], ['absenceMinutes', 'Faltas (min)']];
  const lines: [string, number, 'plus' | 'minus' | 'neutral' | 'total'][] = r ? [
    ['Salário base', r.salaryBase, 'plus'], ['Horas extras 50%', r.overtime50Value, 'plus'], ['Horas extras 100%', r.overtime100Value, 'plus'], ['Adicional noturno', r.nightShiftValue, 'plus'], ['DSR', r.dsrValue, 'plus'],
    ['Desconto de faltas', r.absenceDiscount, 'minus'], ['Salário bruto', r.grossPay, 'total'], ['INSS', r.inssDiscount, 'minus'], ['IRRF', r.irrfDiscount, 'minus'], ['Salário líquido', r.netPay, 'total'], ['FGTS (encargo patronal)', r.fgtsAmount, 'neutral'],
  ] : [];

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-bg p-5 shadow-sm" aria-label="Simulador">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-base font-black text-fg">Simulador de holerite</h2><p className="text-sm text-fg-sub">Mostra exatamente o que o fechamento calcula com as regras vigentes na data escolhida.</p></div>
        <div className="flex flex-wrap gap-1.5">{PRESETS.map((p) => <button key={p.label} type="button" onClick={() => { setForm(p.values); void run(p.values); }} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-fg-sub hover:bg-bg-sub">{p.label}</button>)}</div>
      </header>
      <form className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        {fields.map(([key, label]) => <label key={key} className="space-y-1 text-xs font-semibold">{label}<input type="number" min="0" step="any" className={input} value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
        <label className="space-y-1 text-xs font-semibold">Regras de<input type="date" className={input} value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} /></label>
        <div className="sm:col-span-3 lg:col-span-7"><Button type="submit" isLoading={busy}>Simular</Button></div>
      </form>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
      {r && result && (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <dl className="rounded-2xl border border-border p-4 text-sm">
            {lines.map(([label, value, kind]) => (
              <div key={label} className={`flex justify-between gap-3 py-1.5 ${kind === 'total' ? 'mt-1 border-t border-border pt-2.5 text-base font-black' : 'border-b border-border/50'}`}>
                <dt className={kind === 'neutral' ? 'text-fg-mut' : 'text-fg-sub'}>{label}</dt>
                <dd className={`tabular-nums ${kind === 'minus' ? 'text-rose-600' : kind === 'total' && label.includes('líquido') ? 'text-emerald-600' : ''}`}>{kind === 'minus' ? '− ' : ''}{money(value)}</dd>
              </div>
            ))}
            <p className="mt-2 text-xs text-fg-mut">Valor da hora: R$ {r.hourlyRate.toFixed(2)} · base do IRRF {money(r.irrfBase)}</p>
          </dl>
          <div className="space-y-1 rounded-2xl bg-bg-sub p-4 text-xs text-fg-sub">
            <p className="font-bold text-fg">Regras usadas</p>
            <p>Referência: {date(result.referenceDate)}</p>
            <p>INSS {result.rulesUsed.inss} · IRRF {result.rulesUsed.irrf}</p>
            <p>FGTS {result.rulesUsed.fgts ?? '—'} ({pct(result.rulesUsed.fgtsRate ?? 0)}) · Params {result.rulesUsed.params ?? '—'}</p>
            {result.rulesUsed.builtin.length > 0 && <p className="pt-1 font-semibold text-amber-700">Padrão embutido em: {result.rulesUsed.builtin.join(', ')}. Cadastre versões para controlar.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

export function RulesPanel({ canEdit }: { canEdit: boolean }) {
  const rules = useQuery(() => platformHub.rules(), []);
  const [editing, setEditing] = useState<RuleGroup | null>(null);
  const embedded = useMemo(() => (rules.data?.rules ?? []).filter((g) => !g.current).length, [rules.data]);

  if (rules.error) return <ErrorState message={rules.error} onRetry={rules.refetch} />;
  if (rules.loading && !rules.data) return <LoadingState label="Carregando regras…" />;

  return (
    <div className="space-y-5">
      <p className={`flex items-center gap-2 rounded-2xl border p-3.5 text-sm font-semibold ${embedded ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>
        <CheckCircle2 size={17} aria-hidden="true" />
        {embedded ? `${embedded} regra(s) ainda usam o padrão embutido. Cadastre uma versão para ter controle e histórico.` : 'Todas as regras têm versão cadastrada. Referência: ' + date(rules.data?.referenceDate) + '.'}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {(rules.data?.rules ?? []).map((group) => <RuleCard key={group.type} group={group} canEdit={canEdit} onNew={() => setEditing(group)} onChanged={rules.refetch} />)}
      </div>
      <Simulator />
      <RuleEditor group={editing} onClose={() => setEditing(null)} onSaved={rules.refetch} />
    </div>
  );
}
