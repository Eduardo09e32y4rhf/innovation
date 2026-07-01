// Utilities to build consistent, premium, brand-aligned PDF documents for the platform.

export type PdfCompanyInfo = {
  name: string;
  legalName?: string | null;
  document?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type PdfOptions = {
  title: string;
  subtitle?: string;
  landscape?: boolean;
};

function buildBaseStyles(landscape = false) {
  const pageSize = landscape ? 'A4 landscape' : 'A4';
  const margin = landscape ? '5mm 5mm' : '5mm 5mm';

  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    @page { 
      size: ${pageSize}; 
      margin: ${margin}; 
    }
    
    @media print {
      .no-print { display: none !important; }
      .page { width: 100%; max-width: 100%; page-break-after: avoid; }
      .print-section { break-inside: avoid; page-break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; break-inside: avoid; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: 'Inter', -apple-system, sans-serif; 
      color: #1e293b; /* slate-800 */
      background: #fff; 
      font-size: 7.5pt; 
      line-height: 1.15; 
    }
    
    .page { width: 100%; }
  `;
}

export function buildPdfShell(options: PdfOptions, company: PdfCompanyInfo | null, body: string) {
  const title = options.title;
  const subtitle = options.subtitle ?? '';
  const emittedDate = new Date().toLocaleString('pt-BR');
  const styles = buildBaseStyles(options.landscape);

  const header = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${company?.logoUrl
          ? `<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;"><img src="${escapeAttr(company.logoUrl)}" alt="Logo" style="max-width:30px;max-height:30px;object-fit:contain;" /></div>`
          : `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px solid #0d9488;border-radius:6px;color:#0d9488;font-weight:800;font-size:12px;background:#f0fdfa;">RH</div>`
        }
        <div>
          <div style="font-size:8px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;text-transform:uppercase;">${escapeHtml(company?.name || 'Empresa')}</div>
          ${company?.legalName ? `<div style="font-size:7px;font-weight:500;color:#64748b;margin-top:1px;">${escapeHtml(company.legalName)}</div>` : ''}
          <div style="font-size:7px;color:#64748b;margin-top:2px;font-weight:500;">
            ${[company?.document, company?.address, company?.phone, company?.email].filter(Boolean).map(v => escapeHtml(v as string)).join(' &bull; ')}
          </div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:8px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:-0.02em;">${escapeHtml(title)}</div>
        ${subtitle ? `<div style="font-size:6.5px;font-weight:600;color:#475569;margin-top:1px;">${escapeHtml(subtitle)}</div>` : ''}
        <div style="font-size:7px;color:#94a3b8;margin-top:2px;font-weight:500;">EMITIDO EM ${escapeHtml(emittedDate)}</div>
      </div>
    </div>
  `;

  const footer = `
    <div style="margin-top:10px;border-top:1px solid #e2e8f0;padding-top:4px;display:flex;justify-content:space-between;color:#94a3b8;font-size:6.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
      <span>INNOVATION RH CONNECT</span>
      <span>DOCUMENTO COM VALIDADE LEGAL - GERADO ELETRONICAMENTE</span>
      <span class="page-number"></span>
    </div>
  `;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  <main class="page">${header}${body}${footer}</main>
</body>
</html>`;
}

export function section(title: string, content: string) {
  return `
    <div class="print-section" style="margin-bottom:6px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;page-break-inside:avoid;">
      <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#334155;padding:3px 6px;font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
        ${escapeHtml(title)}
      </div>
      <div style="padding:4px 6px;">${content}</div>
    </div>
  `;
}

export function infoGrid(items: { label: string; value: string | null | undefined }[], columns = 3) {
  const cells = items.map(item => `
    <div style="padding:1px 2px;">
      <div style="font-size:6.5px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.04em;">${escapeHtml(item.label)}</div>
      <div style="font-size:8px;font-weight:600;color:#0f172a;margin-top:1px;">${escapeHtml(item.value || '---')}</div>
    </div>
  `).join('');
  return `<div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:4px 2px;">${cells}</div>`;
}

export function pdfTable(headers: string[], rows: string[], options?: { zebra?: boolean; headerBg?: string; headerColor?: string; fontSize?: string; compact?: boolean }) {
  const zebra = options?.zebra ?? true;
  const headerBg = options?.headerBg ?? '#f1f5f9';
  const headerColor = options?.headerColor ?? '#475569';
  const fontSize = options?.fontSize ?? '7px';
  const paddingY = options?.compact ? '2px' : '3px';
  
  const thead = headers.map(h => `<th style="padding:${paddingY} 4px;text-align:left;font-size:6.5px;font-weight:700;text-transform:uppercase;color:${headerColor};border-bottom:2px solid #cbd5e1;letter-spacing:0.05em;">${escapeHtml(h)}</th>`).join('');
  const tbody = rows.map((r, i) => {
    const bg = zebra ? (i % 2 === 0 ? '#ffffff' : '#f8fafc') : 'transparent';
    return `<tr style="background:${bg};border-bottom:1px solid #f1f5f9;">${r}</tr>`;
  }).join('');
  return `
    <table style="width:100%;border-collapse:collapse;margin:2px 0;font-size:${fontSize};">
      <thead><tr style="background:${headerBg};">${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

export function signatureBlock(lines: string[]) {
  const cols = lines.map(line => `
    <div style="text-align:center;page-break-inside:avoid;width:100%;">
      <div style="border-top:1px solid #cbd5e1;padding-top:6px;margin-top:16px;font-size:6.5px;font-weight:600;color:#334155;">${escapeHtml(line)}</div>
    </div>`).join('');
  return `<div style="display:flex;justify-content:space-between;gap:32px;margin-top:10px;padding:0 12px;">${cols}</div>`;
}

export function printPdf(html: string, title: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.title = title;
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    window.alert('Não foi possível gerar o PDF. Verifique se o navegador bloqueou pop-ups.');
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1000);
  };
}

export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#039;' }[char] ?? char));
}

function escapeAttr(value: string) {
  return value.replace(/"/g, '"').replace(/'/g, '&#039;');
}