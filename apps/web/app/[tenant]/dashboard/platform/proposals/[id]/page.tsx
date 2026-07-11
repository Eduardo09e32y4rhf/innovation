'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function ProposalDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<any>(null);

  useEffect(() => {
    loadProposal();
  }, [id]);

  const loadProposal = async () => {
    try {
      const data = await api.proposals.getStatus(id);
      setProposal(data);
    } catch (err) {
      toast.error('Erro ao carregar proposta');
      router.push(`/${tenant}/dashboard/platform/proposals`);
    }
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      await api.proposals.send(id);
      toast.success('Proposta enviada ao cliente com sucesso!');
      loadProposal();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar proposta');
    } finally {
      setLoading(false);
    }
  };

  if (!proposal) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-muted rounded-md" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals`)}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Proposta {proposal.proposalNumber}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${proposal.status === 'SENT' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{proposal.status}</span>
        </div>
        
        {proposal.status === 'DRAFT' && (
          <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50" onClick={handleSend} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Enviando...' : 'Enviar para Cliente'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm">
          <div className="p-6 pb-4">
            <h3 className="text-lg font-semibold">Detalhes da Oferta</h3>
          </div>
          <div className="p-6 pt-0 space-y-4 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{proposal.company?.name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Título:</span>
              <span className="font-medium">{proposal.title}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Plano / Valor:</span>
              <span className="font-medium">{proposal.planType} - R$ {proposal.monthlyPrice?.toFixed(2)}/mês</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Limites:</span>
              <span className="font-medium">{proposal.usersLimit} usuários / {proposal.employeesLimit} func.</span>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border shadow-sm">
          <div className="p-6 pb-4">
            <h3 className="text-lg font-semibold">Status da Assinatura</h3>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className={`w-5 h-5 ${proposal.termsAccepted ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span>Termos Aceitos?</span>
              </div>
              <span className="font-medium">{proposal.termsAccepted ? 'Sim' : 'Não'}</span>
            </div>
            {proposal.termsAccepted && (
              <div className="text-sm space-y-1 bg-muted p-3 rounded">
                <p><strong>Assinado por:</strong> {proposal.signedByName} ({proposal.signedByEmail})</p>
                <p><strong>Data:</strong> {new Date(proposal.signedAt).toLocaleString()}</p>
              </div>
            )}

            {proposal.asaasPaymentLink && (
              <div className="pt-4 mt-4 border-t">
                <a href={proposal.asaasPaymentLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full px-4 py-2 border rounded-md text-sm hover:bg-muted">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Link de Pagamento (Asaas)
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
