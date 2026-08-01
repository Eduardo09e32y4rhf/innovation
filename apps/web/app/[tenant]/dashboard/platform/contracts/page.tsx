'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Edit2,
  FileSignature,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
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
  createdAt?: string;
  updatedAt?: string;
};

type ContractStatusFilter = 'ALL' | 'ACTIVE' | 'ENDED' | 'CANCELED';

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

const STATUS_LABELS: Record<ManualContract['status'], string> = {
  ACTIVE: 'Ativo',
  ENDED: 'Encerrado',
  CANCELED: 'Cancelado',
};

const STATUS_TONES: Record<ManualContract['status'], string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ENDED: 'border-slate-200 bg-slate-100 text-slate-600',
  CANCELED: 'border-rose-200 bg-rose-50 text-rose-700',
};

const PAYMENT_LABELS: Record<string, string> = {
  ASAAS: 'Asaas',
  BANK_TRANSFER: 'Transferência',
  EXTERNAL: 'Externo',
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
  const [statusFilter, setStatusFilter] = useState<ContractStatusFilter>('ALL');
  const [contracts, setContracts] = useState<ManualContract[]>([]);
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [plans, setPlans] = useState<PublicPlatformPlan[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<ManualContract | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [contractsRes, companiesRes, plansRes] = await Promise.allSettled([
        api.manualContracts.list(companyFilter ? { companyId: companyFilter } : undefined),
        api.platform.listCompanies({ limit: 1000 }),
        api.platform.listPlans(),
      ]);

      if (contractsRes.status === 'fulfilled' && Array.isArray(contractsRes.value)) setContracts(contractsRes.value);
      if (companiesRes.status === 'fulfilled' && companiesRes.value && typeof companiesRes.value === 'object' && 'data' in companiesRes.value) setCompanies((companiesRes.value as any).data);
      if (plansRes.status === 'fulfilled' && Array.isArray(plansRes.value)) setPlans(plansRes.value);

      if (companyFilter && !form.companyId && companiesRes.status === 'fulfilled') {
        setForm((current) => ({ ...current, companyId: companyFilter }));
      }

      if (contractsRes.status === 'rejected' && companiesRes.status === 'rejected') {
        throw new Error('Servidor sob alta demanda ou reiniciando. Aguarde alguns segundos e clique em Atualizar.');
      }
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
  const filteredContracts = useMemo(() => {
    return contracts.filter((item) => {
      if (companyFilter && item.companyId !== companyFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      return true;
    });
  }, [contracts, companyFilter, statusFilter]);
  const summary = useMemo(() => ({
    active: contracts.filter((item) => item.status === 'ACTIVE').length,
    ended: contracts.filter((item) => item.status === 'ENDED').length,
    canceled: contracts.filter((item) => item.status === 'CANCELED').length,
    totalValue: contracts.reduce((acc, item) => acc + parseMoney(item.agreedAmount), 0),
  }), [contracts]);

  function startCreate() {
    setEditingId(null);
    setSelectedContract(null);
    setForm({
      ...EMPTY_FORM,
      companyId: companyFilter || '',
    });
    setError('');
  }

  function startEdit(item: ManualContract) {
    setEditingId(item.id);
    setSelectedContract(null);
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
    void api.manualContracts.downloadPdf(item.id)
      .then(() => toast.success('PDF do contrato gerado.'))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Não foi possível gerar o PDF do contrato.'));
  }

  return (
    <div className="mx-auto w-full space-y-5 pb-10">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><FileSignature size={19} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Plataforma</p>
            <h2 className="text-lg font-black text-slate-950">Gestão de contratos</h2>
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Ativos', value: summary.active, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Encerrados', value: summary.ended, tone: 'bg-slate-50 text-slate-700' },
          { label: 'Cancelados', value: summary.canceled, tone: 'bg-rose-50 text-rose-700' },
          { label: 'Receita contratada', value: money(summary.totalValue), tone: 'bg-violet-50 text-violet-700' },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-black ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </section>

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
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Contratos cadastrados</h3>
            <p className="mt-1 text-xs text-slate-500">{filteredContracts.length} contrato(s) encontrado(s).</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'ACTIVE', 'ENDED', 'CANCELED'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatusFilter(item)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                  statusFilter === item
                    ? 'border-violet-300 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {item === 'ALL' ? 'Todos' : item}
              </button>
            ))}
          </div>
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
                    <td className="p-4 font-bold text-slate-900">
                      <div className="flex flex-col">
                        <span>{item.company?.name || 'Empresa'}</span>
                        <span className="mt-1 text-[10px] font-medium text-slate-400">{item.company?.document || '-'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{item.plan?.name || '-'}</td>
                    <td className="p-4 font-bold text-slate-800">{money(item.agreedAmount)}</td>
                    <td className="p-4 text-slate-600">{item.seatQuantity}</td>
                    <td className="p-4 text-slate-600">{date(item.startsAt)}</td>
                    <td className="p-4 text-slate-600">{item.endsAt ? date(item.endsAt) : 'Indeterminado'}</td>
                    <td className="p-4 text-slate-600">{PAYMENT_LABELS[item.paymentMethod] || item.paymentMethod}</td>
                    <td className="p-4">
                      <span className={`rounded-full border px-2 py-1 font-bold ${STATUS_TONES[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setSelectedContract(item)} className="rounded-lg border px-3 py-2 font-bold hover:bg-slate-50">
                          <History size={14} className="inline" /> Detalhes
                        </button>
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

      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 p-4">
          <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Detalhe do contrato</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{selectedContract.company?.name || 'Empresa'}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {money(selectedContract.agreedAmount)} • {STATUS_LABELS[selectedContract.status]} • {PAYMENT_LABELS[selectedContract.paymentMethod] || selectedContract.paymentMethod}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedContract(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </header>

            <div className="grid gap-4 overflow-y-auto p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Empresa', selectedContract.company?.name || '-'],
                  ['Documento', selectedContract.company?.document || '-'],
                  ['Plano', selectedContract.plan?.name || '-'],
                  ['Licenças', String(selectedContract.seatQuantity)],
                  ['Início', date(selectedContract.startsAt)],
                  ['Fim', selectedContract.endsAt ? date(selectedContract.endsAt) : 'Indeterminado'],
                  ['Número externo', selectedContract.externalContractNumber || '-'],
                  ['Documento', selectedContract.documentUrl ? 'Vinculado' : 'Não informado'],
                ].map(([label, value]) => (
                  <article key={`${label}-${value}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
                  </article>
                ))}
              </div>

              <article className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Observações</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedContract.notes || 'Sem observações.'}</p>
              </article>

              <article className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Ações</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      startEdit(selectedContract);
                      setSelectedContract(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportPdf(selectedContract);
                      setSelectedContract(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <FileSignature size={14} />
                    Gerar PDF
                  </button>
                  {selectedContract.documentUrl && (
                    <a
                      href={selectedContract.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
                    >
                      Abrir documento
                    </a>
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
