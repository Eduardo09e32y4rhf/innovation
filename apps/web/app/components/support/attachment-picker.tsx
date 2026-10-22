'use client';
import React, { useEffect, useMemo } from 'react';
import { FileText, Film, X } from 'lucide-react';
import { formatFileSize } from './support-model';

export const ATTACH_ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf,text/plain,video/mp4,video/webm,.png,.jpg,.jpeg,.webp,.pdf,.txt,.mp4,.webm';
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'txt', 'mp4', 'webm'];

/** Valida e junta arquivos novos aos já escolhidos. Devolve também os avisos (em português) dos recusados. */
export function mergeFiles(current: File[], incoming: File[]): { files: File[]; warnings: string[] } {
  const files = [...current];
  const warnings: string[] = [];
  for (const f of incoming) {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    const named = f.name && f.name !== 'image.png' ? f.name : `imagem-colada-${Date.now()}.png`;
    if (!ALLOWED_EXT.includes(ext) && !/^(image|video)\//.test(f.type) && f.type !== 'application/pdf') { warnings.push(`"${named}" não é um tipo aceito (use imagem, PDF, TXT ou vídeo).`); continue; }
    if (f.size > MAX_FILE_BYTES) { warnings.push(`"${named}" passa de 20 MB.`); continue; }
    if (files.some((x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)) continue;
    if (files.length >= MAX_FILES) { warnings.push(`Máximo de ${MAX_FILES} anexos por envio.`); break; }
    files.push(f);
  }
  return { files, warnings };
}

function Preview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/');
  const url = useMemo(() => (isImage ? URL.createObjectURL(file) : null), [file, isImage]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <li className="relative flex w-24 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-bg-sub">
      <div className="flex h-16 items-center justify-center overflow-hidden bg-slate-100">
        {url ? <img src={url} alt={`Pré-visualização de ${file.name}`} className="h-full w-full object-cover" />
          : file.type.startsWith('video/') ? <Film size={22} aria-hidden className="text-slate-500" /> : <FileText size={22} aria-hidden className="text-slate-500" />}
      </div>
      <span className="truncate px-1.5 pt-1 text-[10px] font-semibold text-fg" title={file.name}>{file.name}</span>
      <span className="px-1.5 pb-1 text-[10px] text-slate-500">{formatFileSize(file.size)}</span>
      <button type="button" onClick={onRemove} aria-label={`Remover anexo ${file.name}`}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
        <X size={14} aria-hidden />
      </button>
    </li>
  );
}

/** Faixa de pré-visualização dos anexos escolhidos (rola na horizontal dentro da própria faixa). */
export function AttachmentPreviews({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  if (!files.length) return null;
  return (
    <ul className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Anexos a enviar">
      {files.map((f, i) => <Preview key={`${f.name}-${f.size}-${f.lastModified}`} file={f} onRemove={() => onRemove(i)} />)}
    </ul>
  );
}
