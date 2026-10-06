import PDFDocument from 'pdfkit';

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
  company: { name?: string | null; document?: string | null } | null;
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
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const BRAND = '#0f766e';
const BAND = '#f1f5f9';

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

export function buildTimeSheetPdf(data: TimeSheetData, generatedAt = new Date()): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true, info: { Title: `Folha de ponto - ${data.employee.name}`, Author: data.company?.name ?? 'Innovation RH' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 40;
    const W = 515;
    const R = L + W;

    // ── Faixa de titulo ─────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 78).fill(INK);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text('DEMONSTRATIVO DE PAGAMENTO', L, 22, { width: W });
    doc.font('Helvetica').fontSize(9).fillColor('#cbd5e1').text(`Folha de ponto · competência ${fullDate(data.periodStart)} a ${fullDate(data.periodEnd)}`, L, 46, { width: W });
    doc.fontSize(8).text(`Status: ${STATUS_LABEL[data.status] ?? data.status}`, L, 46, { width: W, align: 'right' });

    // ── Empregador e colaborador ───────────────────────────────────────────
    let y = 94;
    const box = (x: number, width: number, title: string, rows: string[]) => {
      doc.roundedRect(x, y, width, 64, 5).strokeColor(LINE).stroke();
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text(title, x + 10, y + 8);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(rows[0], x + 10, y + 21, { width: width - 20, ellipsis: true, lineBreak: false });
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
      rows.slice(1).forEach((row, index) => doc.text(row, x + 10, y + 36 + index * 11, { width: width - 20, ellipsis: true, lineBreak: false }));
    };
    box(L, 250, 'EMPREGADOR', [data.company?.name || 'Empresa', `CNPJ: ${data.company?.document || 'Não informado'}`]);
    box(L + 265, 250, 'COLABORADOR', [data.employee.name, `CPF: ${formatCpf(data.employee.cpf)}  ·  Matrícula: ${data.employee.registration || 'N/A'}`, `${data.employee.position || 'Cargo N/A'}  ·  ${data.employee.department || 'Depto N/A'}`]);
    y += 80;

    // ── Demonstrativo (proventos e descontos) ──────────────────────────────
    const cols = { code: L + 8, desc: L + 52, ref: L + 270, earn: L + 340, ded: L + 430 };
    doc.rect(L, y, W, 20).fill(BRAND);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    doc.text('CÓD.', cols.code, y + 6); doc.text('DESCRIÇÃO', cols.desc, y + 6); doc.text('REFERÊNCIA', cols.ref, y + 6);
    doc.text('PROVENTOS', cols.earn, y + 6, { width: 75, align: 'right' }); doc.text('DESCONTOS', cols.ded, y + 6, { width: 77, align: 'right' });
    y += 20;
    const lines = payslipLines(data);
    lines.forEach((line, index) => {
      if (index % 2 === 0) doc.rect(L, y, W, 18).fill('#f8fafc');
      doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(line.code, cols.code, y + 5);
      doc.fillColor(INK).text(line.description, cols.desc, y + 5, { width: 210 });
      doc.fillColor(MUTED).text(line.reference, cols.ref, y + 5, { width: 65 });
      if (line.earning) doc.fillColor('#166534').text(brl(line.earning), cols.earn, y + 5, { width: 75, align: 'right' });
      if (line.deduction) doc.fillColor('#b91c1c').text(brl(line.deduction), cols.ded, y + 5, { width: 77, align: 'right' });
      y += 18;
    });
    const totalEarnings = lines.reduce((sum, line) => sum + (line.earning ?? 0), 0);
    const totalDeductions = lines.reduce((sum, line) => sum + (line.deduction ?? 0), 0);
    doc.moveTo(L, y).lineTo(R, y).strokeColor(LINE).stroke();
    y += 6;
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text('TOTAIS', cols.desc, y + 3);
    doc.fillColor('#166534').text(brl(totalEarnings), cols.earn, y + 3, { width: 75, align: 'right' });
    doc.fillColor('#b91c1c').text(brl(totalDeductions), cols.ded, y + 3, { width: 77, align: 'right' });
    y += 22;

    // ── Liquido ─────────────────────────────────────────────────────────────
    doc.roundedRect(L, y, W, 38, 6).fill(INK);
    doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8).text('LÍQUIDO A RECEBER (ESTIMADO)', L + 16, y + 8);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text(brl(data.netPay), L + 16, y + 17, { width: W - 32, align: 'right' });
    y += 54;

    // ── Bases e informativos ───────────────────────────────────────────────
    const stats: [string, string][] = [
      ['Base de cálculo', brl(data.grossPay)],
      ['Valor da hora', `${brl(data.hourlyRate)} (÷${data.monthlyDivisor ?? 220})`],
      ['FGTS do mês (patronal)', brl(data.fgtsAmount)],
      ['Horas normais', `${decimal(data.normalHours)} h`],
    ];
    const cell = W / stats.length;
    stats.forEach(([label, value], index) => {
      const x = L + index * cell;
      doc.roundedRect(x + 2, y, cell - 4, 40, 5).fillAndStroke(BAND, LINE);
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(label, x + 10, y + 8, { width: cell - 20 });
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5).text(value, x + 10, y + 21, { width: cell - 20 });
    });
    y += 56;

    doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text('Valores calculados a partir do espelho de ponto abaixo, conforme as regras de cálculo vigentes. Sujeito à conferência da contabilidade; a folha oficial segue o eSocial.', L, y, { width: W });

    // ── Espelho de ponto ────────────────────────────────────────────────────
    doc.addPage();
    y = 40;
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(11).text('ESPELHO DE PONTO', L, y);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`${data.employee.name} · ${fullDate(data.periodStart)} a ${fullDate(data.periodEnd)}`, L, y + 3, { width: W, align: 'right' });
    y += 22;
    const c = { date: L + 6, wd: L + 46, in: L + 80, ls: L + 128, lr: L + 176, out: L + 224, work: L + 272, bal: L + 320, occ: L + 372 };
    const rowH = 15;
    const header = () => {
      doc.rect(L, y, W, rowH + 2).fill(BAND);
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5);
      doc.text('Data', c.date, y + 5); doc.text('Dia', c.wd, y + 5); doc.text('Entrada', c.in, y + 5); doc.text('Saída int.', c.ls, y + 5);
      doc.text('Volta int.', c.lr, y + 5); doc.text('Saída', c.out, y + 5); doc.text('Trabalh.', c.work, y + 5); doc.text('Saldo', c.bal, y + 5); doc.text('Ocorrência', c.occ, y + 5);
      y += rowH + 2;
    };
    header();
    data.tracks.forEach((track, index) => {
      if (y > 760) { doc.addPage(); y = 40; header(); }
      if (index % 2 === 1) doc.rect(L, y, W, rowH).fill('#f8fafc');
      const balance = track.dailyBalance ?? 0;
      doc.font('Helvetica').fontSize(8).fillColor(INK);
      doc.text(dayMonth(track.date), c.date, y + 4); doc.fillColor(MUTED).text(weekday(track.date), c.wd, y + 4);
      doc.fillColor(INK).text(clock(track.entry), c.in, y + 4); doc.text(clock(track.lunchStart), c.ls, y + 4);
      doc.text(clock(track.lunchReturn), c.lr, y + 4); doc.text(clock(track.exit), c.out, y + 4);
      doc.text(formatMinutes(track.totalWorked), c.work, y + 4);
      doc.fillColor(balance < 0 ? '#b91c1c' : balance > 0 ? '#166534' : MUTED).text(formatMinutes(balance), c.bal, y + 4);
      doc.fillColor(MUTED).text(incidentLabel(track.incidentType), c.occ, y + 4, { width: 140, ellipsis: true, lineBreak: false });
      y += rowH;
    });
    doc.moveTo(L, y + 2).lineTo(R, y + 2).strokeColor(LINE).stroke();
    y += 12;

    if (y > 640) { doc.addPage(); y = 40; }
    const totals: [string, string][] = [
      ['Horas extras 50%', `${decimal(data.overtime50)} h`], ['Faltas', `${num(data.absenceMinutes)} min`],
      ['Horas extras 100%', `${decimal(data.overtime100)} h`], ['Atrasos', `${num(data.lateMinutes)} min`],
      ['Adicional noturno', `${decimal(data.nightShift)} h`], ['Saídas antecipadas', `${num(data.earlyLeaveMinutes)} min`],
    ];
    totals.forEach(([label, value], index) => {
      const x = L + (index % 2) * 262;
      const rowY = y + Math.floor(index / 2) * 16;
      doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(label, x, rowY, { width: 130 });
      doc.fillColor(INK).font('Helvetica-Bold').text(value, x + 130, rowY, { width: 110 });
    });
    y += 66;

    // ── Assinaturas ─────────────────────────────────────────────────────────
    if (y > 700) { doc.addPage(); y = 60; }
    y += 24;
    [[60, 'Assinatura do colaborador', data.employee.name], [330, 'Responsável RH / gestor', 'Data: ____/____/________']].forEach(([x, label, sub]) => {
      doc.moveTo(x as number, y).lineTo((x as number) + 180, y).strokeColor('#334155').stroke();
      doc.fillColor('#475569').font('Helvetica').fontSize(8).text(label as string, x as number, y + 4, { width: 180, align: 'center' }).text(sub as string, x as number, y + 15, { width: 180, align: 'center' });
    });

    // ── Rodape com numeracao ────────────────────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // rodape abaixo da margem: sem isso o pdfkit abre uma pagina em branco por rodape
      doc.moveTo(L, 804).lineTo(R, 804).strokeColor(LINE).stroke();
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(7).text(
        `Gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ }).format(generatedAt)} · ID ${data.id} · Página ${i + 1} de ${pages.count}`,
        L, 809, { width: W, align: 'center', lineBreak: false },
      );
    }
    doc.end();
  });
}
