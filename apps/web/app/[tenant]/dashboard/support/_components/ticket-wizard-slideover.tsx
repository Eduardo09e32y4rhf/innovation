'use client';
import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Upload, Paperclip } from 'lucide-react';
import { ButtonPrimary, ButtonSecondary, GlassCard } from '@/app/components/platform-ui';
import { toast } from 'sonner';

export function TicketWizardSlideover({
  isOpen,
  onClose,
  onCreate,
  creating
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { category: string; title: string; description: string; priority: string; files: File[] }) => Promise<void>;
  creating: boolean;
}) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setCategory('');
    setPriority('');
    setTitle('');
    setDescription('');
    setFiles([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const nextStep = () => {
    if (step === 1 && !category) return toast.error('Selecione uma categoria.');
    if (step === 2 && !priority) return toast.error('Selecione uma urgência.');
    if (step === 3 && (!title.trim() || !description.trim())) return toast.error('Preencha título e descrição.');
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !priority || !title.trim() || !description.trim()) {
      return toast.error('Preencha todos os campos obrigatórios.');
    }
    await onCreate({ category, title, description, priority, files });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all">
      <div className="flex h-full w-full max-w-md flex-col bg-bg-elev shadow-v2-xl animate-in slide-in-from-right duration-300">
        <header className="flex items-center justify-between border-b border-border bg-bg-sub/70 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-fg">Novo chamado</h2>
            <p className="text-xs font-semibold text-fg-mut">Etapa {step} de 4</p>
          </div>
          <button onClick={onClose} aria-label="Fechar novo chamado" className="flex h-9 w-9 items-center justify-center rounded-v2 text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="mb-2 text-sm font-black text-fg">1. Qual é o motivo do chamado?</h3>
              {[{ value: 'ACCESS', label: 'Acesso e senha' }, { value: 'BUG', label: 'Erro ou instabilidade' }, { value: 'BILLING', label: 'Financeiro e assinatura' }, { value: 'FEATURE_REQUEST', label: 'Sugestão de melhoria' }, { value: 'OTHER', label: 'Outra dúvida' }].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all ${
                    category === cat.value ? 'border-brand bg-brand/10 text-brand font-bold shadow-v2-sm' : 'border-border hover:border-brand/30 hover:bg-bg-sub font-semibold text-fg-mut'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="mb-2 text-sm font-black text-fg">2. Qual o impacto para sua operação?</h3>
              {[
                { value: 'LOW', label: 'Baixa (Pode esperar)' },
                { value: 'NORMAL', label: 'Normal (Dúvida comum)' },
                { value: 'HIGH', label: 'Alta (Impacta meu trabalho)' },
                { value: 'CRITICAL', label: 'Crítica (Sistema parado)' },
              ].map((pri) => (
                <button
                  key={pri.value}
                  onClick={() => setPriority(pri.value)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all ${
                    priority === pri.value ? 'border-brand bg-brand/10 text-brand font-bold shadow-v2-sm' : 'border-border hover:border-brand/30 hover:bg-bg-sub font-semibold text-fg-mut'
                  }`}
                >
                  {pri.label}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="mb-2 text-sm font-black text-fg">3. Conte o que aconteceu</h3>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Assunto / Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Erro ao gerar espelho de ponto"
                  className="input-v2 h-11 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Descreva o problema com o máximo de detalhes possível..."
                  className="input-v2 min-h-36 w-full resize-none py-3"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="mb-2 text-sm font-black text-fg">4. Adicione evidências <span className="font-medium text-fg-sub">(opcional)</span></h3>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-v2 border-2 border-dashed border-border bg-bg-sub p-8 transition-colors hover:border-brand/40 hover:bg-brand/5">
                <Upload size={24} className="mb-3 text-brand" />
                <span className="text-sm font-bold text-fg-mut">Clique para anexar arquivos</span>
                <span className="mt-1 text-xs text-fg-sub">PNG, JPG, PDF (máx. 20 MB)</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                  }}
                />
              </label>

              {files.length > 0 && (
                <ul className="space-y-2 mt-4">
                  {files.map((file, i) => (
                    <li key={i} className="flex items-center justify-between rounded-v2 border border-border bg-bg-elev p-3 shadow-v2-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip size={14} className="shrink-0 text-fg-sub" />
                        <span className="truncate text-xs font-semibold text-fg-mut">{file.name}</span>
                      </div>
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Remover ${file.name}`}
                        className="rounded-full p-1 text-fg-sub transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border bg-bg-sub/70 px-6 py-4">
          {step > 1 ? (
            <ButtonSecondary onClick={prevStep} type="button" disabled={creating} className="px-3! py-2!">
              <ChevronLeft size={16} /> Voltar
            </ButtonSecondary>
          ) : (
            <div /> // Spacer
          )}

          {step < 4 ? (
            <ButtonPrimary onClick={nextStep} type="button" className="flex items-center gap-1 px-4! py-2!">
              Avançar <ChevronRight size={16} />
            </ButtonPrimary>
          ) : (
            <ButtonPrimary onClick={handleSubmit} type="button" disabled={creating} className="px-6! py-2!">
              {creating ? 'Registrando...' : 'Finalizar e Abrir'}
            </ButtonPrimary>
          )}
        </footer>
      </div>
    </div>
  );
}
