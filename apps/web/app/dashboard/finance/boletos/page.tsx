"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Download, Plus, Search, X } from 'lucide-react';
import {
  CreateFinanceTransactionInput,
  FinanceTransaction,
  FinanceType,
  createFinanceTransaction,
  formatCurrency,
  formatDate,
  getFinanceTransactions,
  toNumber,
  updateFinanceTransaction,
} from '../api';

function boletoStatus(item: FinanceTransaction) {
  if (item.status === 'PAID') return 'pago';
  if (item.status === 'CANCELED') return 'cancelado';
  if (item.dueDate && new Date(item.dueDate).getTime() < Date.now()) return 'vencido';
  return 'aberto';
}

export default function BoletosPage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'aberto' | 'vencido' | 'pago'>('todos');
  const [tipo, setTipo] = useState<'todos' | 'receber' | 'pagar'>('todos');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateFinanceTransactionInput>({
    description: '',
    amount: 0,
    type: 'REVENUE',
    status: 'PENDING',
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const load = async () => setTransactions(await getFinanceTransactions());

  useEffect(() => {
    void load();
  }, []);

  const boletos = useMemo(() => transactions.filter(item => item.dueDate), [transactions]);
  const lista = boletos.filter(item => {
    const status = boletoStatus(item);
    const itemTipo = item.type === 'REVENUE' ? 'receber' : 'pagar';
    return (filtro === 'todos' || status === filtro) &&
      (tipo === 'todos' || itemTipo === tipo) &&
      item.description.toLowerCase().includes(busca.toLowerCase());
  });

  const aberto = boletos.filter(item => boletoStatus(item) === 'aberto');
  const vencidos = boletos.filter(item => boletoStatus(item) === 'vencido');
  const pagos = boletos.filter(item => boletoStatus(item) === 'pago');
  const valorAberto = aberto.reduce((total, item) => total + toNumber(item.amount), 0);
  const valorVencido = vencidos.reduce((total, item) => total + toNumber(item.amount), 0);
  const valorPago = pagos.reduce((total, item) => total + toNumber(item.amount), 0);
  const valorReceber = boletos.filter(item => item.type === 'REVENUE' && item.status !== 'PAID').reduce((total, item) => total + toNumber(item.amount), 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      const created = await createFinanceTransaction({ ...form, amount: Math.abs(Number(form.amount)), status: 'PENDING' });
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
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Em aberto', val: String(aberto.length), sub: formatCurrency(valorAberto), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock },
          { label: 'Vencidos', val: String(vencidos.length), sub: formatCurrency(valorVencido), color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle },
          { label: 'Pagos (mês)', val: String(pagos.length), sub: formatCurrency(valorPago), color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', icon: CheckCircle2 },
          { label: 'A receber', val: String(boletos.filter(item => item.type === 'REVENUE').length), sub: formatCurrency(valorReceber), color: 'text-gray-900', bg: 'bg-gray-50', border: 'border-gray-200', icon: Download },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`dash-card border p-5 ${k.border}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-medium text-gray-500">{k.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.bg}`}>
                  <Icon size={14} className={k.color} strokeWidth={2} />
                </div>
              </div>
              <p className={`text-[28px] font-black leading-none tracking-tight ${k.color}`}>{k.val}</p>
              <p className="mt-1.5 text-[12px] font-medium text-gray-500">{k.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="search-box max-w-xs flex-1">
          <Search size={13} className="shrink-0 text-gray-400" />
          <input placeholder="Buscar boleto..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {(['todos', 'aberto', 'vencido', 'pago'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold capitalize transition-all ${
                filtro === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}>{f}</button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {(['todos', 'receber', 'pagar'] as const).map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold capitalize transition-all ${
                tipo === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}>{t === 'todos' ? 'Todos' : t === 'receber' ? 'A Receber' : 'A Pagar'}</button>
          ))}
        </div>

        <button onClick={() => setModal(true)} className="btn-black ml-auto">
          <Plus size={13} strokeWidth={2.2} /> Novo Boleto
        </button>
      </div>

      <div className="dash-card overflow-hidden">
        <table className="table-premium w-full">
          <thead><tr>
            {['ID', 'Descrição', 'Valor', 'Emissão', 'Vencimento', 'Tipo', 'Status', ''].map(h =>
              <th key={h} className="px-5">{h}</th>
            )}
          </tr></thead>
          <tbody>
            {lista.map(item => {
              const status = boletoStatus(item);
              return (
                <tr key={item.id} className="cursor-pointer">
                  <td className="px-5 text-[11px] font-mono text-gray-400">{item.id.slice(0, 8).toUpperCase()}</td>
                  <td className="max-w-[240px] px-5 text-[12px] text-gray-700"><span className="block truncate">{item.description}</span></td>
                  <td className="px-5 text-[13px] font-bold text-gray-900">{formatCurrency(toNumber(item.amount))}</td>
                  <td className="px-5 text-[12px] text-gray-500">{formatDate(item.createdAt)}</td>
                  <td className="px-5 text-[12px] font-medium text-gray-600">{formatDate(item.dueDate)}</td>
                  <td className="px-5">
                    <span className={`badge ${item.type === 'REVENUE' ? 'badge-teal' : 'badge-gray'}`}>
                      {item.type === 'REVENUE' ? 'Receber' : 'Pagar'}
                    </span>
                  </td>
                  <td className="px-5">
                    <span className={`badge ${
                      status === 'pago' ? 'badge-green' :
                      status === 'vencido' ? 'badge-red' : 'badge-blue'
                    }`}>{status}</span>
                  </td>
                  <td className="px-5">
                    {item.status === 'PENDING'
                      ? <button onClick={() => void markAsPaid(item)} className="btn-outline text-[11px]">Baixar</button>
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
              <h3 className="text-[15px] font-bold text-gray-900">Emitir Novo Boleto</h3>
              <button type="button" onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Descrição / Sacado</label>
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
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Vencimento</label>
                  <input type="date" value={form.dueDate} onChange={event => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className="input-premium w-full px-3 py-2.5 text-[13px]" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tipo</label>
                <div className="flex gap-2">
                  {(['REVENUE', 'EXPENSE'] as FinanceType[]).map(type => (
                    <button key={type} type="button" onClick={() => setForm((current) => ({ ...current, type }))}
                      className={`flex-1 rounded-xl border-2 py-2.5 text-[12px] font-semibold transition-all ${
                        form.type === type ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900'
                      }`}>
                      {type === 'REVENUE' ? 'A Receber' : 'A Pagar'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button type="button" onClick={() => setModal(false)} className="btn-outline flex-1 py-2.5">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-black flex-1 justify-center py-2.5">{saving ? 'Emitindo...' : 'Emitir Boleto'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
