'use client';

import React, { useState } from 'react';
import { Button, PageHeader } from '@/app/components/ui';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';
import { useAction } from '@/app/hooks/use-action';
import { SupportWorkspace } from '@/app/components/support/support-workspace';
import { companySupportApi } from '@/app/components/support/support-api';
import { RefundBlock } from '@/app/components/support/refund-block';
import { RatingBlock } from '@/app/components/support/rating-block';
import { COMPANY_FILTERS } from '@/app/components/support/support-model';
import { SuporteView as PlatformSupportPage } from '../platform/_hub/suporte-view';
import { TicketWizardSlideover } from './_components/ticket-wizard-slideover';
import { CompanyActions } from './_components/company-actions';

const IMPACT: Record<string, string> = {
  LOW: 'Dúvida que pode esperar', NORMAL: 'Dúvida comum',
  HIGH: 'Alguns usuários estão impedidos de trabalhar', CRITICAL: 'toda empresa parada ou perda de dados',
};

function CustomerSupportPage() {
  const { user } = useAuth();
  const role = String(user?.profile || user?.role || '').toUpperCase();
  // Funcionário abre e acompanha os próprios chamados (o servidor fixa o chamado em nome dele).
  const canCreate = !['CONSULTA', 'COMERCIAL'].includes(role);
  const [showWizard, setShowWizard] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [failed, setFailed] = useState<{ ticketId: string; files: File[] } | null>(null);

  const create = useAction(async (data: { category: string; title: string; description: string; priority: string; files: File[] }) => {
    if (!canCreate) return;
    try {
      const ticket = await api.support.create({
        category: data.category, title: data.title.trim(), description: data.description.trim(), impact: IMPACT[data.priority] || data.priority,
      });
      const pending: File[] = [];
      for (const file of data.files) { try { await api.support.uploadAttachment(ticket.id, file); } catch { pending.push(file); } }
      setFailed(pending.length ? { ticketId: ticket.id, files: pending } : null);
      setShowWizard(false);
      setReloadKey((k) => k + 1);
      toast.success(pending.length ? 'Chamado criado. Reenvie os anexos que falharam.' : 'Chamado aberto com sucesso.');
    } catch (err) { toast.error((err as Error)?.message || 'Erro ao criar o chamado.'); }
  });

  const retryUploads = useAction(async () => {
    if (!failed) return;
    const pending: File[] = [];
    for (const file of failed.files) { try { await api.support.uploadAttachment(failed.ticketId, file); } catch { pending.push(file); } }
    setFailed(pending.length ? { ...failed, files: pending } : null);
    if (!pending.length) toast.success('Anexos enviados.');
  });

  return (
    <div className="w-full min-w-0 px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      <div className="flex min-w-0 flex-col gap-4">
        <PageHeader
          title="Suporte"
          subtitle="Acompanhe seus chamados e converse com a nossa equipe."
          actions={canCreate ? <Button onClick={() => setShowWizard(true)}><Plus size={18} aria-hidden /> Abrir novo chamado</Button> : undefined}
        />
        {failed && (
          <div role="alert" className="card-v2 flex flex-col gap-2 p-4 text-sm">
            <p>O chamado foi criado, mas falhou o envio de: {failed.files.map((f) => f.name).join(', ')}.</p>
            <Button variant="outline" isLoading={retryUploads.busy} onClick={() => void retryUploads.run()}>Reenviar anexos</Button>
          </div>
        )}
        <SupportWorkspace
          key={reloadKey} mode="company" userId={user?.id} api={companySupportApi} filters={COMPANY_FILTERS}
          emptyListText="Você ainda não abriu nenhum chamado."
          refundBlock={(ticket, refresh) => <RefundBlock ticket={ticket} userId={user?.id} isPlatform={false} onChanged={refresh} />}
          ratingBlock={(ticket, refresh) => <RatingBlock ticket={ticket} userId={user?.id} onChanged={refresh} />}
          renderActions={(ticket, refresh) => <CompanyActions ticket={ticket} onChanged={refresh} />}
        />
      </div>
      <TicketWizardSlideover canRefund={role === 'ADMIN'} onRefundCreated={() => { setShowWizard(false); setReloadKey((k) => k + 1); }} isOpen={showWizard} onClose={() => { if (!create.busy) setShowWizard(false); }} creating={create.busy} onCreate={async (data) => { await create.run(data); }} />
    </div>
  );
}

export default function SupportPage() {
  const { user } = useAuth();
  const role = String(user?.profile || user?.role || '').toUpperCase();
  return role === 'DEV' ? <PlatformSupportPage /> : <CustomerSupportPage />;
}
