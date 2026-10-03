'use client';
import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Upload, Paperclip } from 'lucide-react';
import { Button, Drawer, ConfirmDialog } from '@/app/components/ui';
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [discard, setDiscard] = useState(false);
  function requestClose() { if (creating) return; if (title || description || files.length || category || priority) setDiscard(true); else onClose(); }
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

  useEffect(() => { if (isOpen) headingRef.current?.focus(); }, [step, isOpen]);

  if (!isOpen) return null;

  const nextStep = () => {
    if (step === 1 && !category) return toast.error('Selecione uma categoria.');
    if (step === 2 && !priority) return toast.error('Selecione uma urgência.');
    if (step === 3 && (title.trim().length < 5 || title.trim().length > 150 || description.trim().length < 10 || description.trim().length > 10000)) return toast.error('Informe um título de 5 a 150 caracteres e uma descrição de 10 a 10.000 caracteres.');
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    if (!category || !priority || !title.trim() || !description.trim()) {
      return toast.error('Preencha todos os campos obrigatórios.');
    }
    await onCreate({ category, title, description, priority, files });
  };

  return (
    <>
    <Drawer isOpen={isOpen} onClose={requestClose} title="Novo chamado" description={`Etapa ${step} de 4`} maxWidth="max-w-lg" footer={<div className="flex flex-wrap justify-between gap-2"><Button type="button" variant="outline" disabled={creating} onClick={step > 1 ? prevStep : requestClose}>{step > 1 ? 'Voltar' : 'Cancelar'}</Button>{step < 4 ? <Button type="button" disabled={creating} onClick={nextStep}>Avançar <ChevronRight size={18} /></Button> : <Button type="submit" form="support-wizard" isLoading={creating}>Abrir chamado</Button>}</div>}>
    <form id="support-wizard" onSubmit={handleSubmit} className="space-y-4">
      <h3 ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-fg focus-visible:outline-none">{step === 1 ? 'Categoria' : step === 2 ? 'Impacto' : step === 3 ? 'Descrição' : 'Revisão e anexos'}</h3>
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="mb-2 text-sm font-black text-fg">1. Qual é o motivo do chamado?</h3>
              {[{ value: 'ACCESS', label: 'Acesso e senha' }, { value: 'BUG', label: 'Erro ou instabilidade' }, { value: 'BILLING', label: 'Financeiro e assinatura' }, { value: 'FEATURE_REQUEST', label: 'Sugestão de melhoria' }, { value: 'OTHER', label: 'Outra dúvida' }].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  aria-pressed={category === cat.value}
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
                  type="button"
                  aria-pressed={priority === pri.value}
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
                <label htmlFor="ticket-title" className="mb-1 block text-sm font-medium text-fg">Assunto (obrigatório)</label>
                <input
                  id="ticket-title"
                  type="text"
                  minLength={5}
                  maxLength={150}
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Erro ao gerar espelho de ponto"
                  className="input-v2 h-11 w-full"
                />
              </div>
              <div>
                <label htmlFor="ticket-description" className="mb-1 block text-sm font-medium text-fg">Descrição (obrigatória)</label>
                <textarea id="ticket-description" required minLength={10} maxLength={10000}
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
              <div className="rounded-xl bg-bg-sub p-3 text-sm text-fg"><p className="font-semibold">{title}</p><p className="mt-1 whitespace-pre-wrap break-words">{description}</p><p className="mt-2">Categoria: {({ ACCESS: 'Acesso e senha', BUG: 'Erro ou instabilidade', BILLING: 'Financeiro e assinatura', FEATURE_REQUEST: 'Sugestão', OTHER: 'Outra dúvida' } as Record<string, string>)[category]} · Impacto: {({ LOW: 'Baixo', NORMAL: 'Normal', HIGH: 'Alto', CRITICAL: 'Crítico' } as Record<string, string>)[priority]}</p></div><h3 className="mb-2 text-sm font-black text-fg">4. Adicione evidências <span className="font-medium text-fg-sub">(opcional)</span></h3>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-v2 border-2 border-dashed border-border bg-bg-sub p-8 transition-colors hover:border-brand/40 hover:bg-brand/5">
                <Upload size={24} className="mb-3 text-brand" />
                <span className="text-sm font-bold text-fg-mut">Clique para anexar arquivos</span>
                <span className="mt-1 text-xs text-fg-sub">PNG, JPG, WEBP, PDF, TXT, MP4 e WEBM · até 20 MB por arquivo</span>
                <input
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.mp4,.webm"
                  disabled={creating}
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    const valid = selected.filter(file => /\.(png|jpe?g|webp|pdf|txt|mp4|webm)$/i.test(file.name) && file.size <= 20 * 1024 * 1024);
                    if (valid.length !== selected.length) toast.error('Selecione tipos aceitos com até 20 MB por arquivo.');
                    setFiles(previous => [...previous, ...valid]);
                    e.target.value = '';
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
                        type="button"
                        disabled={creating}
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

    </form>
    </Drawer>
    <ConfirmDialog isOpen={discard} title="Descartar novo chamado?" description="O conteúdo digitado e os anexos selecionados serão descartados." confirmText="Descartar" onClose={() => setDiscard(false)} onConfirm={() => { setDiscard(false); onClose(); }} />
    </>
  );
}
