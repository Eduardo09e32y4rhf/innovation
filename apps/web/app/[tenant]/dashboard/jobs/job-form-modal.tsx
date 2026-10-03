'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { Modal } from '@/app/components/ui/modal';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import type { Job, JobPayload, JobStatus } from './types';

interface JobFormModalProps {
  open: boolean; job: Job | null; saving: boolean;
  onClose: () => void; onSubmit: (payload: JobPayload) => Promise<void>;
}
const EMPTY_FORM: JobPayload = { title: '', description: '', location: '', employmentType: 'CLT', salaryRange: '', benefits: [], status: 'OPEN' };

export function JobFormModal({ open, job, saving, onClose, onSubmit }: JobFormModalProps) {
  const [form, setForm] = useState<JobPayload>(EMPTY_FORM);
  const [benefitsText, setBenefitsText] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    if (!open) return;
    setForm(job ? { title: job.title, description: job.description, location: job.location ?? '',
      employmentType: job.employmentType ?? 'CLT', salaryRange: job.salaryRange ?? '', benefits: job.benefits ?? [], status: job.status } : EMPTY_FORM);
    setBenefitsText((job?.benefits ?? []).join(', ')); setError(''); setDirty(false); setDiscard(false);
  }, [job, open]);
  function update<K extends keyof JobPayload>(key: K, value: JobPayload[K]) {
    setDirty(true); setForm(current => ({ ...current, [key]: value }));
  }
  function close() { if (saving || submitting.current) return; if (dirty) setDiscard(true); else onClose(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || submitting.current) return;
    if (form.title.trim().length < 3 || form.description.trim().length < 20) {
      setError('Informe um título de ao menos 3 caracteres e uma descrição de ao menos 20 caracteres.'); return;
    }
    submitting.current = true; setError('');
    try {
      await onSubmit({ ...form, title: form.title.trim(), description: form.description.trim(),
        location: form.location?.trim(), salaryRange: form.salaryRange?.trim(),
        benefits: benefitsText.split(',').map(item => item.trim()).filter(Boolean) });
      setDirty(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar. Seus dados foram preservados.'); }
    finally { submitting.current = false; }
  }
  return <>
    <Modal isOpen={open && !discard} onClose={close} title={job ? 'Editar vaga' : 'Nova vaga'}
      description="Campos com * são obrigatórios. A publicação segue o status escolhido." maxWidth="max-w-2xl">
      <form onSubmit={submit} className="space-y-5">
        <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <legend className="sr-only">Informações da vaga</legend>
          <label className="space-y-1.5 sm:col-span-2"><span className="block text-sm font-medium">Título da vaga *</span>
            <input autoFocus required minLength={3} maxLength={120} className="input-v2 min-h-11 text-base sm:text-sm" value={form.title} onChange={e => update('title', e.target.value)} placeholder="Ex.: Analista de recursos humanos" /></label>
          <label className="space-y-1.5"><span className="block text-sm font-medium">Localização</span>
            <input maxLength={120} className="input-v2 min-h-11 text-base sm:text-sm" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Cidade, estado ou remoto" /></label>
          <label className="space-y-1.5"><span className="block text-sm font-medium">Tipo de contratação</span>
            <select className="input-v2 min-h-11 text-base sm:text-sm" value={form.employmentType} onChange={e => update('employmentType', e.target.value)}>
              {form.employmentType && !['CLT','PJ','ESTAGIO','TEMPORARIO','JOVEM_APRENDIZ'].includes(form.employmentType) && <option value={form.employmentType}>{form.employmentType}</option>}
              <option value="CLT">CLT</option><option value="PJ">Pessoa jurídica</option><option value="ESTAGIO">Estágio</option>
              <option value="TEMPORARIO">Temporário</option><option value="JOVEM_APRENDIZ">Jovem aprendiz</option>
            </select></label>
          <label className="space-y-1.5"><span className="block text-sm font-medium">Faixa salarial</span>
            <input maxLength={80} className="input-v2 min-h-11 text-base sm:text-sm" value={form.salaryRange} onChange={e => update('salaryRange', e.target.value)} placeholder="Ex.: R$ 3.500 a R$ 4.500 ou a combinar" /></label>
          <label className="space-y-1.5"><span className="block text-sm font-medium">Status de publicação</span>
            <select className="input-v2 min-h-11 text-base sm:text-sm" value={form.status} onChange={e => update('status', e.target.value as JobStatus)}>
              <option value="OPEN">Aberta e publicada</option><option value="DRAFT">Rascunho</option><option value="CLOSED">Encerrada</option>
            </select></label>
          <label className="space-y-1.5 sm:col-span-2"><span className="block text-sm font-medium">Descrição da vaga *</span>
            <textarea required minLength={20} maxLength={6000} rows={7} aria-describedby="job-description-count" className="input-v2 resize-y text-base sm:text-sm" value={form.description} onChange={e => update('description', e.target.value)} />
            <span id="job-description-count" className="block text-right text-xs text-fg-mut">{form.description.length} / 6.000 caracteres</span></label>
          <label className="space-y-1.5 sm:col-span-2"><span className="block text-sm font-medium">Benefícios</span>
            <input className="input-v2 min-h-11 text-base sm:text-sm" aria-describedby="job-benefits-help" value={benefitsText} onChange={e => { setBenefitsText(e.target.value); setDirty(true); }} />
            <span id="job-benefits-help" className="block text-xs text-fg-mut">Separe os benefícios por vírgula.</span></label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <footer className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={saving} onClick={close}>Cancelar</Button>
          <Button type="submit" isLoading={saving}>{job ? 'Salvar alterações' : 'Criar vaga'}</Button>
        </footer>
      </form>
    </Modal>
    <ConfirmDialog isOpen={open && discard} title="Descartar alterações da vaga?" description="Os dados ainda não salvos serão perdidos."
      confirmText="Descartar alterações" cancelText="Continuar edição" onClose={() => setDiscard(false)}
      onConfirm={() => { setDiscard(false); setDirty(false); onClose(); }} />
  </>;
}
