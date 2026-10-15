'use client';

import { Copy, Download, ExternalLink, Lock, Printer, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';

export interface ShareableJob { id: string; companyId: string; title: string; isInternal?: boolean; confidential?: boolean; status?: string }

/** Link certo para cada tipo de vaga: interna usa a pagina de matricula + CPF; externa e confidencial, a pagina publica. */
export function jobPublicUrl(job: ShareableJob, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  return job.isInternal ? `${origin}/carreiras/interna/${job.id}` : `${origin}/carreiras/${job.companyId}/${job.id}`;
}

/** Link + QR code da vaga numa janela. */
export function JobShareDialog({ job, isOpen, onClose, title = 'Divulgar a vaga' }: { job: ShareableJob | null; isOpen: boolean; onClose: () => void; title?: string }) {
  if (!job) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={job.title} maxWidth="max-w-lg">
      {isOpen && <JobSharePanel job={job} />}
    </Modal>
  );
}

/** Link + QR code da vaga: copiar, baixar o QR (PNG), imprimir cartaz e compartilhar. */
export function JobSharePanel({ job }: { job: ShareableJob }) {
  const [qr, setQr] = useState('');
  const url = jobPublicUrl(job);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1e1145', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [url]);

  const fileName = `vaga-${job.title.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'qr'}.png`;
  const share = `${job.isInternal ? 'Vaga interna' : 'Vaga'}: ${job.title}. Candidate-se:`;

  async function copy() {
    try { await navigator.clipboard.writeText(url); toast.success('Link copiado.'); } catch { toast.error('Não foi possível copiar. Selecione o link e copie.'); }
  }

  function poster() {
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) { toast.error('Libere pop-ups para imprimir o cartaz.'); return; }
    const esc = (text: string) => text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(job.title)}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:48px;color:#1e1145}h1{font-size:40px;margin:8px 0}p{font-size:20px;color:#5b5473}img{width:420px;height:420px;margin:24px auto;display:block}.tag{display:inline-block;background:#7240da;color:#fff;border-radius:999px;padding:6px 18px;font-weight:bold;letter-spacing:1px}.url{font-size:15px;word-break:break-all}</style></head><body><span class="tag">${job.isInternal ? 'VAGA INTERNA' : 'ESTAMOS CONTRATANDO'}</span><h1>${esc(job.title)}</h1><p>Aponte a câmera do celular para o QR code e candidate-se.</p><img src="${qr}" alt="QR code"/><p class="url">${esc(url)}</p>${job.isInternal ? '<p>Só para funcionários: tenha em mãos sua matrícula e seu CPF.</p>' : ''}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    win.document.close();
  }

  return (
      <div className="space-y-4">
        {job.isInternal && <p className="flex items-start gap-2 rounded-xl bg-purple-50 p-3 text-sm text-purple-900"><Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Vaga interna: só se candidata quem informar <strong>matrícula e CPF</strong> de um funcionário ativo da empresa.</p>}
        {job.confidential && !job.isInternal && <p className="rounded-xl bg-zinc-100 p-3 text-sm text-zinc-800">Vaga confidencial: não aparece no portal. Só quem tiver este link ou o QR code consegue ver e se candidatar.</p>}
        {job.status && job.status !== 'OPEN' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">A vaga ainda não está publicada. O link funciona depois de publicar.</p>}
        {/* eslint-disable-next-line @next/next/no-img-element -- QR gerado no navegador (data URL) */}
        <div className="flex justify-center">{qr ? <img src={qr} alt={`QR code da vaga ${job.title}`} className="h-56 w-56 rounded-xl border border-border bg-white p-2" /> : <div className="h-56 w-56 animate-pulse rounded-xl bg-bg-sub" />}</div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-sub/60 p-2">
          <input readOnly aria-label="Link da vaga" className="min-w-0 flex-1 bg-transparent px-1 text-sm text-fg outline-none" value={url} onFocus={(event) => event.target.select()} />
          <Button size="sm" onClick={copy}><Copy size={14} aria-hidden="true" /> Copiar</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <a className="btn btn-outline btn-md inline-flex items-center justify-center gap-2" href={qr || undefined} download={fileName} aria-disabled={!qr}><Download size={15} aria-hidden="true" /> Baixar QR code</a>
          <button type="button" className="btn btn-outline btn-md inline-flex items-center justify-center gap-2" onClick={poster} disabled={!qr}><Printer size={15} aria-hidden="true" /> Imprimir cartaz</button>
          <button type="button" className="btn btn-outline btn-md inline-flex items-center justify-center gap-2" onClick={async () => {
            // Celular: abre o menu de compartilhar do aparelho (qualquer app). Computador: copia o texto.
            if (navigator.share) { try { await navigator.share({ title: job.title, text: share, url }); } catch { /* cancelado */ } return; }
            try { await navigator.clipboard.writeText(`${share} ${url}`); toast.success('Texto de divulgação copiado.'); } catch { toast.error('Não foi possível copiar.'); }
          }}><Share2 size={15} aria-hidden="true" /> Compartilhar</button>
          <a className="btn btn-outline btn-md inline-flex items-center justify-center gap-2" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" /> Abrir página</a>
        </div>
      </div>
  );
}
