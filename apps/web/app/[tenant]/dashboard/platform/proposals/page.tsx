'use client';

import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { Eye, Plus } from 'lucide-react';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      const data = await api.proposals.list();
      setProposals(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Propostas Comerciais</h1>
        <button className="flex items-center crystal-button px-4 py-2 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-md transition-colors" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Proposta
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-slate-900/5">
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
              {proposals.map((p) => (
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
                    <button className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals/${p.id}`)}>
                      <Eye className="w-4 h-4" />
                    </button>
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
