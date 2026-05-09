"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Check, Plus, RefreshCw, Search, X } from 'lucide-react';
import {
  CreateFinanceTransactionInput,
  FinanceStatus,
  FinanceTransaction,
  FinanceType,
  createFinanceTransaction,
  formatCurrency,
  formatDate,
  getFinanceTransactions,
  inferFinanceCategory,
  toNumber,
  updateFinanceTransaction,
} from '../api';

const categorias = ['SaaS', 'Serviços', 'Consultoria', 'Marketing', 'Tecnologia', 'Infraestrutura', 'Outros'];

const statusLabel: Record<FinanceStatus, string> = {
  PAID: 'confirmado',
  PENDING: 'pendente',
  CANCELED: 'cancelado',
};

export default function LancamentosPage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CreateFinanceTransactionInput>({
    description: '',
    amount: 0,
    type: 'REVENUE',
    status: 'PENDING',
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const load = async () => {
    setLoading(true);
    setTransactions(await getFinanceTransactions());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const lista = useMemo(() => transactions.filter(item => {
    const typeMatch =
      filtroTipo === 'todos' ||
      (filtroTipo === 'receita' && item.type === 'REVENUE') ||
      (filtroTipo === 'despesa' && item.type === 'EXPENSE');
    return typeMatch && item.description.toLowerCase().includes(busca.toLowerCase());
  }), [busca, filtroTipo, transactions]);

  const totalReceitas = transactions.filter(item => item.type === 'REVENUE' && item.status !== 'CANCELED').reduce((sum, item) => sum + toNumber(item.amount), 0);
  const totalDespesas = transactions.filter(item => item.type === 'EXPENSE' && item.status !== 'CANCELED').reduce((sum, item) => sum + toNumber(item.amount), 0);
  const saldo = totalReceitas - totalDespesas;
  const margem = totalReceitas ? Math.round((saldo / totalReceitas) * 100) : 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      const created = await createFinanceTransaction({
        ...form,
        amount: Math.abs(Number(form.amount)),
      });
      setTransactions((items) => [created, ...items]);
      setModal(false);
      setForm({
        description: '',
        amount: 0,
        type: 'REVENUE',
        status: 'PENDING',
        dueDate: new Date().toISOString().slice(0, 10),
      });
    } finally {
      setSaving(false);
    }
  };

  const markAsPaid = async (item: FinanceTransaction) => {
    const updated = await updateFinanceTransaction(item.id, { status: 'PAID' });
    setTransactions((items) => items.map((current) => current.id === item.id ? updated : current));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="dash-card border border-teal-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-500">Total Entradas</p>
            <ArrowUpCircle size={18} className="text-teal-500" strokeWidth={1.8} />
          </div>
          <p className="text-[28px] font-black leading-none text-teal-600">{formatCurrency(totalReceitas)}</p>
          <p className="mt-1.5 text-[11px] text-gray-400">{transactions.filter(item => item.type === 'REVENUE').length} lançamentos</p>
        </div>
        <div className="dash-card border border-red-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-500">Total Saídas</p>
            <ArrowDownCircle size={18} className="text-red-400" strokeWidth={1.8} />
          </div>
          <p className="text-[28px] font-black leading-none text-red-500">{formatCurrency(totalDespesas)}</p>
          <p className="mt-1.5 text-[11px] text-gray-400">{transactions.filter(item => item.type === 'EXPENSE').length} lançamentos</p>
        </div>
        <div className="dash-card border border-gray-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-500">Resultado Líquido</p>
            <span className={`text-[11px] font-bold ${saldo >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
              {saldo >= 0 ? 'Positivo' : 'Negativo'}
            </span>
          </div>
          <p className={`text-[28px] font-black leading-none ${saldo >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{formatCurrency(saldo)}</p>
          <p className="mt-1.5 text-[11px] text-gray-400">margem {margem}%</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="search-box max-w-xs flex-1">
          <Search size={13} className="shrink-0 text-gray-400" />
          <input placeholder="Buscar lançamento..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {(['todos', 'receita', 'despesa'] as const).map(f => (
            <button key={f} onClick={() => setFiltroTipo(f)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold capitalize transition-all ${
                filtroTipo === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}>{f === 'todos' ? 'Todos' : f === 'receita' ? 'Entradas' : 'Saídas'}</button>
          ))}
        </div>
        <button onClick={load} className="btn-outline flex items-center gap-1.5" disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
        <button onClick={() => setModal(true)} className="btn-black ml-auto">
          <Plus size={13} strokeWidth={2.2} /> Novo Lançamento
        </button>
      </div>

      <div className="dash-card overflow-hidden">
        <table className="table-premium w-full">
          <thead><tr>
            {['ID', 'Descrição', 'Valor', 'Categoria', 'Data', 'Status', ''].map(h =>
              <th key={h} className="px-5">{h}</th>
            )}
          </tr></thead>
          <tbody>
            {lista.map(item => {
              const amount = toNumber(item.amount);
              return (
                <tr key={item.id} className="cursor-pointer">
                  <td className="px-5 text-[11px] font-mono text-gray-400">{item.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-5 text-[12px] font-medium text-gray-800">{item.description}</td>
                  <td className={`px-5 text-[13px] font-bold ${item.type === 'REVENUE' ? 'text-teal-600' : 'text-red-500'}`}>
                    {item.type === 'REVENUE' ? '+' : '-'}{formatCurrency(amount)}
                  </td>
                  <td className="px-5 text-[12px] text-gray-500">{inferFinanceCategory(item.description)}</td>
                  <td className="px-5 text-[12px] text-gray-500">{formatDate(item.dueDate ?? item.createdAt)}</td>
                  <td className="px-5">
                    <span className={`badge ${
                      item.status === 'PAID' ? 'badge-green' :
                      item.status === 'CANCELED' ? 'badge-red' : 'badge-amber'
                    }`}>{statusLabel[item.status]}</span>
                  </td>
                  <td className="px-5">
                    {item.status === 'PENDING'
                      ? <button onClick={() => void markAsPaid(item)} className="btn-outline flex items-center gap-1 text-[11px]">
                          <Check size={12} /> Confirmar
                        </button>
                      : <span className="text-[11px] text-gray-300">--</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <form className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()} onSubmit={submit}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-[15px] font-bold text-gray-900">Novo Lançamento</h3>
              <button type="button" onClick={() => setModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                {(['REVENUE', 'EXPENSE'] as FinanceType[]).map(type => (
                  <button key={type} type="button" onClick={() => setForm((current) => ({ ...current, type }))}
                    className={`rounded-xl border-2 py-3 text-[13px] font-bold transition-all ${
                      form.type === type
                        ? type === 'REVENUE' ? 'border-teal-400 bg-teal-50 text-teal-600' : 'border-red-300 bg-red-50 text-red-500'
                        : 'border-gray-200 text-gray-600 hover:border-gray-900'
                    }`}>{type === 'REVENUE' ? 'Entrada' : 'Saída'}</button>
                ))}
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Descrição</label>
                <input value={form.description} onChange={event => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Ex: Mensalidade cliente..." className="input-premium w-full px-3 py-2.5 text-[13px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Valor (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.amount || ''} onChange={event => setForm((current) => ({ ...current, amount: Number(event.target.value) }))}
                    placeholder="0,00" className="input-premium w-full px-3 py-2.5 text-[13px]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Data</label>
                  <input type="date" value={form.dueDate} onChange={event => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className="input-premium w-full px-3 py-2.5 text-[13px]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</label>
                  <select value={form.status} onChange={event => setForm((current) => ({ ...current, status: event.target.value as FinanceStatus }))}
                    className="input-premium w-full px-3 py-2.5 text-[13px]">
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Pago</option>
                    <option value="CANCELED">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Categoria</label>
                  <select className="input-premium w-full px-3 py-2.5 text-[13px]">
                    {categorias.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button type="button" onClick={() => setModal(false)} className="btn-outline flex-1 py-2.5">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-black flex-1 justify-center py-2.5">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
