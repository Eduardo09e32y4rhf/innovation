import { createPdfSink, sendPdf } from '../../common/pdf/pdf-response';
import { contentDisposition } from '../../common/pdf/pdf-response';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TimeClosingStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { getOvertimePolicy, overtimePaymentRatio } from './overtime-policy';
import { PDF, PdfReport } from '../../common/pdf/pdf-report';
import { appendMirror, buildPayslipPdf, buildTimeSheetPdf, timeSheetBrand } from './time-sheet-pdf';
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

interface CollectivePdfQuery {
  month: string;
  employeeIds?: string | string[];
}

@Injectable()
export class TimeClosingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payroll: PayrollCalculationService,
  ) {}

  getOvertimePolicy(companyId: string) {
    return getOvertimePolicy(this.prisma, companyId);
  }

  /** Banco de horas (validade em meses) ou pagamento da extra na folha. So vale para os proximos lancamentos. */
  async setOvertimePolicy(companyId: string, actor: JwtUser, body: { policy?: string; validityMonths?: number }) {
    if (body.policy !== 'BANK' && body.policy !== 'PAYMENT') throw new BadRequestException('Informe a politica: BANK (banco de horas) ou PAYMENT (pagamento na folha).');
    const months = Number(body.validityMonths ?? 3);
    if (!Number.isInteger(months) || months < 1 || months > 12) throw new BadRequestException('A validade do banco deve ser de 1 a 12 meses.');
    await this.prisma.overtimeRule.upsert({
      where: { companyId },
      create: { companyId, overtimePolicy: body.policy, bankValidityMonths: months },
      update: { overtimePolicy: body.policy, bankValidityMonths: months },
    });
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'OVERTIME_POLICY_CHANGED', entity: 'OvertimeRule', metadata: { policy: body.policy, validityMonths: months } } }).catch(() => undefined);
    return getOvertimePolicy(this.prisma, companyId);
  }

  async generate(companyId: string, actor: JwtUser, dto: GenerateClosingDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { payrollStartDay: true } });
    const { periodStart, periodEnd } = this.resolvePeriod(dto, company?.payrollStartDay ?? 1);
    const overtimeHandling = dto.overtimeHandling === 'BANK' ? 'BANK' : dto.overtimeHandling === 'PAYMENT' ? 'PAYMENT' : undefined;
    const allEmployees = await this.prisma.employee.findMany({
      where: {
        companyId,
        admissionDate: { lte: periodEnd },
        OR: [
          { terminationDate: null },
          { terminationDate: { gte: periodStart } },
        ],
        ...(dto.employeeIds?.length ? { id: { in: dto.employeeIds } } : {}),
      },
      include: { workScheduleRule: true, userSchedules: { include: { schedule: true }, orderBy: { startDate: 'desc' } } },
      orderBy: { name: 'asc' },
    });
    if (!allEmployees.length) throw new BadRequestException('Nenhum funcionario ativo encontrado para o fechamento.');
    // Quem esta sem salario na ficha nao bloqueia a empresa inteira: e ignorado e o RH e avisado no log de auditoria.
    const withoutSalary = allEmployees.filter((employee) => Number(employee.salary || 0) <= 0);
    const employees = allEmployees.filter((employee) => Number(employee.salary || 0) > 0);
    if (!employees.length) {
      throw new BadRequestException(`Nenhum funcionario com salario preenchido para fechar: ${withoutSalary.map((item) => item.name).join(', ')}`);
    }
    if (withoutSalary.length) {
      await this.prisma.auditLog
        .create({ data: { companyId, userId: actor.sub, action: 'TIME_CLOSING_SKIPPED_NO_SALARY', entity: 'TimeClosing', metadata: { employees: withoutSalary.map((item) => ({ id: item.id, name: item.name })) } } })
        .catch(() => undefined);
    }
    const taxContext = await this.payroll.resolveTaxContext(periodEnd);

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

    const employeeIds = employees.map(e => e.id);
    const [allTracks, allOccurrences, allSchedules] = await Promise.all([
      this.prisma.timeTrack.findMany({
        where: { companyId, employeeId: { in: employeeIds }, date: { gte: periodStart, lte: periodEnd } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.timeOccurrence.findMany({
        where: { companyId, employeeId: { in: employeeIds }, date: { gte: periodStart, lte: periodEnd }, status: 'APPROVED' },
      }),
      this.prisma.userSchedule.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          startDate: { lte: periodEnd },
          OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
        },
        include: { schedule: true },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    const tracksByEmployee = new Map<string, typeof allTracks>();
    const occurrencesByEmployee = new Map<string, typeof allOccurrences>();
    const schedulesByEmployee = new Map<string, typeof allSchedules>();

    for (const track of allTracks) {
      if (!tracksByEmployee.has(track.employeeId)) tracksByEmployee.set(track.employeeId, []);
      tracksByEmployee.get(track.employeeId)!.push(track);
    }
    for (const occurrence of allOccurrences) {
      if (!occurrencesByEmployee.has(occurrence.employeeId)) occurrencesByEmployee.set(occurrence.employeeId, []);
      occurrencesByEmployee.get(occurrence.employeeId)!.push(occurrence);
    }
    for (const schedule of allSchedules) {
      if (!schedulesByEmployee.has(schedule.employeeId)) schedulesByEmployee.set(schedule.employeeId, []);
      schedulesByEmployee.get(schedule.employeeId)!.push(schedule);
    }

    for (const employee of employees) {
      const tracks = tracksByEmployee.get(employee.id) || [];
      const occurrences = occurrencesByEmployee.get(employee.id) || [];
      const schedules = schedulesByEmployee.get(employee.id) || [];

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
        absenceMinutes += Math.max(0, track.absenceMinutes || 0);
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
        lateMinutes,
        earlyLeaveMinutes,
        payableWorkdays,
        paidRestDays,
        dependents,
        overtime50Factor: Number(overtimeRule.weekdayRate),
        overtime100Factor: Number(overtimeRule.sundayHolidayRate),
        nightShiftPercent: (Number(overtimeRule.nightShiftRate) - 1) * 100,
        dsrEnabled: overtimeRule.dsrEnabled,
        taxContext,
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
          taxTableSnapshot: JSON.parse(JSON.stringify(taxContext)),
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

    if (actor && actor.role === 'FUNCIONARIO') {
      const employee = await this.prisma.employee.findFirst({
        where: { companyId, userId: actor.sub },
        select: { id: true },
      });
      if (!employee || closing.employeeId !== employee.id) {
        throw new ForbiddenException('Acesso negado ao fechamento de outro colaborador.');
      }
    }

    if (actor && actor.role === 'GESTOR') {
      const self = await this.prisma.employee.findFirst({ where: { companyId, userId: actor.sub }, select: { id: true } });
      const inTeam = self
        ? closing.employeeId === self.id ||
          (await this.prisma.employee.count({ where: { companyId, id: closing.employeeId, managerId: self.id } })) > 0
        : false;
      if (!inTeam) throw new ForbiddenException('Acesso negado ao fechamento de colaborador fora da sua equipe.');
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
    const taxContext = await this.payroll.resolveTaxContext(closing.periodEnd);

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
        lateMinutes: Number(updated.lateMinutes),
        earlyLeaveMinutes: Number(updated.earlyLeaveMinutes),
        payableWorkdays: Number(updated.payableWorkdays),
        paidRestDays: Number(updated.paidRestDays),
        dependents: Array.isArray(updated.employee.dependents) ? updated.employee.dependents.length : 0,
        taxContext,
      });
      return tx.timeClosing.update({
        where: { id },
        data: {
          [dto.field]: value,
          ...financial,
          taxTableSnapshot: JSON.parse(JSON.stringify(taxContext)),
          totalPayable: financial.netPay,
        },
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

  async getCollectivePdf(companyId: string, actor: JwtUser, query: CollectivePdfQuery) {
    const { periodStart, periodEnd } = this.resolveCollectiveMonth(query.month);
    const requestedEmployeeIds = this.parseEmployeeIds(query.employeeIds);
    const authorizedEmployeeIds = await this.resolveCollectiveEmployeeScope(
      companyId,
      actor,
      requestedEmployeeIds,
    );

    const closings = await this.prisma.timeClosing.findMany({
      where: {
        companyId,
        periodStart,
        periodEnd,
        ...(authorizedEmployeeIds.length
          ? { employeeId: { in: authorizedEmployeeIds } }
          : requestedEmployeeIds.length
            ? { employeeId: { in: requestedEmployeeIds } }
            : {}),
      },
      include: { employee: true, company: true },
      orderBy: [{ updatedAt: 'desc' }, { employee: { name: 'asc' } }],
    });

    const latestByEmployee = new Map<string, any>();
    for (const closing of closings) {
      if (!latestByEmployee.has(closing.employeeId)) latestByEmployee.set(closing.employeeId, closing);
    }
    const selectedClosings = [...latestByEmployee.values()]
      .sort((left, right) => left.employee.name.localeCompare(right.employee.name, 'pt-BR'));

    if (!selectedClosings.length) {
      throw new BadRequestException(
        'Nenhum fechamento oficial encontrado para o mes selecionado. Gere o fechamento antes de emitir a folha coletiva.',
      );
    }

    const employeeIds = selectedClosings.map((closing) => closing.employeeId);
    const tracks = await this.prisma.timeTrack.findMany({
      where: {
        companyId,
        employeeId: { in: employeeIds },
        date: { gte: periodStart, lte: periodEnd },
      },
      orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
    });
    const tracksByEmployee = new Map<string, any[]>();
    for (const track of tracks) {
      const rows = tracksByEmployee.get(track.employeeId) ?? [];
      rows.push(track);
      tracksByEmployee.set(track.employeeId, rows);
    }

    const generatedAt = new Date();
    const documentSeed = [
      companyId,
      query.month,
      ...selectedClosings.map((closing) => `${closing.id}:${closing.updatedAt.toISOString()}`),
    ].join('|');
    const documentId = `POINT-COLLECTIVE-${query.month}-${createHash('sha256').update(documentSeed).digest('hex').slice(0, 12)}`;
    const buffer = await this.buildCollectivePdf(
      selectedClosings,
      tracksByEmployee,
      generatedAt,
      documentId,
      actor.sub,
    );
    const hash = createHash('sha256').update(buffer).digest('hex');
    const calculationVersions = [...new Set(
      selectedClosings.map((closing) => closing.calculationVersion || 'UNVERSIONED'),
    )];

    return {
      buffer,
      hash,
      documentId,
      generatedAt,
      filename: `Folha_Ponto_Coletiva_${query.month}.pdf`,
      recordCount: selectedClosings.length,
      calculationVersions,
    };
  }

  async streamCollectivePdf(
    companyId: string,
    actor: JwtUser,
    query: CollectivePdfQuery,
    res: any,
  ) {
    const artifact = await this.getCollectivePdf(companyId, actor, query);
    const target = res.raw ?? res;
    const digest = Buffer.from(artifact.hash, 'hex').toString('base64');
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition(artifact.filename),
      'Content-Length': String(artifact.buffer.length),
      'Cache-Control': 'private, no-store',
      'Digest': `sha-256=${digest}`,
      'ETag': `"sha256-${artifact.hash}"`,
      'X-Document-Id': artifact.documentId,
      'X-Document-Sha256': artifact.hash,
      'X-Document-Type': 'TIME_CLOSING_COLLECTIVE',
      'X-Document-Version': 'TIME_CLOSING_COLLECTIVE_V1',
      'X-Document-Generated-At': artifact.generatedAt.toISOString(),
      'X-Document-Records': String(artifact.recordCount),
      'X-Calculation-Versions': artifact.calculationVersions.join(','),
    };

    for (const [name, value] of Object.entries(headers)) {
      if (typeof target.setHeader === 'function') target.setHeader(name, value);
      else if (typeof res.header === 'function') res.header(name, value);
    }
    target.end(artifact.buffer);
  }

  /** Fechamentos já aprovados ou fechados do próprio colaborador: o RH decide quando o contracheque aparece, aprovando o fechamento. */
  private async ownPublishedClosings(companyId: string, actor: JwtUser, id?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { companyId, userId: actor.sub }, select: { id: true } });
    if (!employee) return [];
    return this.prisma.timeClosing.findMany({
      where: { companyId, employeeId: employee.id, status: { in: [TimeClosingStatus.APPROVED, TimeClosingStatus.CLOSED] }, ...(id ? { id } : {}) },
      include: { employee: true, company: true },
      orderBy: { periodStart: 'desc' },
    });
  }

  async listMyPayslips(companyId: string, actor: JwtUser) {
    const closings = await this.ownPublishedClosings(companyId, actor);
    return closings.map((closing) => ({
      id: closing.id, periodStart: closing.periodStart, periodEnd: closing.periodEnd, status: closing.status,
      grossPay: Number(closing.grossPay ?? 0), netPay: Number(closing.netPay ?? 0),
    }));
  }

  async streamMyPayslip(companyId: string, actor: JwtUser, id: string, res: any) {
    const [closing] = await this.ownPublishedClosings(companyId, actor, id);
    if (!closing) throw new NotFoundException('Contracheque nao encontrado.');
    const buffer = await buildPayslipPdf({ ...(closing as any), tracks: [] });
    sendPdf(res, buffer, `Contracheque_${this.safeFilename(closing.employee?.name ?? 'funcionario')}_${this.dateKey(closing.periodStart)}.pdf`);
  }

  async streamPdf(companyId: string, id: string, res: any, actor?: JwtUser) {
    const closing = await this.getById(companyId, id, actor);
    const fileName = `Folha_Ponto_${this.safeFilename(closing.employee?.name ?? 'funcionario')}_${this.dateKey(closing.periodStart)}.pdf`;
    const buffer = await buildTimeSheetPdf({ ...(closing as any), tracks: closing.tracks ?? [] });
    sendPdf(res, buffer, fileName);
  }

  private async buildCollectivePdf(
    closings: any[],
    tracksByEmployee: Map<string, any[]>,
    generatedAt: Date,
    documentId: string,
    issuedBy: string,
  ): Promise<Buffer> {
    const company = closings[0].company;
    const { periodStart, periodEnd } = closings[0];
    const toSheet = (closing: any) => ({ ...closing, company, tracks: tracksByEmployee.get(closing.employeeId) ?? [] });
    const hours = (value: unknown) => `${Number(value || 0).toFixed(2).replace('.', ',')} h`;

    const report = await PdfReport.create({
      title: 'Folha de ponto coletiva', subtitle: `Competência ${this.formatDate(periodStart)} a ${this.formatDate(periodEnd)}`,
      brand: timeSheetBrand(company), footerId: documentId, generatedAt, author: company?.name ?? undefined,
    });

    // Página de abertura: a equipe inteira em uma tabela.
    report.section('Resumo da equipe', `${closings.length} colaborador${closings.length === 1 ? '' : 'es'}`);
    report.table(
      [
        { label: 'Colaborador', width: 130 }, { label: 'Matrícula', width: 52, align: 'left' }, { label: 'Normais', width: 58, align: 'right' }, { label: 'HE 50%', width: 52, align: 'right' },
        { label: 'HE 100%', width: 54, align: 'right' }, { label: 'Noturno', width: 56, align: 'right' }, { label: 'Faltas', width: 55, align: 'right' }, { label: 'Atrasos', width: 58, align: 'right' },
      ],
      closings.map((closing) => [
        closing.employee.name, closing.employee.registration || '-', hours(closing.normalHours), hours(closing.overtime50), hours(closing.overtime100), hours(closing.nightShift),
        `${closing.absenceMinutes || 0} min`, `${closing.lateMinutes || 0} min`,
      ]),
      { fontSize: 8 },
    );
    report.paragraph(`Documento emitido a partir dos fechamentos oficiais e dos registros de ponto. Emissor: ${issuedBy}.`, { size: 8, color: PDF.color.mut });

    // Uma página (ou mais) por colaborador, sem valores de salário.
    closings.forEach((closing) => {
      report.newPage();
      appendMirror(report, toSheet(closing), { compact: true });
    });
    return report.finish();
  }
  private resolveCollectiveMonth(month: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) {
      throw new BadRequestException('Informe o mes no formato YYYY-MM.');
    }
    const [year, monthNumber] = month.split('-').map(Number);
    return {
      periodStart: new Date(Date.UTC(year, monthNumber - 1, 1)),
      periodEnd: new Date(Date.UTC(year, monthNumber, 0)),
    };
  }

  private parseEmployeeIds(value?: string | string[]): string[] {
    const values = Array.isArray(value) ? value : value ? [value] : [];
    const ids = [...new Set(values.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean))];
    if (ids.length > 500) throw new BadRequestException('Selecione no maximo 500 colaboradores por documento.');
    return ids;
  }

  private async resolveCollectiveEmployeeScope(
    companyId: string,
    actor: JwtUser,
    requestedEmployeeIds: string[],
  ): Promise<string[]> {
    if (['ADMIN', 'RH', 'DEV', 'CEO', 'CONTABIL'].includes(actor.role)) return requestedEmployeeIds;

    const actorEmployee = await this.prisma.employee.findFirst({
      where: { companyId, userId: actor.sub },
      select: { id: true },
    });
    if (!actorEmployee) throw new ForbiddenException('Usuario sem colaborador vinculado.');

    if (actor.role === 'FUNCIONARIO') {
      if (requestedEmployeeIds.some((id) => id !== actorEmployee.id)) {
        throw new ForbiddenException('Acesso negado a folha de outro colaborador.');
      }
      return [actorEmployee.id];
    }

    if (actor.role === 'GESTOR') {
      const team = await this.prisma.employee.findMany({
        where: {
          companyId,
          OR: [{ id: actorEmployee.id }, { managerId: actorEmployee.id }],
        },
        select: { id: true },
      });
      const allowed = new Set(team.map((employee) => employee.id));
      if (requestedEmployeeIds.some((id) => !allowed.has(id))) {
        throw new ForbiddenException('A selecao inclui colaborador fora da equipe do gestor.');
      }
      return requestedEmployeeIds.length ? requestedEmployeeIds : [...allowed];
    }

    throw new ForbiddenException('Perfil sem permissao para emitir folha coletiva.');
  }

  private taxSnapshotVersion(snapshot: unknown): string {
    if (!snapshot || typeof snapshot !== 'object') return 'NAO_REGISTRADO';
    const value = snapshot as Record<string, unknown>;
    return String(value.version || value.calculationVersion || value.reference || 'SNAPSHOT_REGISTRADO');
  }

  private async changeStatus(companyId: string, id: string, expected: TimeClosingStatus, next: TimeClosingStatus, extra: any = {}) {
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

  // Regra unica (overtime-policy.ts), a mesma da folha. O 3o parametro e mantido so por compatibilidade com os chamadores.
  private paymentRatio(track: any, forcedHandling?: 'PAYMENT' | 'BANK', _approved = false): number {
    return overtimePaymentRatio(track, forcedHandling);
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
