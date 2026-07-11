'use client';

import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import { Eye, Plus } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

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
        <Button onClick={() => router.push(`/${tenant}/dashboard/platform/proposals/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Proposta
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
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
                    <Badge variant={
                      p.status === 'ACTIVE' || p.status === 'PAID' ? 'success' :
                      p.status === 'SENT' ? 'secondary' :
                      p.status === 'PAYMENT_PENDING' ? 'warning' : 'default'
                    }>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals/${p.id}`)}>
                      <Eye className="w-4 h-4" />
                    </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
