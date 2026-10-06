import PDFDocument from 'pdfkit';

export interface PunchReceiptData {
  company: { name: string; document?: string | null };
  employee: { name: string; registration?: string | null; cpf?: string | null; position?: string | null };
  event: {
    receipt: string;
    typeLabel: string;
    occurredAt: Date;
    origin: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    withinFence?: boolean | null;
    distanceMeters?: number | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  issuedAt: Date;
}

const TZ = 'America/Sao_Paulo';
const fmtDate = (d: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
const fmtTime = (d: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d);

/** CPF mascarado: o comprovante pode circular, entao mostra so os digitos centrais. */
export function maskCpf(cpf?: string | null): string {
  const digits = String(cpf ?? '').replace(/\D/g, '');
  return digits.length === 11 ? `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**` : '—';
}

export function describeDevice(userAgent?: string | null): string {
  const ua = String(userAgent ?? '');
  if (!ua) return '—';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Dispositivo';
  const browser = /Edg\//i.test(ua) ? 'Edge' : /Chrome\//i.test(ua) ? 'Chrome' : /Firefox\//i.test(ua) ? 'Firefox' : /Safari\//i.test(ua) ? 'Safari' : 'Navegador';
  return `${browser} em ${os}`;
}

export function buildPunchReceiptPdf(data: PunchReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Comprovante de ponto ${data.event.receipt}`, Author: data.company.name } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const ink = '#111827';
    const muted = '#6b7280';
    const line = '#e5e7eb';

    // Cabecalho
    doc.rect(0, 0, doc.page.width, 92).fill('#0f172a');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text('COMPROVANTE DE REGISTRO DE PONTO', left, 30, { width });
    doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1').text(data.company.name + (data.company.document ? `  ·  ${data.company.document}` : ''), left, 56, { width });

    // Destaque: tipo e horario
    let y = 118;
    doc.roundedRect(left, y, width, 74, 8).fillAndStroke('#f8fafc', line);
    doc.fillColor(muted).font('Helvetica').fontSize(9).text(data.event.typeLabel.toUpperCase(), left + 18, y + 14);
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(26).text(fmtTime(data.event.occurredAt), left + 18, y + 28);
    doc.fillColor(ink).font('Helvetica').fontSize(12).text(fmtDate(data.event.occurredAt), left + width - 168, y + 36, { width: 150, align: 'right' });

    const section = (title: string, rows: [string, string][]) => {
      y += 94;
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(9).text(title.toUpperCase(), left, y);
      y += 16;
      doc.moveTo(left, y).lineTo(left + width, y).strokeColor(line).stroke();
      for (const [label, value] of rows) {
        y += 8;
        doc.fillColor(muted).font('Helvetica').fontSize(9).text(label, left, y, { width: 130 });
        const h = doc.heightOfString(value, { width: width - 140 });
        doc.fillColor(ink).font('Helvetica').fontSize(10.5).text(value, left + 140, y - 1, { width: width - 140 });
        y += Math.max(14, h) + 4;
        doc.moveTo(left, y).lineTo(left + width, y).strokeColor(line).stroke();
      }
      y -= 94;
    };

    section('Colaborador', [
      ['Nome', data.employee.name],
      ['Matrícula', data.employee.registration || '—'],
      ['CPF', maskCpf(data.employee.cpf)],
      ['Cargo', data.employee.position || '—'],
    ]);
    y += 4;
    const place = data.event.address
      || (data.event.latitude != null && data.event.longitude != null ? `${data.event.latitude.toFixed(5)}, ${data.event.longitude.toFixed(5)}` : 'Local não informado');
    const fence = data.event.withinFence == null ? '—' : data.event.withinFence ? 'Dentro da área permitida' : `Fora da área permitida${data.event.distanceMeters != null ? ` (${data.event.distanceMeters} m)` : ''}`;
    section('Local e dispositivo', [
      ['Local', place],
      ['Coordenadas', data.event.latitude != null && data.event.longitude != null ? `${data.event.latitude.toFixed(6)}, ${data.event.longitude.toFixed(6)}` : '—'],
      ['Área permitida', fence],
      ['Endereço IP', data.event.ipAddress || '—'],
      ['Dispositivo', describeDevice(data.event.userAgent)],
      ['Origem', data.event.origin],
    ]);
    y += 4;
    section('Autenticação', [
      ['Código', data.event.receipt],
      ['Emitido em', `${fmtDate(data.issuedAt)} ${fmtTime(data.issuedAt)}`],
    ]);

    doc.fillColor(muted).font('Helvetica').fontSize(8).text(
      'Este comprovante registra a marcação efetuada no sistema na data e hora indicadas. O código de autenticação identifica o registro de forma única e permite conferência junto à empresa.',
      left, doc.page.height - 78, { width, align: 'left' },
    );
    doc.end();
  });
}
