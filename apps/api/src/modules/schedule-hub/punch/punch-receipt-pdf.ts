import { fmt, PDF, PdfReport } from '../../../common/pdf/pdf-report';

export interface PunchReceiptData {
  company: { name: string; document?: string | null; logoUrl?: string | null };
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

export async function buildPunchReceiptPdf(data: PunchReceiptData): Promise<Buffer> {
  const { event } = data;
  const report = await PdfReport.create({
    title: 'Comprovante de ponto', number: `Código ${event.receipt}`, brand: { name: data.company.name, document: data.company.document, logoUrl: data.company.logoUrl },
    footerNote: 'Registro da marcação feita no sistema, na data e hora indicadas. O código de autenticação permite conferir o registro junto à empresa.', footerId: `Comprovante ${event.receipt}`, generatedAt: data.issuedAt,
  });
  const { doc } = report;

  // Destaque: tipo e horário da batida
  report.ensure(90);
  doc.roundedRect(PDF.L, report.y, PDF.W, 78, 10).lineWidth(0.8).fillAndStroke(PDF.color.brandSoft, PDF.color.line);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(PDF.color.brand).text(event.typeLabel.toUpperCase(), PDF.L + 20, report.y + 16, { lineBreak: false, characterSpacing: 1 });
  doc.font('Helvetica-Bold').fontSize(30).fillColor(PDF.color.ink).text(fmtTime(event.occurredAt), PDF.L + 20, report.y + 32, { lineBreak: false });
  doc.font('Helvetica').fontSize(13).fillColor(PDF.color.gray).text(fmtDate(event.occurredAt), PDF.L + PDF.W - 200, report.y + 40, { width: 180, align: 'right', lineBreak: false });
  report.y += 98;

  report.section('Colaborador');
  report.fields([
    ['Nome', data.employee.name], ['Matrícula', data.employee.registration || '—'], ['CPF', maskCpf(data.employee.cpf)], ['Cargo', data.employee.position || '—'],
  ]);

  const place = event.address || (event.latitude != null && event.longitude != null ? `${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}` : 'Local não informado');
  const fence = event.withinFence == null ? '—' : event.withinFence ? 'Dentro da área permitida' : `Fora da área permitida${event.distanceMeters != null ? ` (${event.distanceMeters} m)` : ''}`;
  report.section('Local e dispositivo');
  report.fields([['Local', place], ['Área permitida', fence]], 2);
  report.fields([
    ['Coordenadas', event.latitude != null && event.longitude != null ? `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}` : '—'],
    ['Endereço IP', event.ipAddress || '—'], ['Dispositivo', describeDevice(event.userAgent)], ['Origem', event.origin],
  ], 2);

  report.section('Autenticação');
  report.fields([['Código', event.receipt], ['Emitido em', `${fmtDate(data.issuedAt)} ${fmtTime(data.issuedAt)}`]], 2);
  return report.finish();
}