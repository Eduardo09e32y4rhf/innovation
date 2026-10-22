'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, ConfirmDialog, Modal } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { api, type DeductionRule, type DeductionRuleInput } from '@/app/lib/api';
import { cardClass, errorText, inputClass } from './types';
import { useGuard } from '@/app/hooks/use-action';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const SCOPE_LABEL = { ALL: 'Todos os funcionários', POSITION: 'Por cargo', DEPARTMENT: 'Por setor', EMPLOYEE: 'Pessoas escolhidas' } as const;
const EMPTY: DeductionRuleInput = { name: '', category: 'BENEFIT', kind: 'PERCENT', value: 0, base: 'GROSS', maxAmount: null, scope: 'ALL', targets: [], startDate: null, endDate: null, isActive: true };

function describe(rule: DeductionRule) {
  const amount = rule.kind === 'PERCENT' ? `${rule.value}% ${rule.base === 'SALARY' ? 'do salário base' : 'do bruto'}${rule.maxAmount ? ` (teto ${brl(rule.maxAmount)})` : ''}` : brl(rule.value);
  return amount;
}

/** Descontos da empresa no fechamento e na folha: benefícios (vale-transporte, plano de saúde...) e outros. */
export function DeductionsSection({ canEdit }: { canEdit: boolean }) {
  const data = useQuery(() => api.deductionRules.list(), []);
  const people = useQuery(() => api.employees.list(), [], { enabled: canEdit });
  const [editing, setEditing] = useState<{ id?: string; form: DeductionRuleInput } | null>(null);
  const [removing, setRemoving] = useState<DeductionRule | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { if (!editing) setSearch(''); }, [editing]);
  const rules = data.data?.rules ?? [];
  const nameOf = (id: string) => (people.data ?? []).find((p) => p.id === id)?.name ?? id.slice(0, 8);
  const form = editing?.form;
  const patch = (changes: Partial<DeductionRuleInput>) => setEditing((current) => (current ? { ...current, form: { ...current.form, ...changes } } : current));

  const options = useMemo(() => {
    if (!form) return [] as { id: string; label: string }[];
    const items = form.scope === 'POSITION' ? (data.data?.positions ?? []).map((p) => ({ id: p, label: p }))
      : form.scope === 'DEPARTMENT' ? (data.data?.departments ?? []).map((d) => ({ id: d, label: d }))
      : form.scope === 'EMPLOYEE' ? (people.data ?? []).filter((p) => p.status !== 'TERMINATED').map((p) => ({ id: p.id, label: p.name })) : [];
    return items.filter((i) => !search.trim() || i.label.toLowerCase().includes(search.trim().toLowerCase()));
  }, [form, data.data, people.data, search]);

  const problem = !form ? '' : form.name.trim().length < 2 ? 'Informe o nome (ex.: Vale-transporte).' : !(Number(form.value) > 0) ? 'Informe um valor maior que zero.'
    : form.kind === 'PERCENT' && Number(form.value) > 100 ? 'O percentual não pode passar de 100%.'
    : form.scope !== 'ALL' && form.targets.length === 0 ? 'Marque ao menos um item da lista.' : '';

  async function save() {
    if (!editing || problem) return;
    setBusy(true);
    try {
      const body = { ...editing.form, value: Number(editing.form.value), maxAmount: editing.form.maxAmount ? Number(editing.form.maxAmount) : null };
      if (editing.id) await api.deductionRules.update(editing.id, body); else await api.deductionRules.create(body);
      toast.success('Desconto salvo. Vale para os próximos fechamentos e folhas (recalcule os rascunhos do mês para aplicar).');
      setEditing(null); data.refetch();
    } catch (cause) { toast.error(errorText(cause, 'Não foi possível salvar.')); }
    finally { setBusy(false); }
  }
  const { guard } = useGuard();
  const toggle = guard('toggle', async (rule: DeductionRule) => {
    try { await api.deductionRules.update(rule.id, { isActive: !rule.isActive }); data.refetch(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível alterar.')); }
  });
  async function remove() {
    if (!removing) return;
    setBusy(true);
    try { await api.deductionRules.remove(removing.id); toast.success('Desconto removido.'); setRemoving(null); data.refetch(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível remover.')); }
    finally { setBusy(false); }
  }

  if (data.loading && !data.data) return <LoadingState label="Carregando descontos…" />;
  if (data.error) return <ErrorState message={data.error} onRetry={data.refetch} />;

  return (
    <section className={`${cardClass} space-y-5`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-fg">Descontos e benefícios</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-sub">Descontos da empresa que entram no fechamento e na folha, depois do INSS e do IRRF. Valem para todos, por cargo, por setor ou só para pessoas escolhidas. INSS, IRRF e FGTS já são calculados sozinhos pelas tabelas oficiais.</p>
        </div>
        {canEdit && <Button onClick={() => setEditing({ form: { ...EMPTY } })}><Plus size={16} aria-hidden="true" /> Novo desconto</Button>}
      </header>

      {rules.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-sub">Nenhum desconto cadastrado. Exemplos: vale-transporte (6% do salário base, para todos), plano de saúde (valor fixo por cargo), coparticipação.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rules.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-fg">{rule.name} <span className="ml-1 rounded-full bg-bg-sub px-2 py-0.5 text-[11px] font-medium text-fg-sub">{rule.category === 'BENEFIT' ? 'Benefício' : 'Outro'}</span>{!rule.isActive && <span className="ml-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[11px]">Desligado</span>}</p>
                <p className="text-sm text-fg-sub">{describe(rule)} · {SCOPE_LABEL[rule.scope]}{rule.scope !== 'ALL' ? `: ${rule.targets.slice(0, 4).map((t) => (rule.scope === 'EMPLOYEE' ? nameOf(t) : t)).join(', ')}${rule.targets.length > 4 ? ` +${rule.targets.length - 4}` : ''}` : ''}{rule.startDate || rule.endDate ? ` · vigência ${rule.startDate ? rule.startDate.slice(0, 10).split('-').reverse().join('/') : 'sempre'} a ${rule.endDate ? rule.endDate.slice(0, 10).split('-').reverse().join('/') : 'sem fim'}` : ''}</p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void toggle(rule)}>{rule.isActive ? 'Desligar' : 'Ligar'}</Button>
                  <Button size="sm" variant="outline" aria-label={`Editar ${rule.name}`} onClick={() => setEditing({ id: rule.id, form: { name: rule.name, category: rule.category, kind: rule.kind, value: rule.value, base: rule.base, maxAmount: rule.maxAmount, scope: rule.scope, targets: rule.targets, startDate: rule.startDate?.slice(0, 10) ?? null, endDate: rule.endDate?.slice(0, 10) ?? null, isActive: rule.isActive } })}><Pencil size={14} aria-hidden="true" /></Button>
                  <Button size="sm" variant="danger" aria-label={`Remover ${rule.name}`} onClick={() => setRemoving(rule)}><Trash2 size={14} aria-hidden="true" /></Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!canEdit && <p className="text-xs text-fg-sub">Seu perfil só consulta os descontos.</p>}

      <Modal isOpen={Boolean(editing)} onClose={() => !busy && setEditing(null)} title={editing?.id ? 'Editar desconto' : 'Novo desconto'} maxWidth="max-w-2xl"
        footer={<div className="flex items-center justify-end gap-2">{problem && <span className="mr-auto text-xs text-rose-700">{problem}</span>}<Button variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button><Button isLoading={busy} disabled={Boolean(problem)} onClick={() => void save()}>Salvar</Button></div>}>
        {form && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">Nome<input className={inputClass} maxLength={80} placeholder="Ex.: Vale-transporte" value={form.name} onChange={(e) => patch({ name: e.target.value })} /></label>
              <label className="block text-sm font-medium">Tipo<select className={inputClass} value={form.category} onChange={(e) => patch({ category: e.target.value as DeductionRuleInput['category'] })}><option value="BENEFIT">Benefício</option><option value="OTHER">Outro desconto</option></select></label>
              <label className="block text-sm font-medium">Como calcular<select className={inputClass} value={form.kind} onChange={(e) => patch({ kind: e.target.value as DeductionRuleInput['kind'] })}><option value="PERCENT">Percentual (%)</option><option value="FIXED">Valor fixo (R$)</option></select></label>
              <label className="block text-sm font-medium">{form.kind === 'PERCENT' ? 'Percentual (%)' : 'Valor (R$)'}<input className={inputClass} inputMode="decimal" value={form.value || ''} onChange={(e) => patch({ value: Number(e.target.value.replace(',', '.')) || 0 })} /></label>
              {form.kind === 'PERCENT' && <label className="block text-sm font-medium">Sobre<select className={inputClass} value={form.base} onChange={(e) => patch({ base: e.target.value as DeductionRuleInput['base'] })}><option value="GROSS">O bruto do mês</option><option value="SALARY">O salário base</option></select></label>}
              <label className="block text-sm font-medium">Teto em R$ (opcional)<input className={inputClass} inputMode="decimal" placeholder="sem teto" value={form.maxAmount ?? ''} onChange={(e) => patch({ maxAmount: e.target.value ? Number(e.target.value.replace(',', '.')) || null : null })} /></label>
              <label className="block text-sm font-medium">Vale a partir de<input type="date" className={inputClass} value={form.startDate ?? ''} onChange={(e) => patch({ startDate: e.target.value || null })} /></label>
              <label className="block text-sm font-medium">Vale até (opcional)<input type="date" className={inputClass} min={form.startDate ?? undefined} value={form.endDate ?? ''} onChange={(e) => patch({ endDate: e.target.value || null })} /></label>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">A quem se aplica</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SCOPE_LABEL) as Array<keyof typeof SCOPE_LABEL>).map((scope) => (
                  <button key={scope} type="button" aria-pressed={form.scope === scope} onClick={() => patch({ scope, targets: [] })} className={`min-h-10 rounded-full border px-4 text-sm font-medium ${form.scope === scope ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-border text-fg-sub hover:bg-bg-sub'}`}>{SCOPE_LABEL[scope]}</button>
                ))}
              </div>
              {form.scope !== 'ALL' && (
                <div className="mt-3 space-y-2">
                  <input className={inputClass} placeholder="Buscar…" aria-label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                    {options.map((o) => (
                      <li key={o.id}><label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-bg-sub"><input type="checkbox" checked={form.targets.includes(o.id)} onChange={() => patch({ targets: form.targets.includes(o.id) ? form.targets.filter((t) => t !== o.id) : [...form.targets, o.id] })} />{o.label}</label></li>
                    ))}
                    {options.length === 0 && <li className="p-4 text-center text-sm text-fg-sub">Nada para escolher ainda.</li>}
                  </ul>
                  <p className="text-xs text-fg-sub">{form.targets.length} selecionado(s).</p>
                </div>
              )}
            </fieldset>
          </div>
        )}
      </Modal>
      <ConfirmDialog isOpen={Boolean(removing)} onClose={() => !busy && setRemoving(null)} onConfirm={remove} isLoading={busy} variant="danger" title="Remover desconto" confirmText="Remover" description={`Remover "${removing?.name ?? ''}"? Fechamentos já fechados não mudam; os próximos deixam de aplicar este desconto.`} />
    </section>
  );
}
