import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../../database/prisma.service';
import type { JwtUser } from '../../../common/types/auth.types';
import { ScheduleScopeService } from '../../schedule/access/schedule-scope.service';
import { TimeTrackService } from '../../time-track/time-track.service';
import { bankBalanceMinutes, getOvertimePolicy } from '../../time-track/overtime-policy';
import { DayResolver, parseDateOnly, scheduledMinutes } from '../calendar/day-resolver';
import { HubNotifyService } from '../notify.service';
import { LAUNCH_KINDS, LAUNCH_LABEL, MAX_PEOPLE, bankCheck, checkCertificateFile, expandDates, type LaunchKind } from './launch-rules';

export class LaunchDto {
  @IsIn(LAUNCH_KINDS as unknown as string[]) kind!: LaunchKind;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(MAX_PEOPLE) @IsUUID('all', { each: true }) employeeIds!: string[];
  @IsDateString() dateStart!: string;
  @IsDateString() dateEnd!: string;
  @IsString() @MaxLength(300) reason!: string;
  @IsOptional() @IsString() @MaxLength(120) holidayName?: string;
  @IsOptional() @IsUUID() attachmentId?: string;
}

export interface LaunchPersonResult { employeeId: string; name: string; applied: string[]; skipped: { date: string; reason: string }[]; error?: string }

const baseDir = () => process.env.SUPPORT_ATTACHMENTS_PATH || '/data/attachments';

