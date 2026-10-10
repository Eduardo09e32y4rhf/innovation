import { fmt, PDF, PdfReport, type PdfBrand, type PdfTone } from '../../common/pdf/pdf-report';

export interface TimeSheetTrack {
  date: Date;
  entry?: Date | null;
  lunchStart?: Date | null;
  lunchReturn?: Date | null;
  exit?: Date | null;
  totalWorked?: number | null;
  dailyBalance?: number | null;
  incidentType?: string | null;
  lateMinutes?: number | null;
  earlyLeaveMinutes?: number | null;
}

export interface TimeSheetData {
  id: string;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  company: { name?: string | null; document?: string | null; logoUrl?: string | null } | null;
  employee: { name: string; cpf?: string | null; registration?: string | null; position?: string | null; department?: string | null };
  tracks: TimeSheetTrack[];
  normalHours?: number | null;
  overtime50?: number | null;
  overtime100?: number | null;
  nightShift?: number | null;
  absenceMinutes?: number | null;
  lateMinutes?: number | null;
  earlyLeaveMinutes?: number | null;
  payableWorkdays?: number | null;
  salaryBase?: unknown;
  hourlyRate?: unknown;
  monthlyDivisor?: number | null;
  overtime50Value?: unknown;
  overtime100Value?: unknown;
  nightShiftValue?: unknown;
  dsrValue?: unknown;
  absenceDiscount?: unknown;
  grossPay?: unknown;
  inssDiscount?: unknown;
  irrfDiscount?: unknown;
  fgtsAmount?: unknown;
  netPay?: unknown;
}

const TZ = 'America/Sao_Paulo';

