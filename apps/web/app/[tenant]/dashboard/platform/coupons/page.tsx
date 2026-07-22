'use client';

import { FormEvent, useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

export default function CouponsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ code: '', description: '', trialDays: 30, maxRedemptions: '' });
  const load = () => request<any[]>('/coupons').then(setItems).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      await request('/coupons', { method: 'POST', body: { ...form, maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined } });
      setForm({ code: '', description: '', trialDays: 30, maxRedemptions: '' }); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao criar cupom.'); }
  }
  async function toggle(id: string, active: boolean) { await request(`/coupons/${id}/${active ? 'deactivate' : 'activate'}`, { method: 'PATCH' }); await load(); }
  return <div className="grid gap-5 xl:grid-cols-[360px,1fr]"><form onSubmit={submit} className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-black">Novo cupom de trial</h2><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Código" className="h-11 w-full rounded-xl border px-3" /><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" className="h-11 w-full rounded-xl border px-3" /><div className="grid grid-cols-2 gap-2"><input type="number" min={1} max={365} value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} className="h-11 rounded-xl border px-3" aria-label="Dias de trial" /><input type="number" min={1} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="Limite" className="h-11 rounded-xl border px-3" /></div><button className="h-11 w-full rounded-xl bg-violet-600 font-bold text-white">Criar cupom</button>{error && <p className="text-sm text-rose-600">{error}</p>}</form><div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[700px] w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Código</th><th className="p-4">Trial</th><th className="p-4">Resgates</th><th className="p-4">Status</th><th className="p-4">Ação</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b"><td className="p-4 font-black">{item.code}</td><td className="p-4">{item.trialDays} dias</td><td className="p-4">{item.redemptionCount}{item.maxRedemptions ? ` / ${item.maxRedemptions}` : ''}</td><td className="p-4">{item.isActive ? 'Ativo' : 'Inativo'}</td><td className="p-4"><button onClick={() => toggle(item.id, item.isActive)} className="rounded-lg border px-3 py-2 font-bold">{item.isActive ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody></table></div></div>;
}
