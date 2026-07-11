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
        <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Proposta
        </button>
      </div>

      <div className="bg-card text-card-foreground rounded-xl border shadow-sm">
        <div className="p-0">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="p-4 text-left font-medium">Nº Proposta</th>
                <th className="p-4 text-left font-medium">Empresa</th>
                <th className="p-4 text-left font-medium">Plano</th>
                <th className="p-4 text-left font-medium">Valor (R$)</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4">{p.proposalNumber}</td>
                  <td className="p-4">{p.company?.name || 'N/A'}</td>
                  <td className="p-4">{p.planType}</td>
                  <td className="p-4">R$ {p.monthlyPrice?.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      p.status === 'ACTIVE' || p.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      p.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                      p.status === 'PAYMENT_PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 hover:bg-muted rounded-md" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals/${p.id}`)}>
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {proposals.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
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
