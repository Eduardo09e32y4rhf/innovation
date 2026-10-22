'use client';

import { useConfirm } from '@/app/components/ui/confirm-provider';
import { useMutation } from '@/app/hooks/use-data';
import { api, type PlatformCompany } from '@/app/lib/api';

/** Suspender/reativar, arquivar e excluir empresa (só DEV; a API também confere). */
export function useCompanyActions(isSuperAdmin: boolean, onDone: () => void) {
  const askConfirm = useConfirm();
  const toggle = useMutation(({ id, status, suspensionReason }: { id: string; status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'; suspensionReason?: string | null }) => api.platform.updateCompany(id, { status, suspensionReason }), { onSuccess: onDone });
  const remove = useMutation((id: string) => api.platform.deleteCompany(id), { onSuccess: onDone });
  const purge = useMutation((id: string) => api.platform.purgeCompany(id), { onSuccess: onDone });

  async function toggleStatus(company: PlatformCompany) {
    if (!isSuperAdmin) return;
    const current = company.status ?? (company.isActive ? 'ACTIVE' : 'SUSPENDED');
    if (current !== 'ACTIVE') { await toggle.mutate({ id: company.id, status: 'ACTIVE', suspensionReason: null }).catch(() => {}); return; }
    const reason = window.prompt('Motivo: inadimplencia ou solicitacao_voluntaria?', 'inadimplencia');
    if (reason === null) return;
    const normalized = reason.trim() === 'solicitacao_voluntaria' ? 'solicitacao_voluntaria' : reason.trim() === 'não informado' ? 'não informado' : 'inadimplencia';
    await toggle.mutate({ id: company.id, status: 'SUSPENDED', suspensionReason: normalized }).catch(() => {});
  }

  async function archive(company: PlatformCompany) {
    if (!isSuperAdmin || !(await askConfirm({ title: 'Arquivar empresa', description: `Arquivar "${company.name}"? O acesso será bloqueado e o histórico será preservado.`, confirmText: 'Arquivar empresa' }))) return;
    await remove.mutate(company.id).catch(() => {});
  }

  async function destroy(company: PlatformCompany) {
    if (!isSuperAdmin || !(await askConfirm({ title: 'Excluir empresa definitivamente', description: `Deletar "${company.name}" e TODOS os dados associados (usuários, faturas, escalas). Esta ação é IRREVERSÍVEL.`, confirmText: 'Excluir definitivamente', requireText: 'EXCLUIR' }))) return;
    await purge.mutate(company.id).catch(() => {});
  }

  return { toggleStatus, archive, destroy, loading: { toggle: toggle.loading, remove: remove.loading, purge: purge.loading } };
}
