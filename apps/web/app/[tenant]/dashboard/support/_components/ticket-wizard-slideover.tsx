'use client';
import React, { useState } from 'react';
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
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <header className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-950">Novo Chamado</h2>
            <p className="text-xs font-semibold text-slate-500">Etapa {step} de 4</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-sm font-bold text-slate-900 mb-2">1. Selecione a Categoria</h3>
              {['Dúvida', 'Erro/Bug', 'Financeiro', 'Sugestão', 'Outro'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all ${
                    category === cat ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold shadow-sm' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 font-semibold text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-sm font-bold text-slate-900 mb-2">2. Nível de Urgência</h3>
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
                    priority === pri.value ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold shadow-sm' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 font-semibold text-slate-600'
                  }`}
                >
                  {pri.label}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-sm font-bold text-slate-900 mb-2">3. Detalhes do Chamado</h3>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Assunto / Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Erro ao gerar espelho de ponto"
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 text-sm font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Descreva o problema com o máximo de detalhes possível..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 text-sm font-medium outline-none resize-none"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-sm font-bold text-slate-900 mb-2">4. Anexos (Opcional)</h3>
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                <Upload size={24} className="text-slate-400 mb-3" />
                <span className="text-sm font-bold text-slate-600">Clique para anexar arquivos</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG, PDF (Máx 20MB)</span>
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
                    <li key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip size={14} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-700 truncate">{file.name}</span>
                      </div>
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
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

        <footer className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
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
