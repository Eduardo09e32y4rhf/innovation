'use client';

import { ReactNode, useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';

export function ProposalGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pendingProposal, setPendingProposal] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [signedByName, setSignedByName] = useState(user?.name || '');
  const [signedByEmail, setSignedByEmail] = useState(user?.email || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'DEV' || user?.role === 'GESTOR') {
      checkProposals();
    }
  }, [user]);

  const checkProposals = async () => {
    try {
      const proposals = await api.proposals.getCompanyProposals();
      const pending = proposals.find((p: any) => p.status === 'SENT');
      if (pending) {
        setPendingProposal(pending);
      }
    } catch (err) {
      console.error('Failed to load proposals', err);
    }
  };

  const handleSign = async () => {
    if (!acceptedTerms) return toast.error('Você deve aceitar os termos.');
    if (!signedByName || !signedByEmail) return toast.error('Preencha nome e email.');
    
    try {
      setLoading(true);
      const res = await api.proposals.acceptTerms(pendingProposal.id, {
        signedByName,
        signedByEmail,
      });
      
      toast.success('Proposta assinada! Redirecionando para pagamento...');
      
      if (res.asaasPaymentLink) {
        window.location.href = res.asaasPaymentLink;
      } else {
        setPendingProposal(null);
        setModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao assinar proposta');
      setLoading(false);
    }
  };

  return (
    <>
      {pendingProposal && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-3 flex items-center justify-between z-50">
          <p className="text-yellow-800 text-sm font-medium">
            Você tem uma proposta comercial pendente de assinatura.
          </p>
          <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-800 hover:bg-yellow-200" onClick={() => setModalOpen(true)}>
            Revisar e Assinar
          </Button>
        </div>
      )}

      {children}

      {pendingProposal && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Proposta Comercial: {pendingProposal.title}</DialogTitle>
              <DialogDescription>
                Revise os detalhes do plano e assine para ativar sua conta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md text-sm space-y-2">
                <p><strong>Plano:</strong> {pendingProposal.planType}</p>
                <p><strong>Valor Mensal:</strong> R$ {pendingProposal.monthlyPrice?.toFixed(2)}</p>
                <p><strong>Limites:</strong> {pendingProposal.usersLimit} usuários, {pendingProposal.employeesLimit} colaboradores.</p>
                <p><strong>Recursos:</strong> {pendingProposal.features?.join(', ')}</p>
              </div>

              <div className="border p-4 rounded-md h-40 overflow-y-auto text-xs text-muted-foreground bg-gray-50">
                <h4 className="font-bold text-foreground mb-2">Termos e Condições</h4>
                <p>Ao assinar digitalmente este documento, a CONTRATANTE concorda com a contratação da plataforma Innovation RH, mediante o pagamento da mensalidade informada acima...</p>
                {/* Aqui seria um iframe para um PDF real ou termos mais extensos */}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Assinado por (Nome)</label>
                    <Input value={signedByName} onChange={e => setSignedByName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">E-mail</label>
                    <Input value={signedByEmail} onChange={e => setSignedByEmail(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="acceptTerms" 
                    className="rounded border-gray-300"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                  />
                  <label htmlFor="acceptTerms" className="text-sm font-medium">
                    Declaro que li e concordo com os Termos de Serviço
                  </label>
                </div>
                
                <Button className="w-full" onClick={handleSign} disabled={loading || !acceptedTerms}>
                  {loading ? 'Processando...' : 'Assinar Eletronicamente e Ir para Pagamento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
