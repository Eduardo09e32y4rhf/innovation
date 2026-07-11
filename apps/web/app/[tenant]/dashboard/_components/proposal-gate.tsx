'use client';

import { ReactNode, useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
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
    const p = user?.profile?.toLowerCase();
    if (p === 'admin' || p === 'dev' || p === 'gestor') {
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
          <button className="text-sm px-3 py-1 border rounded-md border-yellow-400 text-yellow-800 hover:bg-yellow-200" onClick={() => setModalOpen(true)}>
            Revisar e Assinar
          </button>
        </div>
      )}

      {children}

      {pendingProposal && modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Proposta Comercial: {pendingProposal.title}</h2>
              <p className="text-sm text-muted-foreground">
                Revise os detalhes do plano e assine para ativar sua conta.
              </p>
            </div>

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
                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={signedByName} onChange={e => setSignedByName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">E-mail</label>
                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={signedByEmail} onChange={e => setSignedByEmail(e.target.value)} />
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
                
                <div className="flex justify-end space-x-2 mt-4">
                  <button className="px-4 py-2 border rounded-md text-sm" onClick={() => setModalOpen(false)}>Cancelar</button>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50" onClick={handleSign} disabled={loading || !acceptedTerms}>
                    {loading ? 'Processando...' : 'Assinar e Ir para Pagamento'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
