'use client';

import { FormEvent, useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

type CouponFormState = {
  code: string;
  description: string;
  trialDays: number;
  maxRedemptions: string;
  startsAt: string;
  expiresAt: string;
};

const EMPTY_FORM: CouponFormState = {
  code: '',
  description: '',
  trialDays: 30,
  maxRedemptions: '',
  startsAt: '',
  expiresAt: '',
};

function toFormState(item?: any): CouponFormState {
  return {
    code: item?.code ?? '',
    description: item?.description ?? '',
    trialDays: Number(item?.trialDays ?? 30),
    maxRedemptions: item?.maxRedemptions ? String(item.maxRedemptions) : '',
    startsAt: item?.startsAt ? String(item.startsAt).slice(0, 10) : '',
    expiresAt: item?.expiresAt ? String(item.expiresAt).slice(0, 10) : '',
  };
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sem data' : date.toLocaleDateString('pt-BR');
}

export default function CouponsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await request<any[]>('/coupons');
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar cupons.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    setForm(toFormState(item));
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      trialDays: Number(form.trialDays),
      startsAt: form.startsAt || undefined,
      expiresAt: form.expiresAt || undefined,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
    };

    try {
      if (editingId) {
        await request(`/coupons/${editingId}`, { method: 'PATCH', body: payload });
      } else {
        await request('/coupons', { method: 'POST', body: payload });
      }
      startCreate();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : editingId ? 'Falha ao atualizar cupom.' : 'Falha ao criar cupom.');
    }
  }

  async function toggle(item: any) {
    setError('');
    try {
      await request(`/coupons/${item.id}/${item.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao alterar status do cupom.');
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px,1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-black">{editingId ? 'Editar cupom' : 'Novo cupom de trial'}</h2>
          {editingId && (
            <button type="button" onClick={startCreate} className="text-xs font-bold text-slate-500 hover:text-slate-800">
              Limpar
            </button>
          )}
        </div>
        <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Codigo" className="h-11 w-full rounded-xl border px-3" />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descricao" className="h-11 w-full rounded-xl border px-3" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={1} max={365} value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} className="h-11 rounded-xl border px-3" aria-label="Dias de trial" />
          <input type="number" min={1} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="Limite" className="h-11 rounded-xl border px-3" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="h-11 rounded-xl border px-3" />
          <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="h-11 rounded-xl border px-3" />
        </div>
        <button className="h-11 w-full rounded-xl bg-violet-600 font-bold text-white">
          {editingId ? 'Salvar alteracoes' : 'Criar cupom'}
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-[860px] w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="p-4">Codigo</th>
              <th className="p-4">Trial</th>
              <th className="p-4">Resgates</th>
              <th className="p-4">Validade</th>
              <th className="p-4">Status</th>
              <th className="p-4">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="p-4 font-black">{item.code}</td>
                <td className="p-4">{item.trialDays} dias</td>
                <td className="p-4">{item.redemptionCount}{item.maxRedemptions ? ` / ${item.maxRedemptions}` : ''}</td>
                <td className="p-4 text-xs text-slate-600">
                  <div>Inicio: {formatDate(item.startsAt)}</div>
                  <div>Fim: {formatDate(item.expiresAt)}</div>
                </td>
                <td className="p-4">{item.isActive ? 'Ativo' : 'Inativo'}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEdit(item)} className="rounded-lg border px-3 py-2 font-bold">
                      Editar
                    </button>
                    <button type="button" onClick={() => toggle(item)} className="rounded-lg border px-3 py-2 font-bold">
                      {item.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Nenhum cupom cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}