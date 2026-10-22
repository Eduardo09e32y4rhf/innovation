'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { api, ApiError } from '@/app/lib/api';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { EMPTY_FORM, formFromContract, payloadFromForm, type ContractForm, type ContractLookups, type ManualContract } from './contract-model';

/** Carrega contratos, empresas e planos e concentra criar/editar/excluir/PDF. `companyId` filtra pela empresa da URL. */
export function useContracts(companyId: string) {
  const askConfirm = useConfirm();
  const [contracts, setContracts] = useState<ManualContract[]>([]);
  const [lookups, setLookups] = useState<ContractLookups>({ companies: [], plans: [] });
  const [form, setForm] = useState<ContractForm>({ ...EMPTY_FORM, companyId });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [list, companies, plans] = await Promise.allSettled([
      api.manualContracts.list(companyId ? { companyId } : undefined), api.platform.listCompanies({ limit: 1000 }), api.platform.listPlans(),
    ]);
    if (list.status === 'fulfilled' && Array.isArray(list.value)) setContracts(list.value as ManualContract[]);
    setLookups({
      companies: companies.status === 'fulfilled' ? companies.value?.data ?? [] : [],
      plans: plans.status === 'fulfilled' && Array.isArray(plans.value) ? plans.value : [],
    });
    if (list.status === 'rejected') setError(list.reason instanceof Error ? list.reason.message : 'Não foi possível carregar os contratos.');
    setLoading(false);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const reset = useCallback(() => { setEditingId(null); setForm({ ...EMPTY_FORM, companyId }); setError(''); }, [companyId]);
  const edit = (item: ManualContract) => { setEditingId(item.id); setForm(formFromContract(item)); setError(''); };

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      if (editingId) { await api.manualContracts.update(editingId, payloadFromForm(form)); toast.success('Contrato atualizado.'); }
      else { await api.manualContracts.create(payloadFromForm(form)); toast.success('Contrato criado.'); }
      reset(); await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : editingId ? 'Falha ao atualizar contrato.' : 'Falha ao criar contrato.');
    } finally { setSaving(false); }
  }

  async function remove(item: ManualContract) {
    if (!(await askConfirm({ title: 'Excluir contrato', description: `Excluir o contrato da empresa ${item.company?.name || 'selecionada'}?`, confirmText: 'Excluir contrato' }))) return;
    setWorkingId(item.id);
    try { await api.manualContracts.delete(item.id); toast.success('Contrato excluído.'); await load(); }
    catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Falha ao excluir contrato.'); }
    finally { setWorkingId(null); }
  }

  function exportPdf(item: ManualContract) {
    void api.manualContracts.downloadPdf(item.id).then(() => toast.success('PDF do contrato gerado.'))
      .catch((cause) => toast.error(cause instanceof Error ? cause.message : 'Não foi possível gerar o PDF do contrato.'));
  }

  return { contracts, lookups, form, setForm, loading, saving, error, editingId, workingId, load, reset, edit, submit, remove, exportPdf };
}
