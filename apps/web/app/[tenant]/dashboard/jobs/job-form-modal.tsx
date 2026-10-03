'use client';

import { Briefcase, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Job, JobPayload, JobStatus } from './types';

interface JobFormModalProps {
  open: boolean;
  job: Job | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: JobPayload) => Promise<void>;
}

const EMPTY_FORM: JobPayload = {
  title: '',
  description: '',
  location: '',
  employmentType: 'CLT',
  salaryRange: '',
  benefits: [],
  status: 'OPEN',
};

export function JobFormModal({
  open,
  job,
  saving,
  onClose,
  onSubmit,
}: JobFormModalProps) {
  const [form, setForm] = useState<JobPayload>(EMPTY_FORM);
  const [benefitsText, setBenefitsText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(
      job
        ? {
            title: job.title,
            description: job.description,
            location: job.location ?? '',
            employmentType: job.employmentType ?? 'CLT',
            salaryRange: job.salaryRange ?? '',
            benefits: job.benefits ?? [],
            status: job.status,
          }
        : EMPTY_FORM,
    );
    setBenefitsText((job?.benefits ?? []).join(', '));
    setError('');
  }, [job, open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (form.title.trim().length < 3) {
      setError('Informe um título com pelo menos 3 caracteres.');
      return;
    }
    if (form.description.trim().length < 20) {
      setError('A descrição precisa ter pelo menos 20 caracteres.');
      return;
    }

    const benefits = benefitsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    await onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location?.trim(),
      salaryRange: form.salaryRange?.trim(),
      benefits,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-form-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !saving) onClose();
      }}
    >
      <div className="card-v2 max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-bg-elev shadow-v2-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg-elev px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-v2 bg-brand/10 text-brand">
              <Briefcase size={19} />
            </span>
            <div>
              <h3 id="job-form-title" className="text-base font-black text-fg">
                {job ? 'Editar vaga' : 'Criar nova vaga'}
              </h3>
              <p className="text-xs font-medium text-fg-mut">
                Defina as informações exibidas no portal de carreiras.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-v2-outline flex h-9 w-9 items-center justify-center p-0"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                Título da vaga *
              </span>
              <input
                autoFocus
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="input-v2"
                placeholder="Ex.: Analista de Recursos Humanos"
                maxLength={120}
                required
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                Localização
              </span>
              <input
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                className="input-v2"
                placeholder="São Paulo, SP ou Remoto"
                maxLength={120}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                Tipo de contratação
              </span>
              <select
                value={form.employmentType}
                onChange={(event) => setForm((current) => ({ ...current, employmentType: event.target.value }))}
                className="input-v2"
              >
                <option value="CLT">CLT</option>
                <option value="PJ">Pessoa jurídica</option>
                <option value="ESTAGIO">Estágio</option>
                <option value="TEMPORARIO">Temporário</option>
                <option value="JOVEM_APRENDIZ">Jovem aprendiz</option>
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                Faixa salarial
              </span>
              <input
                value={form.salaryRange}
                onChange={(event) => setForm((current) => ({ ...current, salaryRange: event.target.value }))}
                className="input-v2"
                placeholder="Ex.: R$ 3.500 a R$ 4.500"
                maxLength={80}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                Publicação
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as JobStatus }))
                }
                className="input-v2"
              >
                <option value="OPEN">Aberta e publicada</option>
                <option value="DRAFT">Rascunho</option>
                <option value="CLOSED">Fechada</option>
              </select>
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                Descrição da vaga *
              </span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="input-v2 min-h-36 resize-y py-3"
                placeholder="Descreva responsabilidades, requisitos e diferenciais..."
                maxLength={6000}
                required
              />
              <span className="mt-1 block text-right text-[10px] font-medium text-slate-400">
                {form.description.length}/6000
              </span>
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                Benefícios
              </span>
              <input
                value={benefitsText}
                onChange={(event) => setBenefitsText(event.target.value)}
                className="input-v2"
                placeholder="Vale-refeição, Plano de saúde, Auxílio home office"
              />
              <span className="mt-1 block text-[10px] font-medium text-slate-400">
                Separe os benefícios por vírgula.
              </span>
            </label>
          </div>

          {error && (
            <p className="rounded-v2 border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger">
              {error}
            </p>
          )}

          <footer className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="btn-v2-outline">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-v2-primary min-w-32 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Salvando...' : job ? 'Salvar alterações' : 'Criar vaga'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