@Injectable()
export class LaunchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScheduleScopeService,
    private readonly days: DayResolver,
    private readonly timeTrack: TimeTrackService,
    private readonly notify: HubNotifyService,
  ) {}

  /** Saldo do banco de horas das pessoas e se a empresa usa banco (para a tela mostrar antes de lançar). */
  async bank(actor: JwtUser, employeeIds: string[]) {
    const ids = [...new Set(employeeIds)].slice(0, MAX_PEOPLE);
    for (const id of ids) await this.scope.assertEmployee(actor, 'schedule.write', id);
    const { policy, validityMonths } = await getOvertimePolicy(this.prisma, actor.companyId);
    const balances = await bankBalanceMinutes(this.prisma, actor.companyId, ids);
    return { usesBank: policy === 'BANK', validityMonths, balances: Object.fromEntries(ids.map((id) => [id, balances.get(id) ?? 0])) };
  }

  /** Guarda a foto/PDF do atestado (fora do banco) e devolve o id para o lançamento. */
  async saveAttachment(actor: JwtUser, employeeId: string, file: { originalname: string; size: number; buffer: Buffer; mimetype?: string }) {
    await this.scope.assertEmployee(actor, 'schedule.write', employeeId);
    if (!file?.buffer) throw new BadRequestException('Nenhum arquivo enviado.');
    const problem = checkCertificateFile(file.originalname, file.size, file.buffer);
    if (problem) throw new BadRequestException(problem);
    const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase();
    const sha = createHash('sha256').update(file.buffer).digest('hex');
    const key = `atestados/${actor.companyId}/${Date.now()}-${sha.slice(0, 10)}.${ext}`;
    const full = join(baseDir(), key);
    await mkdir(join(baseDir(), 'atestados', actor.companyId), { recursive: true });
    await writeFile(full, file.buffer);
    const row = await this.prisma.attachment.create({
      data: { companyId: actor.companyId, ownerType: 'EMPLOYEE', ownerId: employeeId, fileName: file.originalname.slice(0, 200), fileType: file.mimetype ?? ext, fileSize: file.size, fileUrl: `atestado:${key}`, storageKey: key, uploadedByUserId: actor.sub },
    });
    return { id: row.id, fileName: row.fileName };
  }

  async attachmentFile(actor: JwtUser, id: string) {
    const row = await this.prisma.attachment.findFirst({ where: { id, companyId: actor.companyId, ownerType: 'EMPLOYEE' } });
    if (!row?.storageKey || !row.fileUrl.startsWith('atestado:')) throw new NotFoundException('Anexo não encontrado.');
    await this.scope.assertEmployee(actor, 'schedule.write', row.ownerId);
    return { stream: createReadStream(join(baseDir(), row.storageKey)), fileName: row.fileName, mimetype: row.fileType };
  }

  private async replaceDay(companyId: string, employeeId: string, date: string, exceptionType: string, reason: string, userId: string) {
    const when = parseDateOnly(date);
    await this.prisma.$transaction(async (tx) => {
      await tx.scheduleException.deleteMany({ where: { companyId, employeeId, date: when, exceptionType: { in: ['FOLGA', 'COMPENSACAO', 'AJUSTE_ESCALA', 'FERIADO_LOCAL', 'ATESTADO'] } } });
      await tx.scheduleException.create({ data: { companyId, employeeId, date: when, exceptionType, reason, createdByUserId: userId } });
    });
  }

  async launch(actor: JwtUser, dto: LaunchDto) {
    const reason = String(dto.reason ?? '').trim();
    if (!reason) throw new BadRequestException('Informe o motivo.');
    const dates = expandDates(dto.dateStart, dto.dateEnd);
    const ids = [...new Set(dto.employeeIds)];
    if (dto.attachmentId) {
      const att = await this.prisma.attachment.findFirst({ where: { id: dto.attachmentId, companyId: actor.companyId, ownerType: 'EMPLOYEE' }, select: { id: true } });
      if (!att) throw new BadRequestException('O anexo informado não foi encontrado.');
    }
    const policy = dto.kind === 'FOLGA_BANCO' ? await getOvertimePolicy(this.prisma, actor.companyId) : null;
    if (dto.kind === 'FOLGA_BANCO' && policy?.policy !== 'BANK') {
      throw new BadRequestException('A empresa paga a hora extra na folha e não usa banco de horas. Ative o banco em Configurações → Hora extra e banco.');
    }
    const balances = dto.kind === 'FOLGA_BANCO' ? await bankBalanceMinutes(this.prisma, actor.companyId, ids) : null;
    const employees = await this.prisma.employee.findMany({ where: { companyId: actor.companyId, id: { in: ids } }, select: { id: true, name: true, userId: true, status: true } });
    const byId = new Map(employees.map((e) => [e.id, e]));
    const asAdmin: JwtUser = { ...actor, role: 'ADMIN' };
    const label = `${LAUNCH_LABEL[dto.kind]}${dto.holidayName ? ` — ${dto.holidayName.trim()}` : ''}: ${reason}`.slice(0, 300);
    const results: LaunchPersonResult[] = [];

    for (const employeeId of ids) {
      const employee = byId.get(employeeId);
      const result: LaunchPersonResult = { employeeId, name: employee?.name ?? 'Funcionário não encontrado', applied: [], skipped: [] };
      results.push(result);
      if (!employee) { result.error = 'Funcionário não encontrado nesta empresa.'; continue; }
      try { await this.scope.assertEmployee(actor, 'schedule.write', employeeId); } catch (cause) { result.error = cause instanceof ForbiddenException ? 'Você não tem permissão para lançar para esta pessoa.' : 'Pessoa fora do seu alcance.'; continue; }

      const working: { date: string; minutes: number }[] = [];
      for (const date of dates) {
        const closed = await this.prisma.timeClosing.findFirst({ where: { companyId: actor.companyId, employeeId, status: { not: 'DRAFT' }, periodStart: { lte: parseDateOnly(date) }, periodEnd: { gte: parseDateOnly(date) } }, select: { id: true } });
        if (closed) { result.skipped.push({ date, reason: 'período já em revisão ou fechado' }); continue; }
        const day = await this.days.resolveDay(actor.companyId, employeeId, parseDateOnly(date));
        if (!day.working) { result.skipped.push({ date, reason: day.type === 'FOLGA' ? 'já é folga' : `não é dia de trabalho (${String(day.type).toLowerCase()})` }); continue; }
        working.push({ date, minutes: scheduledMinutes(day) || 480 });
      }
      if (!working.length) { result.error = result.skipped.length ? 'Nenhum dia de trabalho livre neste período.' : 'Nenhum dia no período.'; continue; }

      if (dto.kind === 'FOLGA_BANCO') {
        const need = working.reduce((s, d) => s + d.minutes, 0);
        const check = bankCheck(balances?.get(employeeId) ?? 0, need);
        if (!check.ok) { result.error = check.message; continue; }
      }

      for (const { date, minutes } of working) {
        try {
          if (dto.kind === 'FOLGA_EXTRA') await this.replaceDay(actor.companyId, employeeId, date, 'FOLGA', label, actor.sub);
          else if (dto.kind === 'FERIADO') await this.replaceDay(actor.companyId, employeeId, date, 'FERIADO_LOCAL', label, actor.sub);
          else if (dto.kind === 'ATESTADO') {
            await this.replaceDay(actor.companyId, employeeId, date, 'ATESTADO', label, actor.sub);
            await this.prisma.timeOccurrence.create({ data: { companyId: actor.companyId, employeeId, type: 'MEDICAL_CERTIFICATE', date: parseDateOnly(date), minutes, reason: label, status: 'APPROVED', createdByUserId: actor.sub, approvedByUserId: actor.sub, approvedAt: new Date() } });
          } else {
            // Folga pelo banco: abate a jornada do saldo (mesma regra do pedido de folga por compensação).
            await this.timeTrack.manual(actor.companyId, asAdmin, { employeeId, date, reason: 'ajuste_abono_folga', observation: label } as any);
            const track = await this.prisma.timeTrack.findFirst({ where: { companyId: actor.companyId, employeeId, date: parseDateOnly(date) } });
            if (track?.manualStatus === 'pending') await this.timeTrack.approveManual(actor.companyId, asAdmin, track.id, true);
            await this.replaceDay(actor.companyId, employeeId, date, 'FOLGA', label, actor.sub);
          }
          result.applied.push(date);
        } catch (cause: any) {
          result.skipped.push({ date, reason: String(cause?.message ?? 'não foi possível lançar').slice(0, 140) });
        }
      }

      if (dto.kind === 'ATESTADO' && result.applied.length) {
        const first = result.applied[0], last = result.applied[result.applied.length - 1];
        await this.prisma.medicalCertificate.create({
          data: {
            companyId: actor.companyId, employeeId, certificateType: result.applied.length > 1 ? 'DAYS' : 'FULL_DAY',
            startAt: new Date(`${first}T03:00:00.000Z`), endAt: new Date(new Date(`${last}T03:00:00.000Z`).getTime() + 86_399_000),
            coveredMinutes: working.filter((d) => result.applied.includes(d.date)).reduce((s, d) => s + d.minutes, 0),
            issueDate: parseDateOnly(first), documentId: dto.attachmentId ?? null, status: 'APPROVED', createdByUserId: actor.sub, reviewedByUserId: actor.sub, reviewedAt: new Date(),
          },
        }).catch(() => undefined);
      }
      if (result.applied.length) {
        await this.notify.notify(actor.companyId, [employee.userId], 'Sua escala foi alterada', `${LAUNCH_LABEL[dto.kind]} em ${result.applied.length} dia(s), de ${result.applied[0].split('-').reverse().join('/')} a ${result.applied[result.applied.length - 1].split('-').reverse().join('/')}. ${reason}`, '/dashboard/escalas');
      }
    }

    await this.prisma.auditLog.create({ data: { companyId: actor.companyId, userId: actor.sub, action: 'SCHEDULE_LAUNCH', entity: 'ScheduleException', metadata: { kind: dto.kind, people: ids.length, dateStart: dates[0], dateEnd: dates[dates.length - 1], applied: results.reduce((s, r) => s + r.applied.length, 0), attachmentId: dto.attachmentId ?? null } } });
    return { kind: dto.kind, applied: results.reduce((s, r) => s + r.applied.length, 0), people: results };
  }
}
