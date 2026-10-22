'use client';
import React, { useRef, useState } from 'react';
import { Camera, Lock, Paperclip, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAction } from '@/app/hooks/use-action';
import { ATTACH_ACCEPT, AttachmentPreviews, mergeFiles } from './attachment-picker';

export interface ReplyInput { text: string; files: File[]; internal: boolean }

export interface ReplyBoxProps {
  /** Deve rejeitar em caso de erro para o texto e os anexos não serem apagados. */
  onSubmit: (input: ReplyInput) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  /** Plataforma: mostra a opção de nota interna. */
  allowInternal?: boolean;
  /** Celular: fixa a caixa no rodapé da tela. */
  sticky?: boolean;
}

/** Caixa de resposta: texto + anexos (escolher, arrastar, colar, câmera do celular) com pré-visualização. */
export function ReplyBox({ onSubmit, disabled, disabledReason, allowInternal, sticky }: ReplyBoxProps) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [internal, setInternal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: File[]) => {
    if (!incoming.length) return;
    const merged = mergeFiles(files, incoming);
    setFiles(merged.files);
    if (merged.warnings.length) toast.error(merged.warnings.join(' '));
  };

  const send = useAction(async () => {
    const body = text.trim();
    if (disabled || (!body && !files.length)) return;
    try {
      await onSubmit({ text: body || (internal ? 'Anexo interno.' : 'Segue em anexo.'), files, internal });
      setText(''); setFiles([]);
    } catch { /* quem chama já avisou o erro; mantém o conteúdo para reenviar */ }
  });

  const blocked = Boolean(disabled) || send.busy;
  const canSend = !blocked && (text.trim().length > 0 || files.length > 0);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void send.run(); }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!blocked) addFiles(Array.from(e.dataTransfer.files)); }}
      className={`shrink-0 border-t border-border bg-bg-elev p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${sticky ? 'sticky bottom-0 z-10' : ''} ${dragging ? 'ring-2 ring-inset ring-brand' : ''} ${internal ? 'bg-amber-50' : ''}`}
    >
      {disabled && disabledReason && <p className="mb-2 rounded-lg bg-bg-sub p-2 text-xs text-slate-600" role="status">{disabledReason}</p>}
      {allowInternal && (
        <div className="mb-2 flex gap-1" role="radiogroup" aria-label="Tipo de mensagem">
          {[{ v: false, l: 'Resposta ao cliente' }, { v: true, l: 'Nota interna' }].map((o) => (
            <button key={o.l} type="button" role="radio" aria-checked={internal === o.v} onClick={() => setInternal(o.v)}
              className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${internal === o.v ? (o.v ? 'bg-amber-500 text-white' : 'bg-brand text-white') : 'border border-border bg-bg-elev text-slate-600'}`}>
              {o.v && <Lock size={12} aria-hidden />}{o.l}
            </button>
          ))}
        </div>
      )}
      <AttachmentPreviews files={files} onRemove={(i) => setFiles((f) => f.filter((_, idx) => idx !== i))} />
      <div className="mt-1 flex items-end gap-2">
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={blocked} aria-label="Anexar arquivo"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-slate-600 hover:bg-bg-sub disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            <Paperclip size={18} aria-hidden />
          </button>
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={blocked} aria-label="Tirar foto com a câmera"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-slate-600 hover:bg-bg-sub disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            <Camera size={18} aria-hidden />
          </button>
        </div>
        <input ref={fileRef} type="file" multiple accept={ATTACH_ACCEPT} className="hidden" tabIndex={-1} aria-hidden onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" tabIndex={-1} aria-hidden onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <label className="min-w-0 flex-1">
          <span className="sr-only">{internal ? 'Nota interna' : 'Sua mensagem'}</span>
          <textarea
            value={text} rows={2} disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => { const pasted = Array.from(e.clipboardData.files); if (pasted.length) { e.preventDefault(); addFiles(pasted); } }}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send.run(); } }}
            placeholder={internal ? 'Escreva uma nota visível só para a equipe' : 'Escreva sua mensagem (arraste ou cole imagens aqui)'}
            maxLength={10000}
            className="input-v2 block !h-14 !min-h-0 w-full resize-none py-2 text-sm"
          />
        </label>
        <button type="submit" disabled={!canSend} aria-label={internal ? 'Salvar nota interna' : 'Enviar mensagem'}
          className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-bold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          <Send size={16} aria-hidden /><span className="hidden sm:inline">{send.busy ? 'Enviando...' : 'Enviar'}</span>
        </button>
      </div>
    </form>
  );
}
