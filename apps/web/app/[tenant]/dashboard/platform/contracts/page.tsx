'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowDownToLine,
  CheckCircle2,
  Edit2,
  FileSignature,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildPdfShell, escapeHtml, infoGrid, printPdf, section } from '@/app/lib/pdf-utils';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import api, { ApiError, type PlatformCompany, type PublicPlatformPlan } from '@/app/lib/api';

type ManualContract = {
  id: string;
  companyId: string;
  planId?: string | null;
  company?: { id: string; name: string; document?: string | null };
  plan?: { id: string; name: string } | null;
  agreedAmount: number | string;
  seatQuantity: number;
  startsAt: string;
  endsAt?: string | null;
  paymentMethod: string;
  externalContractNumber?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
  status: 'ACTIVE' | 'ENDED' | 'CANCELED';
};

const EMPTY_FORM = {
  companyId: '',
  planId: '',
  seatQuantity: '1',
  agreedAmount: '',
  startsAt: '',
  endsAt: '',
  paymentMethod: 'EXTERNAL',
  externalContractNumber: '',
  notes: '',
  documentUrl: '',
  status: 'ACTIVE' as 'ACTIVE' | 'ENDED' | 'CANCELED',
};

function parseMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function money(value: number | string | null | undefined) {
  return parseMoney(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function date(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';
}

function safeIsoDate(value?: string | null) {
  return value ? String(value).slice(0, 10) : '';
}

export default function ContractsPage({ params: { tenant } }: { params: { tenant: string } }) {
  const searchParams = useSearchParams();
  const companyFilter = searchParams?.get('companyId') || '';
  const [contracts, setContracts] = useState<ManualContract[]>([]);
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [plans, setPlans] = useState<PublicPlatformPlan[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [contractItems, companyItems, planItems] = await Promise.all([
        api.manualContracts.list(companyFilter ? { companyId: companyFilter } : undefined),
        api.platform.listCompanies(),
        api.platform.listPlans(),
      ]);
      setContracts(contractItems);
      setCompanies(companyItems);
      setPlans(planItems);
      if (companyFilter && !form.companyId) setForm((current) => ({ ...current, companyId: companyFilter }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os contratos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyFilter]);

  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);
  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

  function startCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      companyId: companyFilter || '',
    });
    setError('');
  }

  function startEdit(item: ManualContract) {
    setEditingId(item.id);
    setForm({
      companyId: item.companyId,
      planId: item.planId || '',
      seatQuantity: String(item.seatQuantity || 1),
      agreedAmount: String(parseMoney(item.agreedAmount)),
      startsAt: safeIsoDate(item.startsAt),
      endsAt: safeIsoDate(item.endsAt),
      paymentMethod: item.paymentMethod || 'EXTERNAL',
      externalContractNumber: item.externalContractNumber || '',
      notes: item.notes || '',
      documentUrl: item.documentUrl || '',
      status: item.status || 'ACTIVE',
    });
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        companyId: form.companyId,
        planId: form.planId || undefined,
        seatQuantity: Number(form.seatQuantity) || 1,
        agreedAmount: parseMoney(form.agreedAmount),
        startsAt: form.startsAt ? new Date(`${form.startsAt}T12:00:00`).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(`${form.endsAt}T12:00:00`).toISOString() : undefined,
        paymentMethod: form.paymentMethod,
        externalContractNumber: form.externalContractNumber || undefined,
        notes: form.notes,
        documentUrl: form.documentUrl || undefined,
        status: form.status,
      };

      if (editingId) {
        await api.manualContracts.update(editingId, payload);
        toast.success('Contrato atualizado.');
      } else {
        await api.manualContracts.create(payload);
        toast.success('Contrato criado.');
      }
      startCreate();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : editingId ? 'Falha ao atualizar contrato.' : 'Falha ao criar contrato.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: ManualContract) {
    if (!window.confirm(`Excluir o contrato da empresa ${item.company?.name || 'selecionada'}?`)) return;
    setWorkingId(item.id);
    try {
      await api.manualContracts.delete(item.id);
      toast.success('Contrato excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir contrato.');
    } finally {
      setWorkingId(null);
    }
  }

  function exportPdf(item: ManualContract) {
    const company = companyById.get(item.companyId) || item.company || { name: 'Empresa', document: '-' };
    const plan = item.plan?.name || planById.get(item.planId || '')?.name || 'Plano manual';
    const html = buildPdfShell(
      { title: 'Contrato Manual', subtitle: `${company.name} · ${plan}` },
      { name: company.name, document: company.document || '-' },
      `
        ${section('Resumo', infoGrid([
          { label: 'Plano', value: plan },
          { label: 'Valor', value: money(item.agreedAmount) },
          { label: 'Licenças', value: String(item.seatQuantity) },
          { label: 'Início', value: date(item.startsAt) },
          { label: 'Fim', value: item.endsAt ? date(item.endsAt) : 'Indeterminado' },
          { label: 'Pagamento', value: item.paymentMethod },
        ], 3))}
        ${section('Observações', `<p style="font-size:10px;line-height:1.7;color:#334155;">${escapeHtml(item.notes || 'Sem observações.')}</p>`)}
      `,
    );
    printPdf(html, `contrato-${item.id}.pdf`);
  }

  const filteredContracts = companyFilter ? contracts.filter((item) => item.companyId === companyFilter) : contracts;

  return (
    <div className="mx-auto w-full space-y-5 pb-10">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><FileSignature size={19} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Plataforma</p>
            <h2 className="text-lg font-black text-slate-950">Contratos digitais</h2>
            <p className="mt-1 text-xs text-slate-500">Crie, edite, exclua e gere PDF dos contratos manuais da plataforma.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${tenant}/dashboard/platform`} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
            Voltar
          </Link>
          <button type="button" onClick={load} disabled={loading} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button type="button" onClick={startCreate} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 text-xs font-black text-white hover:bg-violet-700">
            <Plus size={14} /> Novo contrato
          </button>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">
            Empresa
            <select required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
              <option value="">Selecione a empresa</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Plano
            <select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-violet-500">
              <option value="">Sem plano vinculado</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Licenças
            <input required type="number" min={1} value={form.seatQuantity} onChange={(e) => setForm({ ...form, seatQuantity: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-violet-500" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Valor acordado
            <input required type="number" min="0.01" step="0.01" value={form.agreedAmount} onChange={(e) => setForm({ ...form, agreedAmount: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-violet-500" placeholder="R$ 0,00" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Início
            <input required type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Fim (opcional)
            <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Pagamento
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900">
              <option value="ASAAS">Asaas</option>
              <option value="BANK_TRANSFER">Transferência</option>
              <option value="EXTERNAL">Externo</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'ENDED' | 'CANCELED' })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900">
              <option value="ACTIVE">Ativo</option>
              <option value="ENDED">Encerrado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600 xl:col-span-2">
            Número externo
            <input value={form.externalContractNumber} onChange={(e) => setForm({ ...form, externalContractNumber: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-violet-500" placeholder="Contrato Asaas ou documento interno" />
          </label>
          <label className="text-xs font-bold text-slate-600 xl:col-span-2">
            URL do PDF
            <input value={form.documentUrl} onChange={(e) => setForm({ ...form, documentUrl: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-violet-500" placeholder="https://..." />
          </label>
        </div>
        <label className="block text-xs font-bold text-slate-600">
          Observações
          <textarea required value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 min-h-[110px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500" placeholder="Motivo e observações" />
        </label>
        <div className="flex items-center gap-3">
          <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar contrato manual'}
          </button>
          {editingId && (
            <button type="button" onClick={startCreate} className="text-xs font-bold text-slate-500 hover:text-slate-800">
              Limpar edição
            </button>
          )}
        </div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-black text-slate-900">Contratos cadastrados</h3>
          <p className="mt-1 text-xs text-slate-500">{filteredContracts.length} contrato(s) encontrado(s).</p>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Carregando contratos...</p>
        ) : filteredContracts.length === 0 ? (
          <div className="p-8"><EmptyState message="Nenhum contrato cadastrado." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                  <th className="p-4">Empresa</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Licenças</th>
                  <th className="p-4">Início</th>
                  <th className="p-4">Fim</th>
                  <th className="p-4">Pagamento</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-4 font-bold text-slate-900">{item.company?.name || 'Empresa'}</td>
                    <td className="p-4 text-slate-700">{item.plan?.name || '-'}</td>
                    <td className="p-4 font-bold text-slate-800">{money(item.agreedAmount)}</td>
                    <td className="p-4 text-slate-600">{item.seatQuantity}</td>
                    <td className="p-4 text-slate-600">{date(item.startsAt)}</td>
                    <td className="p-4 text-slate-600">{item.endsAt ? date(item.endsAt) : 'Indeterminado'}</td>
                    <td className="p-4 text-slate-600">{item.paymentMethod}</td>
                    <td className="p-4">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{item.status}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => exportPdf(item)} className="rounded-lg border px-3 py-2 font-bold hover:bg-slate-50">
                          PDF
                        </button>
                        <button type="button" onClick={() => startEdit(item)} className="rounded-lg border px-3 py-2 font-bold hover:bg-slate-50">
                          <Edit2 size={14} className="inline" /> Editar
                        </button>
                        <button type="button" onClick={() => remove(item)} disabled={workingId === item.id} className="rounded-lg border px-3 py-2 font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                          {workingId === item.id ? <Loader2 size={14} className="inline animate-spin" /> : <Trash2 size={14} className="inline" />} Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
