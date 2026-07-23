import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TimeClosingStatus } from '@prisma/client';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { saoPauloDayOfWeek, toSaoPauloDateKey } from '../../common/utils/date.utils';

interface GenerateClosingDto {
  employeeIds?: string[];
  periodStart?: string;
  periodEnd?: string;
  month?: number;
  year?: number;
  referenceMonth?: number;
  referenceYear?: number;
  overtimeHandling?: 'PAYMENT' | 'BANK';
}

@Injectable()
export class TimeClosingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payroll: PayrollCalculationService,
  ) {}

  async generate(companyId: string, actor: JwtUser, dto: GenerateClosingDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { payrollStartDay: true } });
    const { periodStart, periodEnd } = this.resolvePeriod(dto, company?.payrollStartDay ?? 1);
    const overtimeHandling = dto.overtimeHandling === 'BANK' ? 'BANK' : dto.overtimeHandling === 'PAYMENT' ? 'PAYMENT' : undefined;
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        ...(dto.employeeIds?.length ? { id: { in: dto.employeeIds } } : {}),
      },
      include: { workScheduleRule: true, userSchedules: { include: { schedule: true }, orderBy: { startDate: 'desc' } } },
      orderBy: { name: 'asc' },
    });
    if (!employees.length) throw new BadRequestException('Nenhum funcionario ativo encontrado para o fechamento.');
    const withoutSalary = employees.filter((employee) => Number(employee.salary || 0) <= 0);
    if (withoutSalary.length) {
      throw new BadRequestException(`Preencha o salario na ficha antes de fechar: ${withoutSalary.map((item) => item.name).join(', ')}`);
    }

    const existingLocked = await this.prisma.timeClosing.findFirst({
      where: {
        companyId,
        employeeId: { in: employees.map((employee) => employee.id) },
        periodStart,
        periodEnd,
        status: { not: TimeClosingStatus.DRAFT },
      },
    });
    if (existingLocked) throw new BadRequestException('O periodo possui fechamento em revisao, aprovado ou fechado. Reabra-o antes de gerar novamente.');

    const overtimeRule = await this.prisma.overtimeRule.upsert({
      where: { companyId },
      create: { companyId },
      update: {},
    });
    const holidays = await this.prisma.holiday.findMany({
      where: { OR: [{ companyId }, { companyId: null }], date: { gte: periodStart, lte: periodEnd } },
    });
    const holidayKeys = new Set(holidays.map((holiday) => this.dateKey(holiday.date)));
    const results = [];

    for (const employee of employees) {
      const [tracks, occurrences, schedules] = await Promise.all([
        this.prisma.timeTrack.findMany({
          where: { companyId, employeeId: employee.id, date: { gte: periodStart, lte: periodEnd } },
          orderBy: { date: 'asc' },
        }),
        this.prisma.timeOccurrence.findMany({
          where: { companyId, employeeId: employee.id, date: { gte: periodStart, lte: periodEnd }, status: 'APPROVED' },
        }),
        this.prisma.userSchedule.findMany({
          where: {
            companyId,
            employeeId: employee.id,
            startDate: { lte: periodEnd },
            OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
          },
          include: { schedule: true },
          orderBy: { startDate: 'desc' },
        }),
      ]);

      const trackByDate = new Map(tracks.map((track) => [this.dateKey(track.date), track]));
      const justifiedDates = new Set(occurrences
        .filter((item) => this.isJustifyingOccurrence(item.type))
        .map((item) => this.dateKey(item.date)));
      let payableWorkdays = 0;
      let paidRestDays = 0;
      let missingAbsenceMinutes = 0;
      let missingAbsenceDays = 0;
      let scheduledMinutesInPeriod = 0;

      const today = new Date();
      const todayKey = this.dateKey(today);

      for (const date of this.eachDate(periodStart, periodEnd)) {
        const key = this.dateKey(date);
        const schedule = schedules.find((item) => item.startDate <= date && (!item.endDate || item.endDate >= date));
        const restDays = schedule?.schedule.restDays ?? employee.workScheduleRule?.restDaysOfWeek ?? [0, 6];
        const dayOfWeek = saoPauloDayOfWeek(date);
        const isRest = restDays.includes(dayOfWeek) || holidayKeys.has(key) || this.isOffCycle12x36(date, schedule?.schedule);
        
        let expectedForDay = this.expectedMinutes(employee, schedule?.schedule);
        if (holidayKeys.has(key) || this.isOffCycle12x36(date, schedule?.schedule)) {
          expectedForDay = 0;
        } else if (restDays.includes(dayOfWeek)) {
          expectedForDay = 0;
        }
        
        scheduledMinutesInPeriod += expectedForDay;

        const mainDsrDay = restDays.includes(0) ? 0 : (restDays[0] ?? 0);
        if (dayOfWeek === mainDsrDay || holidayKeys.has(key)) paidRestDays++;
        
        if (!isRest) {
          payableWorkdays++;
          // Only count absences for past or present days
          if (date <= today && !trackByDate.has(key) && !justifiedDates.has(key)) {
            missingAbsenceMinutes += expectedForDay;
            missingAbsenceDays++;
          }
        }
      }

      let normalMinutes = 0;
      let overtime50Minutes = 0;
      let overtime100Minutes = 0;
      let nightShiftMinutes = 0;
      let absenceMinutes = missingAbsenceMinutes;
      let lateMinutes = 0;
      let earlyLeaveMinutes = 0;
      let absenceDays = missingAbsenceDays;
      let lateArrivalDays = 0;
      let fallbackPunches = 0;

      for (const track of tracks) {
        const totalOvertime = (track.overtime50Minutes || 0) + (track.overtime100Minutes || 0);
        normalMinutes += Math.max(0, (track.totalWorked || 0) - totalOvertime);
        const approved = track.overtimeApprovalStatus === 'APPROVED';
        const paymentRatio = this.paymentRatio(track, overtimeHandling, approved);
        overtime50Minutes += Math.round((track.overtime50Minutes || 0) * paymentRatio);
        overtime100Minutes += Math.round((track.overtime100Minutes || 0) * paymentRatio);
        nightShiftMinutes += track.nightShiftMinutes || 0;
        absenceMinutes += Math.max(0, track.absenceMinutes || (track.dailyBalance && track.dailyBalance < 0 ? Math.abs(track.dailyBalance) : 0));
        lateMinutes += track.lateMinutes || 0;
        earlyLeaveMinutes += track.earlyLeaveMinutes || 0;
        if (track.incidentType === 'falta') absenceDays++;
        if ((track.lateMinutes || 0) > 0) lateArrivalDays++;
        if (track.clockedInWithoutFacial) fallbackPunches++;
      }

      const weeklyMinutes = this.weeklyMinutesFromSchedule(schedules[0]?.schedule)
        ?? employee.workScheduleRule?.weeklyMinutes
        ?? this.defaultWeeklyMinutes(employee.dailyWorkload, employee.workScale);
      
      const totalDaysInPeriod = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
      const isPartialMonth = totalDaysInPeriod < 28 || totalDaysInPeriod > 31;

      const dependents = Array.isArray(employee.dependents) ? employee.dependents.length : 0;
      const financial = this.payroll.calculate({
        salary: Number(employee.salary),
        weeklyMinutes,
        isPartialMonth,
        scheduledMinutesInPeriod,
        overtime50Minutes,
        overtime100Minutes,
        nightShiftMinutes,
        absenceMinutes,
        payableWorkdays,
        paidRestDays,
        dependents,
        overtime50Factor: Number(overtimeRule.weekdayRate),
        overtime100Factor: Number(overtimeRule.sundayHolidayRate),
        nightShiftPercent: (Number(overtimeRule.nightShiftRate) - 1) * 100,
        dsrEnabled: overtimeRule.dsrEnabled,
      });

      await this.prisma.timeClosing.deleteMany({
        where: { companyId, employeeId: employee.id, periodStart, periodEnd, status: TimeClosingStatus.DRAFT },
      });
      results.push(await this.prisma.timeClosing.create({
        data: {
          companyId,
          employeeId: employee.id,
          periodStart,
          periodEnd,
          status: TimeClosingStatus.DRAFT,
          normalHours: this.hours(normalMinutes),
          overtime50: this.hours(overtime50Minutes),
          overtime100: this.hours(overtime100Minutes),
          nightShift: this.hours(nightShiftMinutes),
          absences: absenceDays,
          lateArrivals: lateArrivalDays,
          fallbackPunches,
          payableWorkdays,
          paidRestDays,
          absenceMinutes,
          lateMinutes,
          earlyLeaveMinutes,
          ...financial,
          totalPayable: financial.netPay,
        },
        include: { employee: true },
      }));
    }
    return results;
  }

  async list(companyId: string, status?: TimeClosingStatus) {
    return this.prisma.timeClosing.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      include: { employee: true },
      orderBy: [{ periodStart: 'desc' }, { employee: { name: 'asc' } }],
    });
  }

  async getById(companyId: string, id: string, actor?: JwtUser) {
    const closing = await this.prisma.timeClosing.findFirst({
      where: { id, companyId },
      include: {
        employee: true,
        company: true,
        adjustments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!closing) throw new NotFoundException('Fechamento nao encontrado.');

    if (actor && (actor.role === 'FUNCIONARIO' || actor.role === 'USER')) {
      const employee = await this.prisma.employee.findFirst({
        where: { companyId, userId: actor.sub },
        select: { id: true },
      });
      if (!employee || closing.employeeId !== employee.id) {
        throw new ForbiddenException('Acesso negado ao fechamento de outro colaborador.');
      }
    }

    const tracks = await this.prisma.timeTrack.findMany({
      where: { companyId, employeeId: closing.employeeId, date: { gte: closing.periodStart, lte: closing.periodEnd } },
      orderBy: { date: 'asc' },
    });
    return { ...closing, tracks };
  }

  async adjust(companyId: string, actor: JwtUser, id: string, dto: { field: string; newValue: string; reason: string }) {
    const allowed = ['salaryBase', 'overtime50', 'overtime100', 'nightShift', 'absenceMinutes', 'lateMinutes', 'earlyLeaveMinutes'];
    if (!allowed.includes(dto.field)) throw new BadRequestException('Campo nao permitido para ajuste.');
    if (!dto.reason?.trim()) throw new BadRequestException('Informe o motivo do ajuste.');
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId }, include: { employee: true } });
    if (!closing) throw new NotFoundException('Fechamento nao encontrado.');
    if (closing.status !== TimeClosingStatus.DRAFT && closing.status !== TimeClosingStatus.IN_REVIEW) {
      throw new BadRequestException('Somente fechamento em rascunho ou revisao pode ser ajustado.');
    }
    const value = Number(dto.newValue);
    if (!Number.isFinite(value) || value < 0) throw new BadRequestException('Informe um valor numerico nao negativo.');

    return this.prisma.$transaction(async (tx) => {
      await tx.timeClosingAdjustment.create({
        data: { timeClosingId: id, field: dto.field, oldValue: String((closing as unknown as Record<string, unknown>)[dto.field]), newValue: String(value), reason: dto.reason.trim(), changedBy: actor.sub },
      });
      const updated = { ...closing, [dto.field]: value };
      const financial = this.payroll.calculate({
        salary: Number(updated.salaryBase),
        weeklyMinutes: Number(updated.monthlyDivisor) * 12, // 220 divisor = 44h * 60m = 2640m
        isPartialMonth: false,
        scheduledMinutesInPeriod: 0,
        overtime50Minutes: Number(updated.overtime50) * 60,
        overtime100Minutes: Number(updated.overtime100) * 60,
        nightShiftMinutes: Number(updated.nightShift) * 60,
        absenceMinutes: Number(updated.absenceMinutes),
        payableWorkdays: Number(updated.payableWorkdays),
        paidRestDays: Number(updated.paidRestDays),
        dependents: Array.isArray(updated.employee.dependents) ? updated.employee.dependents.length : 0,
      });
      return tx.timeClosing.update({
        where: { id },
        data: { [dto.field]: value, ...financial, totalPayable: financial.netPay },
        include: { employee: true },
      });
    });
  }

  async submitReview(companyId: string, id: string) {
    return this.changeStatus(companyId, id, TimeClosingStatus.DRAFT, TimeClosingStatus.IN_REVIEW);
  }

  async approve(companyId: string, id: string) {
    return this.changeStatus(companyId, id, TimeClosingStatus.IN_REVIEW, TimeClosingStatus.APPROVED);
  }

  async close(companyId: string, actor: JwtUser, id: string) {
    const closing = await this.changeStatus(companyId, id, TimeClosingStatus.APPROVED, TimeClosingStatus.CLOSED, {
      closedAt: new Date(), closedBy: actor.sub,
    });
    return closing;
  }

  async reopen(companyId: string, actor: JwtUser, id: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Informe o motivo da reabertura.');
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing || closing.status !== TimeClosingStatus.CLOSED) throw new BadRequestException('Somente fechamento concluido pode ser reaberto.');
    return this.prisma.timeClosing.update({
      where: { id },
      data: { status: TimeClosingStatus.DRAFT, reopenedAt: new Date(), reopenedBy: actor.sub, reopenReason: reason.trim(), closedAt: null, closedBy: null },
    });
  }

  async delete(companyId: string, id: string) {
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing) throw new NotFoundException('Fechamento nao encontrado.');
    if (closing.status === TimeClosingStatus.CLOSED) throw new BadRequestException('Reabra o fechamento antes de excluir.');
    await this.prisma.timeClosing.delete({ where: { id } });
    return { success: true };
  }

  async getPdf(companyId: string, id: string, actor?: JwtUser) {
    await this.getById(companyId, id, actor);
    return { url: `/time-closing/${id}/pdf-stream` };
  }

  async streamPdf(companyId: string, id: string, res: any, actor?: JwtUser) {
    const closing = await this.getById(companyId, id, actor);
    
    // Fastify/Express compatibility
    const isFastify = typeof res.raw !== 'undefined';
    const stream = isFastify ? res.raw : res;
    
    if (isFastify) {
      stream.setHeader('Content-Type', 'application/pdf');
      stream.setHeader('Content-Disposition', `attachment; filename=Folha_Ponto_${this.safeFilename(closing.employee.name)}_${this.dateKey(closing.periodStart)}.pdf`);
    } else {
      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', `attachment; filename=Folha_Ponto_${this.safeFilename(closing.employee.name)}_${this.dateKey(closing.periodStart)}.pdf`);
    }

    import('pdfkit').then(PDFDocument => {
      const doc = new PDFDocument.default({ margin: 40, size: 'A4', bufferPages: true });
      doc.pipe(stream);

      const emp = closing.employee;
      const company = closing.company;
      const W = 515; // largura útil

      // ── CABEÇALHO ──────────────────────────────────────────────────────────────
      doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold')
        .text('RELATÓRIO DE FECHAMENTO DE PONTO', { align: 'center' });
      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text(`Memória de cálculo gerada pelo Innovation RH System — CLT 2026`, { align: 'center' });
      doc.moveDown(0.4);

      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.4);

      const leftX = 40;
      const rightX = 300;
      const yStart = doc.y;

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
        .text('EMPRESA:', leftX, yStart);
      doc.font('Helvetica').fillColor('#334155')
        .text(company?.name || 'Innovation RH', leftX, doc.y)
        .text(`CNPJ: ${company?.document || 'Não informado'}`, leftX, doc.y);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
        .text('FUNCIONÁRIO:', rightX, yStart);
      
      const formatCpf = (cpf?: string | null) => {
        if (!cpf || cpf.length !== 11) return cpf || 'Não informado';
        return `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9,11)}`;
      };
      
      doc.font('Helvetica').fillColor('#334155')
        .text(emp.name, rightX, doc.y)
        .text(`CPF: ${formatCpf(emp.cpf)}  |  Matrícula: ${emp.registration || 'N/A'}`, rightX, doc.y)
        .text(`Cargo: ${emp.position || 'N/A'}  |  Depto: ${emp.department || 'N/A'}`, rightX, doc.y);

      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.4);

      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text(`Período: ${this.formatDate(closing.periodStart)} a ${this.formatDate(closing.periodEnd)}   |   Status: ${closing.status}   |   Regra: ${closing.calculationVersion || 'CLT_2026_1'}   |   Dias úteis: ${closing.payableWorkdays ?? '-'}`, { align: 'left' });

      doc.moveDown(0.6);

      // ── TABELA DE REGISTROS DIÁRIOS ──────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f766e')
        .text('REGISTROS DE PONTO POR DIA');
      doc.moveDown(0.3);

      const cols = { data: 40, entrada: 105, almSai: 160, almRet: 215, saida: 268, trab: 322, bal: 375, ocorrencia: 430 };
      const rowH = 14;
      let tableY = doc.y;

      const drawTableHeader = () => {
        doc.rect(40, tableY, W, rowH).fill('#f1f5f9');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569');
        doc.text('Data', cols.data, tableY + 3, { width: 60 });
        doc.text('Entrada', cols.entrada, tableY + 3, { width: 50 });
        doc.text('Alm.Saí', cols.almSai, tableY + 3, { width: 50 });
        doc.text('Alm.Ret', cols.almRet, tableY + 3, { width: 50 });
        doc.text('Saída', cols.saida, tableY + 3, { width: 50 });
        doc.text('Trab.', cols.trab, tableY + 3, { width: 50 });
        doc.text('Saldo', cols.bal, tableY + 3, { width: 50 });
        doc.text('Ocorrência', cols.ocorrencia, tableY + 3, { width: 80 });
        tableY += rowH;
      };

      drawTableHeader();

      const fmt = (t: Date | null) => t ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(t) : '--:--';
      const fmtMin = (m: number | null) => {
        if (m === null || m === undefined) return '--';
        const h = Math.floor(Math.abs(m) / 60);
        const min = Math.abs(m) % 60;
        return `${m < 0 ? '-' : ''}${h}:${String(min).padStart(2, '0')}`;
      };
      const ptDate = (d: Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(d);

      let rowIndex = 0;
      for (const track of (closing.tracks || [])) {
        const rowY = tableY;
        if (rowIndex % 2 === 0) doc.rect(40, rowY, W, rowH).fill('#f8fafc');
        doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b');
        doc.text(ptDate(track.date), cols.data, rowY + 3, { width: 60 });
        doc.text(fmt(track.entry), cols.entrada, rowY + 3, { width: 50 });
        doc.text(fmt(track.lunchStart), cols.almSai, rowY + 3, { width: 50 });
        doc.text(fmt(track.lunchReturn), cols.almRet, rowY + 3, { width: 50 });
        doc.text(fmt(track.exit), cols.saida, rowY + 3, { width: 50 });
        doc.text(fmtMin(track.totalWorked), cols.trab, rowY + 3, { width: 50 });
        const bal = track.dailyBalance ?? 0;
        doc.fillColor(bal < 0 ? '#dc2626' : '#15803d').text(fmtMin(bal), cols.bal, rowY + 3, { width: 50 });
        doc.fillColor('#475569').text(track.incidentType || 'normal', cols.ocorrencia, rowY + 3, { width: 80 });
        tableY += rowH;
        rowIndex++;

        if (tableY > 750) {
          doc.addPage();
          tableY = 40;
          drawTableHeader();
        }
      }

      doc.moveDown(0.5).moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#cbd5e1').stroke();
      doc.moveDown(0.5);

      // ── TOTAIS DE JORNADA ──────────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f766e').text('TOTAIS DA JORNADA');
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155');

      const row2Col = (labelA: string, valA: string, labelB: string, valB: string) => {
        const y = doc.y;
        doc.font('Helvetica-Bold').fillColor('#475569').text(labelA, leftX, y, { width: 120 });
        doc.font('Helvetica').fillColor('#0f172a').text(valA, leftX + 115, y, { width: 150 });
        
        doc.font('Helvetica-Bold').fillColor('#475569').text(labelB, rightX, y, { width: 120 });
        doc.font('Helvetica').fillColor('#0f172a').text(valB, rightX + 115, y, { width: 150 });
        doc.moveDown(0.2);
      };

      row2Col('Horas normais:', `${closing.normalHours?.toFixed(2) ?? '0.00'} h`, 'Faltas (min):', `${closing.absenceMinutes ?? 0} min`);
      row2Col('Horas extras 50%:', `${closing.overtime50?.toFixed(2) ?? '0.00'} h`, 'Atrasos:', `${closing.lateMinutes ?? 0} min`);
      row2Col('Horas extras 100%:', `${closing.overtime100?.toFixed(2) ?? '0.00'} h`, 'Saídas antecipadas:', `${closing.earlyLeaveMinutes ?? 0} min`);
      row2Col('Adicional noturno:', `${closing.nightShift?.toFixed(2) ?? '0.00'} h`, 'Dias trabalhados:', `${closing.payableWorkdays ?? '-'}`);

      doc.moveDown(0.5).moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#cbd5e1').stroke();
      doc.moveDown(0.5);

      // ── PROVENTOS E DESCONTOS ─────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f766e').text('PROVENTOS E DESCONTOS');
      doc.moveDown(0.2);

      row2Col('Salário base:', this.currency(closing.salaryBase), `Valor hora (÷${closing.monthlyDivisor}):`, this.currency(closing.hourlyRate));
      row2Col('Hora extra 50%:', `+ ${this.currency(closing.overtime50Value)}`, 'Hora extra 100%:', `+ ${this.currency(closing.overtime100Value)}`);
      row2Col('Adicional noturno:', `+ ${this.currency(closing.nightShiftValue)}`, 'Reflexo DSR:', `+ ${this.currency(closing.dsrValue)}`);
      row2Col('Desconto de faltas:', `- ${this.currency(closing.absenceDiscount)}`, 'Base de cálculo:', this.currency(closing.grossPay));
      row2Col('INSS:', `- ${this.currency(closing.inssDiscount)}`, 'IRRF:', `- ${this.currency(closing.irrfDiscount)}`);
      row2Col('FGTS (patronal):', this.currency(closing.fgtsAmount), '', '');

      doc.moveDown(0.5);
      doc.rect(40, doc.y, W, 24).fill('#0f172a');
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff')
        .text(`LÍQUIDO ESTIMADO: ${this.currency(closing.netPay)}`, 44, doc.y - 19, { align: 'right', width: W - 8 });
      doc.moveDown(0.3);

      // ── ASSINATURAS ───────────────────────────────────────────────────────────
      doc.moveDown(2);
      const sigY = doc.y;
      const sig1X = 60;
      const sig2X = 310;

      doc.moveTo(sig1X, sigY).lineTo(sig1X + 180, sigY).strokeColor('#334155').stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
        .text('Assinatura do Colaborador', sig1X, sigY + 3, { width: 180, align: 'center' })
        .text(emp.name, sig1X, sigY + 14, { width: 180, align: 'center' })
        .text(`CPF: ${formatCpf(emp.cpf)}`, sig1X, sigY + 24, { width: 180, align: 'center' });

      doc.moveTo(sig2X, sigY).lineTo(sig2X + 180, sigY).strokeColor('#334155').stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
        .text('Assinatura do Responsável RH/Gestor', sig2X, sigY + 3, { width: 180, align: 'center' })
        .text('Data: ____/____/________', sig2X, sigY + 24, { width: 180, align: 'center' });

      // ── RODAPÉ E NUMERAÇÃO ───────────────────────────────────────────────────
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.moveTo(40, 800).lineTo(555, 800).strokeColor('#e2e8f0').stroke();
        doc.fontSize(7).fillColor('#94a3b8')
          .text(
            `Documento gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date())} | ` +
            `ID: ${closing.id} | Memória de cálculo estimativa — validar folha oficial no eSocial. | Pág ${i + 1} de ${pages.count}`,
            40, 805, { align: 'center', width: W }
          );
      }

      doc.end();
    });
  }  private async changeStatus(companyId: string, id: string, expected: TimeClosingStatus, next: TimeClosingStatus, extra: any = {}) {
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing || closing.status !== expected) throw new BadRequestException(`Transicao invalida: esperado ${expected}.`);
    return this.prisma.timeClosing.update({ where: { id }, data: { status: next, ...extra }, include: { employee: true } });
  }

  private resolvePeriod(dto: GenerateClosingDto, payrollStartDay = 1) {
    if (dto.periodStart && dto.periodEnd) {
      const periodStart = new Date(`${dto.periodStart.slice(0, 10)}T00:00:00.000Z`);
      const periodEnd = new Date(`${dto.periodEnd.slice(0, 10)}T00:00:00.000Z`);
      if (periodEnd < periodStart) throw new BadRequestException('Periodo final deve ser posterior ao inicial.');
      return { periodStart, periodEnd };
    }
    const month = Number(dto.month ?? dto.referenceMonth);
    const year = Number(dto.year ?? dto.referenceYear);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) throw new BadRequestException('Informe mes e ano validos.');
    return {
      periodStart: new Date(Date.UTC(year, month - 1, 1)),
      periodEnd: new Date(Date.UTC(year, month, 0)),
    };
  }

  private paymentRatio(track: any, forcedHandling?: 'PAYMENT' | 'BANK', approved = false): number {
    const total = (track.overtime50Minutes || 0) + (track.overtime100Minutes || 0);
    if (!total) return 0;
    const handling = forcedHandling || track.overtimeHandling;
    if (handling === 'BANK') return 0;
    if (handling === 'PAYMENT') return 1;
    if (!approved) return 0;
    if (track.overtimeHandling === 'SPLIT') return Math.min(1, Math.max(0, (track.overtimePaymentMinutes || 0) / total));
    return 1;
  }

  private expectedMinutes(employee: any, schedule?: any): number {
    if (schedule?.cycleWorkHours) return schedule.cycleWorkHours * 60;
    if (schedule?.entryTime && schedule?.exitTime) {
      const gross = this.clockDifference(schedule.entryTime, schedule.exitTime);
      const pause = schedule.lunchStartTime && schedule.lunchReturnTime ? this.clockDifference(schedule.lunchStartTime, schedule.lunchReturnTime) : 0;
      return Math.max(0, gross - pause);
    }
    return employee.workScheduleRule?.dailyMinutes ?? this.workloadMinutes(employee.dailyWorkload) ?? 480;
  }

  private weeklyMinutesFromSchedule(schedule?: any): number | null {
    if (!schedule) return null;
    return this.expectedMinutes({}, schedule) * Math.max(1, schedule.workDays?.length || 5);
  }

  private defaultWeeklyMinutes(workload?: string | null, workScale?: string | null): number {
    const daily = this.workloadMinutes(workload) ?? 528;
    let days = 5;
    const scale = workScale?.toUpperCase();
    if (scale === '6X1') days = 6;
    else if (scale === '4X2') days = 4;
    return daily * days;
  }

  private workloadMinutes(value?: string | null): number | null {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return Number.isFinite(hours) ? hours * 60 + (minutes || 0) : null;
  }

  private clockDifference(start: string, end: string): number {
    const toMinutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + (minute || 0); };
    return (toMinutes(end) - toMinutes(start) + 1440) % 1440;
  }

  private isOffCycle12x36(date: Date, schedule?: any): boolean {
    if (schedule?.scaleType !== '12x36' || !schedule.cycleStartDate) return false;
    const days = Math.floor((date.getTime() - schedule.cycleStartDate.getTime()) / 86400000);
    return ((days % 2) + 2) % 2 === 1;
  }

  private eachDate(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) dates.push(new Date(cursor));
    return dates;
  }

  private hours(minutes: number): number { return Math.round((minutes / 60) * 10000) / 10000; }
  private dateKey(date: Date): string { return toSaoPauloDateKey(date); }
  private isJustifyingOccurrence(type: string): boolean {
    return ['JUSTIFIED_ABSENCE', 'MEDICAL_CERTIFICATE', 'VACATION', 'LEAVE', 'DAY_OFF', 'DSR', 'HOLIDAY', 'EXTERNAL_WORK', 'HOME_OFFICE', 'TRAINING'].includes(String(type));
  }
  private formatDate(date: Date): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date); }
  private currency(value: number): string { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  private safeFilename(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_'); }
}
