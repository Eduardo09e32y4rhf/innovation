'use client';

import { Copy, Download, ExternalLink, Lock, Printer, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';

export interface ShareableJob { id: string; companyId: string; companyName?: string; title: string; isInternal?: boolean; confidential?: boolean; status?: string }

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
    const tag = job.isInternal ? 'VAGA INTERNA' : 'ESTAMOS CONTRATANDO';
    const sub = job.isInternal ? 'Oportunidade exclusiva para quem já faz parte do time.' : 'Venha fazer parte do nosso time.';
    const steps = job.isInternal
      ? ['Aponte a câmera do celular para o QR code', 'Informe sua matrícula e seu CPF', 'Responda às perguntas e envie']
      : ['Aponte a câmera do celular para o QR code', 'Veja os detalhes da vaga', 'Preencha e envie sua candidatura'];
    const company = job.companyName ? esc(job.companyName) : '';
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(job.title)}</title><style>
@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:#fff}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1e1145}
.page{width:210mm;min-height:297mm;margin:0 auto;display:flex;flex-direction:column;background:#fff}
.top{background:linear-gradient(135deg,#4c1d95,#7240da);color:#fff;padding:18mm 16mm 22mm;text-align:center;border-radius:0 0 40px 40px}
.tag{display:inline-block;background:#fff;color:#5b29be;border-radius:999px;padding:7px 22px;font-weight:800;letter-spacing:3px;font-size:14px}
h1{font-size:52px;line-height:1.1;margin:18px 0 10px;font-weight:900;letter-spacing:-1px}
.sub{font-size:19px;opacity:.9;margin:0}.company{margin-top:12px;font-size:17px;font-weight:700;opacity:.95}
.mid{flex:1;display:flex;flex-direction:column;align-items:center;padding:0 16mm}
.qr{margin-top:-14mm;background:#fff;border:3px solid #7240da;border-radius:28px;padding:16px;box-shadow:0 8px 30px rgba(76,29,149,.25)}
.qr img{display:block;width:78mm;height:78mm}
.cta{margin:10mm 0 6mm;font-size:26px;font-weight:800;color:#5b29be}
.steps{display:flex;gap:10px;width:100%;margin-bottom:8mm}
.step{flex:1;background:#f5f0ff;border-radius:18px;padding:14px 12px;text-align:center;font-size:14px;line-height:1.35;font-weight:600}
.step b{display:flex;width:30px;height:30px;margin:0 auto 8px;border-radius:50%;background:#7240da;color:#fff;align-items:center;justify-content:center;font-size:15px}
.url{font-size:13px;color:#5b5473;word-break:break-all;text-align:center}
.foot{margin-top:auto;background:#1e1145;color:#c9bfe0;text-align:center;padding:9mm 16mm;font-size:13px}
.brand{font-weight:900;font-size:20px;color:#fff}.brand i{color:#a78bfa;font-style:normal}
</style></head><body><div class="page"><div class="top"><span class="tag">${tag}</span><h1>${esc(job.title)}</h1><p class="sub">${sub}</p>${company ? `<div class="company">${company}</div>` : ''}</div>
<div class="mid"><div class="qr"><img src="${qr}" alt="QR code"/></div><div class="cta">Candidate-se agora</div>
<div class="steps">${steps.map((text, i) => `<div class="step"><b>${i + 1}</b>${text}</div>`).join('')}</div>
<p class="url">${esc(url)}</p></div>
<div class="foot"><div class="brand">innovation<i>.</i></div>RH · Carreiras</div></div>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`);
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
