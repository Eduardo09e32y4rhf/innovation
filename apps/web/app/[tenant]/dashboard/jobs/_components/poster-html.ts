export type PosterInput = { title: string; company?: string; meta: string[]; internal: boolean; qr: string };

const esc = (text: string) => text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));

/** Cartaz A4 da vaga: capa escura com o cargo em destaque, folha branca com QR code, passos e marca. HTML autonomo para imprimir/salvar em PDF. */
export function buildPosterHtml({ title, company, meta, internal, qr }: PosterInput): string {
  const words = title.trim().split(/\s+/);
  const last = words.length > 2 && words[words.length - 1].length <= 12 ? words.pop() : null;
  const head = esc(words.join(' '));
  const size = title.length > 46 ? 56 : title.length > 30 ? 68 : 84;
  const tag = internal ? 'Vaga interna' : 'Estamos contratando';
  const sub = internal ? 'Exclusivo para funcionários da empresa' : 'Leva menos de 5 minutos';
  const steps = internal
    ? ['Aponte a câmera do celular para o QR code', 'Informe sua matrícula e seu CPF', 'Responda às perguntas e envie']
    : ['Aponte a câmera do celular para o QR code', 'Confira os detalhes da vaga', 'Preencha e envie sua candidatura'];
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:#e9e5f0}body{font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;color:#1e1145}
.page{width:210mm;height:297mm;margin:0 auto;position:relative;overflow:hidden;background:#fff}
.hero{position:absolute;inset:0 0 auto 0;height:188mm;color:#fff;overflow:hidden;background:radial-gradient(900px 600px at 78% 8%,#7c4ae6 0%,rgba(124,74,230,0) 60%),linear-gradient(160deg,#1b0f4a 0%,#2a1470 55%,#120a33 100%)}
.stripe{position:absolute;top:-20mm;bottom:-20mm;width:34mm;transform:skewX(-18deg);background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.02))}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px);background-size:100% 24mm}
.top{position:absolute;left:18mm;right:18mm;top:15mm;display:flex;justify-content:space-between;align-items:center}
.brand{font-weight:800;font-size:23px;letter-spacing:-.6px}.brand i{font-style:normal;color:#b79cff}
.company{font-size:12px;letter-spacing:4px;text-transform:uppercase;font-weight:700;opacity:.85;text-align:right}
.copy{position:absolute;left:18mm;right:18mm;top:50mm}
.tag{display:flex;align-items:center;gap:14px;font-size:13px;letter-spacing:5px;text-transform:uppercase;font-weight:700;opacity:.95}.tag:before{content:"";width:18mm;height:2px;background:#9b7bff}
h1{margin:9mm 0 9mm;font-size:${size}px;line-height:.98;font-weight:800;letter-spacing:-3px;max-width:165mm}
h1 em{display:block;font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-style:italic;font-weight:400;letter-spacing:-1px;font-size:1.25em;color:#b79cff;margin-top:2mm}
.chips{display:flex;flex-wrap:wrap;gap:10px}.chips span{border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);border-radius:999px;padding:9px 20px;font-size:15px;font-weight:700}
.sheet{position:absolute;left:0;right:0;top:170mm;bottom:0;background:#fff;border-radius:46px 46px 0 0;padding:15mm 18mm 0;display:flex;flex-direction:column}
.bar{position:absolute;left:18mm;top:0;width:24mm;height:5px;background:#7240da;border-radius:0 0 4px 4px}
.cols{display:flex;gap:12mm;align-items:flex-start;flex:1}
.left{flex:1;min-width:0}.cta{font-size:37px;white-space:nowrap;font-weight:800;letter-spacing:-1.8px;line-height:1.05;margin:0}
.cta em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;color:#7240da;font-size:1.18em;letter-spacing:-.5px}
.hint{margin:3mm 0 7mm;font-size:15px;color:#5b5473;font-weight:500}
.step{display:flex;gap:16px;align-items:center;padding:12px 0;border-top:1.5px solid #ece7f5;font-size:16.5px;font-weight:600;line-height:1.3}
.step b{color:#7240da;font-size:15px;letter-spacing:1px;width:26px;flex:none}
.qrbox{width:78mm;flex:none;text-align:center}.qr{background:#f6f2ff;border:1.5px solid #e4dcef;border-radius:28px;padding:14px;box-shadow:0 14px 40px rgba(76,29,149,.16)}
.qr img{display:block;width:100%;aspect-ratio:1;border-radius:14px}.cap{margin-top:12px;font-size:13px;letter-spacing:1.2px;color:#5b5473;font-weight:700;text-transform:uppercase}
.foot{display:flex;justify-content:space-between;align-items:center;border-top:1.5px solid #ece7f5;padding:6mm 0 9mm;font-size:13px;color:#5b5473;font-weight:600}
.foot strong{color:#1e1145;font-size:17px;letter-spacing:-.4px;font-weight:800}.foot strong i{font-style:normal;color:#7240da}
@media screen{.page{margin:0 auto}}
</style></head><body><div class="page">
<div class="hero"><div class="grid"></div>${[28, 68, 108, 148, 188].map((x, i) => `<div class="stripe" style="left:${x}mm;opacity:${i === 2 ? 1 : 0.7}"></div>`).join('')}
<div class="top"><div class="brand">innovation<i>.</i></div>${company ? `<div class="company">${esc(company)}</div>` : ''}</div>
<div class="copy"><div class="tag">${tag}</div><h1>${head}${last ? `<em>${esc(last)}</em>` : ''}</h1>${meta.length ? `<div class="chips">${meta.map((item) => `<span>${esc(item)}</span>`).join('')}</div>` : ''}</div></div>
<div class="sheet"><div class="bar"></div><div class="cols"><div class="left"><p class="cta">Candidate-se <em>agora</em></p><p class="hint">${sub}</p>${steps.map((text, i) => `<div class="step"><b>0${i + 1}</b><span>${text}</span></div>`).join('')}</div>
<div class="qrbox"><div class="qr"><img src="${qr}" alt="QR code"/></div><div class="cap">Escaneie e candidate-se</div></div></div>
<div class="foot"><span><strong>innovation<i>.</i></strong> connect RH · Carreiras</span><span>innovationia.com.br</span></div></div>
</div><script>(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>setTimeout(()=>window.print(),500))</script></body></html>`;
}
