// Utilities to build consistent, brand-aligned PDF documents for the platform.

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

const PAGE_STYLES = {
  portrait: `@page { size: A4; margin: 8mm 9mm; }`,
  landscape: `@page { size: A4 landscape; margin: 6mm 8mm; }`,
};

function buildBaseStyles(landscape = false) {
  return `
    ${PAGE_STYLES[landscape ? 'landscape' : 'portrait']}
    @media print {
      .no-print { display: none !important; }
      .page { width: 100%; max-width: 100%; page-break-after: avoid; }
      .print-section { break-inside: avoid; page-break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; break-inside: avoid; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif; color: #0f172a; background: #fff; font-size: 9pt; line-height: 1.45; }
    .page { width: 100%; }
  `;
}

export function buildPdfShell(options: PdfOptions, company: PdfCompanyInfo | null, body: string) {
  const title = options.title;
  const subtitle = options.subtitle ?? '';
  const emittedAt = new Date().toLocaleString('pt-BR');
  const emittedDate = new Date().toLocaleDateString('pt-BR');
  const styles = buildBaseStyles(options.landscape);

  const header = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid #0f172a;padding-bottom:8px;margin-bottom:12px;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${company?.logoUrl
          ? `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;"><img src="${escapeAttr(company.logoUrl)}" alt="Logo" style="max-width:40px;max-height:40px;object-fit:contain;" /></div>`
          : `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:2px solid #0f766e;border-radius:6px;color:#0f766e;font-weight:900;font-size:10px;">RH</div>`
        }
        <div>
          <div style="font-size:13px;font-weight:900;color:#0f172a;letter-spacing:-.2px;text-transform:uppercase;">${escapeHtml(company?.name || 'Empresa')}</div>
          ${company?.legalName ? `<div style="font-size:7px;color:#64748b;margin-top:2px;">${escapeHtml(company.legalName)}</div>` : ''}
          <div style="font-size:7px;color:#64748b;margin-top:2px;">
            ${[company?.document, company?.address, company?.phone, company?.email].filter(Boolean).map(v => escapeHtml(v as string)).join(' | ')}
          </div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;">${escapeHtml(title)}</div>
        ${subtitle ? `<div style="font-size:7px;color:#64748b;margin-top:2px;">${escapeHtml(subtitle)}</div>` : ''}
        <div style="font-size:7px;color:#94a3b8;margin-top:2px;">Emitido em ${escapeHtml(emittedDate)}</div>
      </div>
    </div>
  `;

  const footer = `
    <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:space-between;color:#94a3b8;font-size:7px;font-weight:600;">
      <span>Innovation RH Connect</span>
      <span>Documento gerado automaticamente</span>
      <span class="page-number">Página 1 de 1</span>
    </div>
  `;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${styles}
    @page {
      @bottom-center {
        content: counter(page) " de " counter(pages);
        font-size: 7pt;
        color: #94a3b8;
      }
    }
  </style>
</head>
<body>
  <main class="page">${header}${body}${footer}</main>
</body>
</html>`;
}

export function section(title: string, content: string) {
  return `
    <div class="print-section" style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;page-break-inside:avoid;">
      <div style="background:#0f172a;color:#fff;padding:6px 12px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(title)}</div>
      <div style="padding:10px 12px;">${content}</div>
    </div>
  `;
}

export function infoGrid(items: { label: string; value: string }[], columns = 3) {
  const cells = items.map(item => `
    <div style="padding:5px 7px;border-bottom:1px solid #f1f5f9;">
      <div style="font-size:6px;font-weight:900;text-transform:uppercase;color:#94a3b8;letter-spacing:0.08em;">${escapeHtml(item.label)}</div>
      <div style="font-size:9px;font-weight:600;color:#0f172a;margin-top:1px;">${escapeHtml(item.value)}</div>
    </div>
  `).join('');
  return `<div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:1px;">${cells}</div>`;
}

export function pdfTable(headers: string[], rows: string[], options?: { zebra?: boolean; headerBg?: string; headerColor?: string; fontSize?: string }) {
  const zebra = options?.zebra ?? true;
  const headerBg = options?.headerBg ?? '#0f172a';
  const headerColor = options?.headerColor ?? '#fff';
  const fontSize = options?.fontSize ?? '7px';
  const thead = headers.map(h => `<th style="padding:6px 8px;text-align:left;font-size:${fontSize};font-weight:900;text-transform:uppercase;color:${headerColor};border-bottom:2px solid ${headerBg};letter-spacing:0.05em;">${escapeHtml(h)}</th>`).join('');
  const tbody = rows.map((r, i) => {
    const bg = zebra ? (i % 2 === 0 ? '#f8fafc' : '#ffffff') : 'transparent';
    return `<tr style="background:${bg};">${r}</tr>`;
  }).join('');
  return `
    <table style="width:100%;border-collapse:collapse;margin:8px 0;">
      <thead><tr style="background:${headerBg};">${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

export function signatureBlock(lines: string[]) {
  const cols = lines.map(line => `
    <div style="text-align:center;page-break-inside:avoid;">
      <div style="border-top:1px solid #0f172a;padding-top:4px;margin-top:24px;font-size:8px;font-weight:700;color:#0f172a;">${escapeHtml(line)}</div>
    </div>`).join('');
  return `<div style="display:grid;grid-template-columns:repeat(${Math.min(lines.length, 3)},1fr);gap:16px;margin-top:24px;">${cols}</div>`;
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
    window.alert('Não foi possível gerar o PDF.');
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

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#039;' }[char] ?? char));
}

function escapeAttr(value: string) {
  return value.replace(/"/g, '"').replace(/'/g, '&#039;');
}