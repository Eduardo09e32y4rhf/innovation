'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { request } from '@/app/lib/api';

type CouponType = 'TRIAL_DAYS' | 'PERCENT' | 'FIXED';
interface Coupon {
  id: string; code: string; description?: string | null; type: CouponType; value?: string | number | null; durationCycles?: number | null;
  trialDays: number; minSeats?: number | null; allowedPlanIds: string[]; maxRedemptions?: number | null; redemptionCount: number;
  startsAt?: string | null; expiresAt?: string | null; isActive: boolean;
}
interface PlanOption { id: string; name: string }

const TYPE_LABEL: Record<CouponType, string> = { TRIAL_DAYS: 'Dias de teste grátis', PERCENT: 'Desconto em %', FIXED: 'Desconto em R$ por mês' };
const EMPTY = { code: '', description: '', type: 'PERCENT' as CouponType, value: '', durationCycles: '', trialDays: '30', minSeats: '', maxRedemptions: '', startsAt: '', expiresAt: '', allowedPlanIds: [] as string[] };
const field = 'input-v2 min-h-11 w-full text-sm';
const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');
const money = (value: unknown) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function describe(item: Coupon) {
  if (item.type === 'PERCENT') return `${Number(item.value)}% de desconto${item.durationCycles ? ` por ${item.durationCycles} ciclo(s)` : ''}`;
  if (item.type === 'FIXED') return `${money(item.value)} a menos por mês${item.durationCycles ? ` por ${item.durationCycles} ciclo(s)` : ''}`;
  return `${item.trialDays} dias de teste`;
}

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await request<Coupon[]>('/coupons')); setLoadError(''); }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Falha ao carregar cupons.'); }
  }, []);
  useEffect(() => {
    void load();
    request<PlanOption[]>('/platform/plans').then(setPlans).catch(() => setPlans([]));
  }, [load]);

  function reset() { setEditing(null); setForm(EMPTY); setError(''); }
  function edit(item: Coupon) {
    setEditing(item); setError('');
    setForm({
      code: item.code, description: item.description ?? '', type: item.type, value: item.value != null ? String(Number(item.value)) : '', durationCycles: item.durationCycles ? String(item.durationCycles) : '',
      trialDays: String(item.trialDays || 30), minSeats: item.minSeats ? String(item.minSeats) : '', maxRedemptions: item.maxRedemptions ? String(item.maxRedemptions) : '',
      startsAt: item.startsAt ? item.startsAt.slice(0, 10) : '', expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : '', allowedPlanIds: item.allowedPlanIds ?? [],
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setSaving(true);
    const discount = form.type !== 'TRIAL_DAYS';
    const payload: Record<string, unknown> = {
      description: form.description.trim() || undefined,
      allowedPlanIds: form.allowedPlanIds, ...(form.minSeats ? { minSeats: Number(form.minSeats) } : {}),
      ...(form.maxRedemptions ? { maxRedemptions: Number(form.maxRedemptions) } : {}),
      ...(form.startsAt ? { startsAt: form.startsAt } : {}), ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
      ...(discount ? { value: Number(form.value), ...(form.durationCycles ? { durationCycles: Number(form.durationCycles) } : {}) } : { trialDays: Number(form.trialDays) }),
    };
    try {
      if (editing) await request(`/coupons/${editing.id}`, { method: 'PATCH', body: payload });
      else await request('/coupons', { method: 'POST', body: { ...payload, code: form.code.trim().toUpperCase(), type: form.type } });
      toast.success(editing ? 'Cupom atualizado.' : 'Cupom criado.');
      reset(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o cupom.'); }
    finally { setSaving(false); }
  }

  async function toggle(item: Coupon) {
    try { await request(`/coupons/${item.id}/${item.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' }); await load(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Não foi possível alterar o cupom.'); }
  }

  const locked = Boolean(editing && editing.redemptionCount > 0);
  const discount = form.type !== 'TRIAL_DAYS';

  return (
    <div className="grid gap-5 p-3 sm:p-5 xl:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="card-v2 h-fit space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{editing ? `Editar ${editing.code}` : 'Novo cupom'}</h2>
          {editing && <button type="button" onClick={reset} className="text-xs font-semibold text-fg-sub hover:text-fg">Limpar</button>}
        </div>
        <label className="block text-xs font-medium text-fg-sub">Tipo
          <select className={`${field} mt-1`} value={form.type} disabled={Boolean(editing)} onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}>
            {(Object.keys(TYPE_LABEL) as CouponType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-fg-sub">Código
          <input required className={`${field} mt-1 uppercase`} value={form.code} disabled={locked} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EX.: LANCAMENTO20" /></label>
        <label className="block text-xs font-medium text-fg-sub">Descrição<input className={`${field} mt-1`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>

        {discount ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-fg-sub">{form.type === 'PERCENT' ? 'Desconto (%)' : 'Desconto (R$/mês)'}
              <input required type="number" min={0.01} max={form.type === 'PERCENT' ? 100 : 100000} step="0.01" className={`${field} mt-1`} value={form.value} disabled={locked} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label>
            <label className="block text-xs font-medium text-fg-sub">Vale por (ciclos)
              <input type="number" min={1} max={120} className={`${field} mt-1`} value={form.durationCycles} disabled={locked} placeholder="sempre" onChange={(e) => setForm({ ...form, durationCycles: e.target.value })} /></label>
          </div>
        ) : (
          <label className="block text-xs font-medium text-fg-sub">Dias de teste grátis<input type="number" min={1} max={365} className={`${field} mt-1`} value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} /></label>
        )}
        {discount && <p className="text-[11px] text-fg-sub">Acima de 20% (ou R$ 100/mês) só DEV ou CEO podem criar. {locked ? 'Valor e duração não mudam depois do primeiro uso.' : ''}</p>}

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-fg-sub">Limite de usos<input type="number" min={1} className={`${field} mt-1`} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="sem limite" /></label>
          <label className="block text-xs font-medium text-fg-sub">Mín. de usuários<input type="number" min={1} className={`${field} mt-1`} value={form.minSeats} onChange={(e) => setForm({ ...form, minSeats: e.target.value })} placeholder="nenhum" /></label>
          <label className="block text-xs font-medium text-fg-sub">Início<input type="date" className={`${field} mt-1`} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
          <label className="block text-xs font-medium text-fg-sub">Fim<input type="date" className={`${field} mt-1`} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
        </div>

        {plans.length > 0 && (
          <fieldset className="space-y-1">
            <legend className="text-xs font-medium text-fg-sub">Planos válidos <span className="font-normal">(nenhum marcado = todos)</span></legend>
            {plans.map((plan) => (
              <label key={plan.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowedPlanIds.includes(plan.id)}
                onChange={() => setForm({ ...form, allowedPlanIds: form.allowedPlanIds.includes(plan.id) ? form.allowedPlanIds.filter((id) => id !== plan.id) : [...form.allowedPlanIds, plan.id] })} />{plan.name}</label>
            ))}
          </fieldset>
        )}

        <Button type="submit" isLoading={saving} className="w-full">{editing ? 'Salvar alterações' : 'Criar cupom'}</Button>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
      </form>

      <div className="card-v2 overflow-x-auto">
        {loadError && <p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{loadError}</p>}
        <table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Cupons</caption>
          <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Código', 'Benefício', 'Usos', 'Validade', 'Situação', ''].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-semibold">{item.code}{item.description && <span className="block text-xs font-normal text-fg-sub">{item.description}</span>}</th>
                <td className="px-4 py-3">{describe(item)}{item.minSeats ? <span className="block text-xs text-fg-sub">a partir de {item.minSeats} usuários</span> : null}</td>
                <td className="px-4 py-3 tabular-nums">{item.redemptionCount}{item.maxRedemptions ? ` / ${item.maxRedemptions}` : ''}</td>
                <td className="px-4 py-3 text-xs text-fg-sub">{date(item.startsAt)} → {date(item.expiresAt)}</td>
                <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${item.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'}`}>{item.isActive ? 'Ativo' : 'Inativo'}</span></td>
                <td className="px-4 py-3"><span className="flex gap-2"><Button variant="outline" size="sm" onClick={() => edit(item)}>Editar</Button><Button variant="outline" size="sm" onClick={() => toggle(item)}>{item.isActive ? 'Desativar' : 'Ativar'}</Button></span></td>
              </tr>
            ))}
            {items.length === 0 && !loadError && <tr><td colSpan={6} className="p-8 text-center text-fg-sub">Nenhum cupom cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
