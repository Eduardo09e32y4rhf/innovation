'use client';

import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, Plus, RefreshCw } from 'lucide-react';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.proposals.list();
      setProposals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar as propostas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-lg font-black text-slate-950">Propostas comerciais</h1><p className="mt-1 text-xs text-slate-500">Crie, acompanhe e envie propostas para as empresas clientes.</p></div>
        <div className="flex items-center gap-2">
        <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60" onClick={loadProposals} disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar</button>
        <Link href={`/${tenant}/dashboard/platform/proposals/new`} className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-sm hover:bg-violet-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Proposta
        </Link>
        </div>
      </div>

      {error && <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"><span>{error}</span><button type="button" onClick={loadProposals} className="font-black underline">Tentar novamente</button></div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Nº Proposta</th>
                <th className="px-6 py-4 text-left font-semibold">Empresa</th>
                <th className="px-6 py-4 text-left font-semibold">Plano</th>
                <th className="px-6 py-4 text-left font-semibold">Valor (R$)</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="p-10 text-center text-sm text-slate-500">Carregando propostas...</td></tr> : proposals.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.proposalNumber}</td>
                  <td className="px-6 py-4 text-slate-600">{p.company?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-600">{p.planType}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">R$ {p.monthlyPrice?.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      p.status === 'ACTIVE' || p.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      p.status === 'SENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      p.status === 'PAYMENT_PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/${tenant}/dashboard/platform/proposals/${p.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50">
                      <Eye className="w-4 h-4" />
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {proposals.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    Nenhuma proposta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
