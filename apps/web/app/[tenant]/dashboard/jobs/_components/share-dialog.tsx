'use client';

import { Copy, Download, ExternalLink, Lock, Printer, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { EMPLOYMENT_TYPE_LABEL, WORK_MODE_LABEL } from '../types';
import { useWorkspace } from '../../_components/shell-v2/workspace-context';

export interface ShareableJob { id: string; companyId: string; companyName?: string; location?: string | null; workMode?: string | null; employmentType?: string | null; title: string; isInternal?: boolean; confidential?: boolean; status?: string }

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
export function JobSharePanel({ job: base }: { job: ShareableJob }) {
  const workspace = useWorkspace();
  const job = { ...base, companyName: base.companyName ?? workspace.company?.name };
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
    const tag = job.isInternal ? 'Vaga interna' : 'Estamos contratando';
    const steps = job.isInternal
      ? ['Aponte a câmera do celular para o QR code', 'Informe sua matrícula e seu CPF', 'Responda às perguntas e envie']
      : ['Aponte a câmera do celular para o QR code', 'Confira os detalhes da vaga', 'Preencha e envie sua candidatura'];
    const company = job.companyName ? esc(job.companyName) : '';
    const meta = [job.location, job.workMode && (WORK_MODE_LABEL[job.workMode] ?? job.workMode), job.employmentType && (EMPLOYMENT_TYPE_LABEL[job.employmentType] ?? job.employmentType)].filter(Boolean).map((item) => esc(String(item)));
    const size = job.title.length > 42 ? 40 : job.title.length > 26 ? 50 : 62;
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(job.title)}</title><style>
@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:#fff}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1e1145}
.page{width:210mm;height:296mm;margin:0 auto;display:flex;flex-direction:column;overflow:hidden;position:relative;background:#fff}
.bar{height:7mm;background:#7240da}
.head{padding:14mm 18mm 0;display:flex;justify-content:space-between;align-items:center}
.brand{font-weight:900;font-size:22px;letter-spacing:-.5px}.brand i{color:#7240da;font-style:normal}
.company{font-size:15px;font-weight:700;color:#5b5473;text-transform:uppercase;letter-spacing:1.5px}
.hero{padding:16mm 18mm 0}
.tag{display:inline-block;color:#7240da;font-weight:800;letter-spacing:4px;font-size:15px;text-transform:uppercase;border-bottom:3px solid #7240da;padding-bottom:6px}
h1{font-size:${size}px;line-height:1.05;margin:7mm 0 5mm;font-weight:900;letter-spacing:-1.5px;color:#1e1145}
.meta{display:flex;flex-wrap:wrap;gap:8px}.meta span{background:#f3edff;color:#4c1d95;border-radius:999px;padding:7px 16px;font-size:15px;font-weight:700}
.mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 18mm}
.qr{border:2px solid #e4dcef;border-radius:24px;padding:14px;background:#fff;box-shadow:0 10px 40px rgba(76,29,149,.15)}
.qr img{display:block;width:82mm;height:82mm}
.cta{margin-top:8mm;font-size:30px;font-weight:900;color:#1e1145}.cta span{color:#7240da}
.hint{margin-top:2mm;font-size:16px;color:#5b5473}
.steps{display:flex;gap:12px;padding:0 18mm 12mm}
.step{flex:1;border-top:3px solid #7240da;padding-top:10px;font-size:14px;line-height:1.4;font-weight:600;color:#3b2a63}
.step b{display:block;font-size:26px;color:#7240da;font-weight:900;margin-bottom:2px}
.foot{background:#1e1145;color:#c9bfe0;display:flex;justify-content:space-between;align-items:center;padding:7mm 18mm;font-size:13px}
.foot b{color:#fff;font-size:15px}
</style></head><body><div class="page"><div class="bar"></div>
<div class="head"><div class="brand">innovation<i>.</i></div>${company ? `<div class="company">${company}</div>` : ''}</div>
<div class="hero"><span class="tag">${tag}</span><h1>${esc(job.title)}</h1>${meta.length ? `<div class="meta">${meta.map((item) => `<span>${item}</span>`).join('')}</div>` : ''}</div>
<div class="mid"><div class="qr"><img src="${qr}" alt="QR code"/></div><div class="cta">Candidate-se <span>agora</span></div><div class="hint">${job.isInternal ? 'Exclusivo para funcionários da empresa' : 'Leva menos de 5 minutos'}</div></div>
<div class="steps">${steps.map((text, i) => `<div class="step"><b>0${i + 1}</b>${text}</div>`).join('')}</div>
<div class="foot"><span><b>innovation.</b> RH · Carreiras</span><span>innovationia.com.br</span></div></div>
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
