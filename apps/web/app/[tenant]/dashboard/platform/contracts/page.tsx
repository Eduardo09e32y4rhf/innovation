'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, FileSignature, Loader2, RefreshCw } from 'lucide-react';
import { request } from '@/app/lib/api';

type Company = { id: string; name: string };
type Contract = { id: string; company?: Company; agreedAmount: number | string; seatQuantity: number; startsAt: string; endsAt?: string; paymentMethod: string; status: string };

const initialForm = { companyId: '', seatQuantity: 1, agreedAmount: '', startsAt: '', endsAt: '', paymentMethod: 'EXTERNAL', notes: '' };

export default function ContractsPage() {
  const [items, setItems] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [contracts, companyItems] = await Promise.all([request<Contract[]>('/manual-contracts'), request<Company[]>('/platform/companies')]);
      setItems(contracts);
      setCompanies(companyItems.filter((company) => company.id && company.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os contratos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await request('/manual-contracts', {
        method: 'POST',
        body: {
          ...form,
          agreedAmount: Number(form.agreedAmount),
          startsAt: new Date(`${form.startsAt}T12:00:00`).toISOString(),
          endsAt: form.endsAt ? new Date(`${form.endsAt}T12:00:00`).toISOString() : undefined,
        },
      });
      setForm(initialForm);
      setSuccess('Contrato criado e vinculado a empresa.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar contrato.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><FileSignature size={19} /></div><div><h2 className="text-lg font-black text-slate-950">Contratos digitais</h2><p className="mt-1 text-xs text-slate-500">Crie e acompanhe contratos manuais sem sair do console da plataforma.</p></div></div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar</button>
      </header>

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-slate-600">Empresa<select required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"><option value="">Selecione a empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600">Licencas<input required type="number" min={1} value={form.seatQuantity} onChange={(e) => setForm({ ...form, seatQuantity: Number(e.target.value) })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-violet-500" /></label>
        <label className="text-xs font-bold text-slate-600">Valor acordado<input required type="number" min="0.01" step="0.01" value={form.agreedAmount} onChange={(e) => setForm({ ...form, agreedAmount: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-violet-500" placeholder="R$ 0,00" /></label>
        <label className="text-xs font-bold text-slate-600">Forma de pagamento<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"><option value="ASAAS">Asaas</option><option value="BANK_TRANSFER">Transferencia</option><option value="EXTERNAL">Externo</option></select></label>
        <label className="text-xs font-bold text-slate-600">Inicio<input required type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" /></label>
        <label className="text-xs font-bold text-slate-600">Fim (opcional)<input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" /></label>
        <label className="text-xs font-bold text-slate-600 md:col-span-2">Observacoes<input required value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-violet-500" placeholder="Motivo e observacoes" /></label>
        <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 xl:col-span-4">{saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{saving ? 'Criando contrato...' : 'Criar contrato manual'}</button>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 xl:col-span-4">{error}</p>}
        {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 xl:col-span-4">{success}</p>}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-sm font-black text-slate-900">Contratos cadastrados</h3><p className="mt-1 text-xs text-slate-500">{items.length} contrato(s) encontrado(s).</p></div>{loading ? <p className="p-8 text-center text-sm text-slate-500">Carregando contratos...</p> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhum contrato cadastrado.</p> : <div className="overflow-x-auto"><table className="min-w-[860px] w-full text-left text-xs"><thead><tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><th className="p-4">Empresa</th><th className="p-4">Valor</th><th className="p-4">Licencas</th><th className="p-4">Inicio</th><th className="p-4">Fim</th><th className="p-4">Pagamento</th><th className="p-4">Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="p-4 font-bold text-slate-900">{item.company?.name || 'Empresa'}</td><td className="p-4 font-bold text-slate-800">{Number(item.agreedAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="p-4 text-slate-600">{item.seatQuantity}</td><td className="p-4 text-slate-600">{new Date(item.startsAt).toLocaleDateString('pt-BR')}</td><td className="p-4 text-slate-600">{item.endsAt ? new Date(item.endsAt).toLocaleDateString('pt-BR') : 'Indeterminado'}</td><td className="p-4 text-slate-600">{item.paymentMethod}</td><td className="p-4"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{item.status}</span></td></tr>)}</tbody></table></div>}</section>
    </div>
  );
}