const num = (value: unknown) => { const n = Number(value ?? 0); return Number.isFinite(n) ? n : 0; };
const decimal = (value: unknown) => num(value).toFixed(2).replace('.', ',');
const STATUS_LABEL: Record<string, string> = { DRAFT: 'Rascunho', IN_REVIEW: 'Em revisão', APPROVED: 'Aprovado', CLOSED: 'Fechado' };
export const brl = (value: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num(value));
const dayMonth = (d: Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(d);
const fullDate = (d: Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(d);
const weekday = (d: Date) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', '');
const clock = (d?: Date | null) => (d ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(d) : '--:--');

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '--';
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? '-' : ''}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

export function formatCpf(cpf?: string | null): string {
  const digits = String(cpf ?? '').replace(/\D/g, '');
  return digits.length === 11 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}` : 'Não informado';
}

const INCIDENT_LABEL: Record<string, string> = {
  normal: 'Normal',
  atraso: 'Atraso',
  saida_antecipada: 'Saída antecipada',
  atraso_saida_antecipada: 'Atraso e saída antecip.',
  falta: 'Falta',
  debito_jornada: 'Débito de jornada',
  hora_extra_50: 'Hora extra 50%',
  hora_extra_100: 'Hora extra 100%',
};
export const incidentLabel = (type?: string | null) => (type ? INCIDENT_LABEL[type] ?? type.replace(/_/g, ' ') : 'Normal');

interface Line { code: string; description: string; reference: string; earning?: number; deduction?: number }

/** Linhas do demonstrativo (proventos e descontos), como num holerite. So entram as que tem valor. */
export function payslipLines(data: TimeSheetData): Line[] {
  const lines: Line[] = [
    { code: '001', description: 'Salário base', reference: data.payableWorkdays != null ? `${data.payableWorkdays} dias` : '', earning: num(data.salaryBase) },
    { code: '010', description: 'Hora extra 50%', reference: `${decimal(data.overtime50)} h`, earning: num(data.overtime50Value) },
    { code: '011', description: 'Hora extra 100%', reference: `${decimal(data.overtime100)} h`, earning: num(data.overtime100Value) },
    { code: '020', description: 'Adicional noturno', reference: `${decimal(data.nightShift)} h`, earning: num(data.nightShiftValue) },
    { code: '030', description: 'Reflexo em DSR', reference: '', earning: num(data.dsrValue) },
    { code: '101', description: 'Faltas e atrasos', reference: `${num(data.absenceMinutes) + num(data.lateMinutes) + num(data.earlyLeaveMinutes)} min`, deduction: num(data.absenceDiscount) },
    { code: '110', description: 'INSS', reference: '', deduction: num(data.inssDiscount) },
    { code: '111', description: 'IRRF', reference: '', deduction: num(data.irrfDiscount) },
  ];
  return lines.filter((line, index) => index === 0 || (line.earning ?? 0) > 0 || (line.deduction ?? 0) > 0);
}


const TONE_OF_STATUS: Record<string, PdfTone> = { DRAFT: 'neutral', IN_REVIEW: 'warn', APPROVED: 'info', CLOSED: 'ok' };

const periodOf = (data: TimeSheetData) => `${fullDate(data.periodStart)} a ${fullDate(data.periodEnd)}`;

/** Escreve o holerite e o espelho de ponto de um colaborador no relatório (a partir da página atual). */
export function appendTimeSheet(report: PdfReport, data: TimeSheetData) {
  appendPayslip(report, data);
  report.newPage();
  appendMirror(report, data, { identity: false });
}

/** Demonstrativo de pagamento (proventos, descontos e líquido). */
export function appendPayslip(report: PdfReport, data: TimeSheetData) {
  const period = periodOf(data);
  report.parties(
    { title: 'EMPREGADOR', name: data.company?.name || 'Empresa', lines: [`CNPJ: ${fmt.document(data.company?.document) || 'Não informado'}`] },
    { title: 'COLABORADOR', name: data.employee.name, lines: [`CPF: ${formatCpf(data.employee.cpf)} · Matrícula: ${data.employee.registration || 'N/A'}`, `${data.employee.position || 'Cargo N/A'} · ${data.employee.department || 'Depto N/A'}`] },
  );
  report.section('Demonstrativo de pagamento', `Competência ${period}`);
  const lines = payslipLines(data);
  const totalEarnings = lines.reduce((sum, line) => sum + (line.earning ?? 0), 0);
  const totalDeductions = lines.reduce((sum, line) => sum + (line.deduction ?? 0), 0);
  report.table(
    [{ label: 'Cód.', width: 45 }, { label: 'Descrição', width: 200 }, { label: 'Referência', width: 90 }, { label: 'Proventos', width: 90, align: 'right' }, { label: 'Descontos', width: 90, align: 'right' }],
    lines.map((line) => [
      { text: line.code, color: PDF.color.mut }, line.description, { text: line.reference, color: PDF.color.mut },
      { text: line.earning ? brl(line.earning) : '', color: PDF.color.ok }, { text: line.deduction ? brl(line.deduction) : '', color: PDF.color.bad },
    ]),
    { totals: ['', 'Totais', '', { text: brl(totalEarnings), color: PDF.color.ok }, { text: brl(totalDeductions), color: PDF.color.bad }] },
  );
  report.total('Líquido a receber (estimado)', brl(data.netPay));
  report.stats([
    ['Base de cálculo', brl(data.grossPay)], ['Valor da hora', `${brl(data.hourlyRate)} (÷${data.monthlyDivisor ?? 220})`],
    ['FGTS do mês (patronal)', brl(data.fgtsAmount)], ['Horas normais', `${decimal(data.normalHours)} h`],
  ]);
  report.paragraph('Valores calculados a partir do espelho de ponto, conforme as regras de cálculo vigentes. Sujeito à conferência da contabilidade; a folha oficial segue o eSocial.', { size: 8, color: PDF.color.mut });

}

/** Espelho de ponto do colaborador, sem valores de salário: serve também para a folha da equipe. */
export function appendMirror(report: PdfReport, data: TimeSheetData, options: { identity?: boolean; compact?: boolean } = {}) {
  const period = periodOf(data);
  report.section('Espelho de ponto', `Competência ${period}`);
  if (options.identity !== false) report.fields([
    ['Colaborador', data.employee.name], ['Matrícula', data.employee.registration || 'N/A'],
    ['CPF', formatCpf(data.employee.cpf)], ['Cargo / departamento', [data.employee.position, data.employee.department].filter(Boolean).join(' · ') || 'N/A'],
  ]);
  report.table(
    [
      { label: 'Data', width: 48 }, { label: 'Dia', width: 40 }, { label: 'Entrada', width: 55 }, { label: 'Saída int.', width: 58 }, { label: 'Volta int.', width: 58 },
      { label: 'Saída', width: 55 }, { label: 'Trabalh.', width: 56 }, { label: 'Saldo', width: 55 }, { label: 'Ocorrência', width: 90 },
    ],
    data.tracks.map((track) => {
      const balance = track.dailyBalance ?? 0;
      return [
        dayMonth(track.date), { text: weekday(track.date), color: PDF.color.mut }, clock(track.entry), clock(track.lunchStart), clock(track.lunchReturn), clock(track.exit),
        formatMinutes(track.totalWorked), { text: formatMinutes(balance), bold: balance !== 0, color: balance < 0 ? PDF.color.bad : balance > 0 ? PDF.color.ok : PDF.color.mut },
        { text: incidentLabel(track.incidentType), color: PDF.color.mut },
      ];
    }),
    { fontSize: 8, emptyText: 'Nenhum registro de ponto no período.' },
  );
  const totals: Array<[string, string]> = [
    ['Horas extras 50%', `${decimal(data.overtime50)} h`], ['Horas extras 100%', `${decimal(data.overtime100)} h`], ['Adicional noturno', `${decimal(data.nightShift)} h`], ['Dias previstos', String(data.payableWorkdays ?? 0)],
    ['Faltas', `${num(data.absenceMinutes)} min`], ['Atrasos', `${num(data.lateMinutes)} min`], ['Saídas antecipadas', `${num(data.earlyLeaveMinutes)} min`],
  ];
  if (options.compact) {
    // Uma linha só, para o espelho de cada colaborador caber em uma página na folha da equipe.
    report.paragraph(`Totais do período · ${totals.map(([label, value]) => `${label}: ${value}`).join(' · ')}`, { size: 8, color: PDF.color.ink, gap: 4 });
  } else {
    report.section('Totais do período');
    report.fields(totals);
  }
  report.signatures([{ label: 'Assinatura do colaborador', sub: data.employee.name }, { label: 'Responsável RH / gestor', sub: 'Data: ____/____/________' }]);
}

export function timeSheetBrand(company: TimeSheetData['company']): PdfBrand {
  return { name: company?.name || 'Empresa', document: company?.document, logoUrl: company?.logoUrl };
}

/** Contracheque do colaborador: só o demonstrativo de pagamento, sem o espelho de ponto. */
export async function buildPayslipPdf(data: TimeSheetData, generatedAt = new Date()): Promise<Buffer> {
  const report = await PdfReport.create({
    title: 'Contracheque', subtitle: `Competência ${fullDate(data.periodStart)} a ${fullDate(data.periodEnd)}`, brand: timeSheetBrand(data.company),
    footerId: `Fechamento ${data.id}`, generatedAt, author: data.company?.name ?? undefined,
  });
  appendPayslip(report, data);
  report.signatures([{ label: 'Assinatura do colaborador', sub: data.employee.name }, { label: 'Empregador / RH' }]);
  return report.finish();
}

export async function buildTimeSheetPdf(data: TimeSheetData, generatedAt = new Date()): Promise<Buffer> {
  const report = await PdfReport.create({
    title: 'Folha de ponto', subtitle: `Competência ${fullDate(data.periodStart)} a ${fullDate(data.periodEnd)}`, brand: timeSheetBrand(data.company),
    chip: { label: STATUS_LABEL[data.status] ?? data.status, tone: TONE_OF_STATUS[data.status] ?? 'neutral' },
    footerId: `Fechamento ${data.id}`, generatedAt, author: data.company?.name ?? undefined,
  });
  appendTimeSheet(report, data);
  return report.finish();
}