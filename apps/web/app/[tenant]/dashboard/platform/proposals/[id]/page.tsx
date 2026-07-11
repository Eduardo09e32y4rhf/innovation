'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/app/components/ui/badge';

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Proposta {proposal.proposalNumber}</h1>
          <Badge variant={proposal.status === 'SENT' ? 'secondary' : 'default'}>{proposal.status}</Badge>
        </div>
        
        {proposal.status === 'DRAFT' && (
          <Button onClick={handleSend} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Enviando...' : 'Enviar para Cliente'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Oferta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status da Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Button variant="outline" className="w-full" asChild>
                  <a href={proposal.asaasPaymentLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Link de Pagamento (Asaas)
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
