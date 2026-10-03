import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import type { JwtUser } from '../../../common/types/auth.types';
import { toDateOnly } from '../../../common/utils/date.utils';
import { scopeOf } from '../../schedule/access/schedule-access';
import { ScheduleScopeService } from '../../schedule/access/schedule-scope.service';
import { TimeTrackService } from '../../time-track/time-track.service';
import { DayResolver, dateKey, parseDateOnly, scheduledMinutes, type ResolvedDay } from '../calendar/day-resolver';
import { HubNotifyService } from '../notify.service';
import { PolicyService } from '../policy/policy.service';
import { punchReceipt } from '../punch/punch-rules';
import { checkClt, normalizePayload, REQUEST_TYPE_LABEL, withOverride, type Finding, type RequestType } from './request-rules';
import { BulkDecideDto, CreateRequestDto, DecideRequestDto, PeerResponseDto } from './requests.dto';

type StepName = 'MANAGER' | 'HR';
interface Step { step: StepName; status: 'PENDING' | 'APPROVED' | 'REJECTED'; byUserId?: string; byName?: string; at?: string; note?: string }

const HR_ROLES = ['RH', 'ADMIN', 'DEV'];
const DAY = 86_400_000;

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScheduleScopeService,
    private readonly days: DayResolver,
    private readonly policies: PolicyService,
    private readonly timeTrack: TimeTrackService,
    private readonly notify: HubNotifyService,
  ) {}

  // ─── Validação (pré-visualização) ───────────────────────────────
  private async closedPeriod(companyId: string, employeeId: string, date: string) {
    const when = parseDateOnly(date);
    return this.prisma.timeClosing.findFirst({
      where: { companyId, employeeId, status: { not: 'DRAFT' }, periodStart: { lte: when }, periodEnd: { gte: when } },
      select: { id: true },
    });
  }

  private async coverageWarning(companyId: string, employee: { id: string; department: string | null }, date: string): Promise<Finding | null> {
    if (!employee.department) return null;
    const when = parseDateOnly(date);
    const peers = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE', department: employee.department },
      select: { id: true },
    });
    if (peers.length < 3) return null;
    const ids = peers.map((peer) => peer.id);
    const [exceptions, vacations] = await Promise.all([
      this.prisma.scheduleException.count({ where: { companyId, employeeId: { in: ids }, date: when, exceptionType: { in: ['FOLGA', 'ATESTADO', 'SUSPENSAO', 'FERIADO_LOCAL'] } } }),
      this.prisma.vacation.count({ where: { employeeId: { in: ids }, status: { in: ['APPROVED', 'COMPLETED'] }, startDate: { lte: when }, endDate: { gte: when } } }),
    ]);
    const available = peers.length - exceptions - vacations - 1;
    if (available / peers.length < 0.5) {
      return { level: 'warning', code: 'COBERTURA', message: `Em ${date} menos da metade do setor ${employee.department} ficaria trabalhando.` };
    }
    return null;
  }

  async validate(actor: JwtUser, type: RequestType, payloadRaw: unknown, peerEmployeeId?: string | null) {
    const employee = await this.requesterEmployee(actor);
    const { dates, data } = normalizePayload(type, payloadRaw);
    const findings: Finding[] = [];
    const today = dateKey(toDateOnly(new Date()));
    const policy = await this.policies.getPolicy(actor.companyId);
    const error = (code: string, message: string) => findings.push({ level: 'error', code, message });

    for (const date of dates) {
      if (await this.closedPeriod(actor.companyId, employee.id, date)) error('PERIODO_FECHADO', `O periodo de ${date} ja esta em revisao ou fechado. Peça ao RH para reabri-lo.`);
    }

    const range = (extra = 7) => {
      const sorted = [...dates].sort();
      return { from: new Date(parseDateOnly(sorted[0]).getTime() - extra * DAY), to: new Date(parseDateOnly(sorted[sorted.length - 1]).getTime() + extra * DAY) };
    };

    switch (type) {
      case 'TROCA_FOLGA': {
        const { offDate, workDate } = data as { offDate: string; workDate: string };
        if (offDate < today || workDate < today) error('DATA_PASSADA', 'Escolha datas de hoje em diante.');
        const { from, to } = range();
        const resolved = await this.days.resolveRange(actor.companyId, employee.id, from, to);
        const off = resolved.find((day) => day.date === offDate);
        const work = resolved.find((day) => day.date === workDate);
        if (!off?.working) error('NAO_E_TRABALHO', `Em ${offDate} voce nao esta escalado; escolha um dia de trabalho para folgar.`);
        if (work?.type !== 'FOLGA') error('NAO_E_FOLGA', `Em ${workDate} voce nao esta de folga; escolha um dia de folga para trabalhar.`);
        if (off && work) {
          let hypothetical = withOverride(resolved, offDate, { type: 'FOLGA', working: false, entry: null, exit: null, lunchStart: null, lunchReturn: null });
          hypothetical = withOverride(hypothetical, workDate, { type: 'COMPENSACAO', working: true, entry: off.entry, exit: off.exit, lunchStart: off.lunchStart, lunchReturn: off.lunchReturn });
          findings.push(...checkClt(hypothetical));
        }
        const coverage = await this.coverageWarning(actor.companyId, employee, offDate);
        if (coverage) findings.push(coverage);
        break;
      }
      case 'TROCA_TURNO': {
        const { date } = data as { date: string };
        if (date < today) error('DATA_PASSADA', 'Escolha uma data de hoje em diante.');
        if (!peerEmployeeId) { error('SEM_COLEGA', 'Escolha o colega da troca.'); break; }
        const peer = await this.prisma.employee.findFirst({ where: { id: peerEmployeeId, companyId: actor.companyId, status: 'ACTIVE' }, select: { id: true, name: true } });
        if (!peer || peer.id === employee.id) { error('COLEGA_INVALIDO', 'Colega invalido.'); break; }
        const { from, to } = range();
        const [mine, theirs] = await Promise.all([
          this.days.resolveRange(actor.companyId, employee.id, from, to),
          this.days.resolveRange(actor.companyId, peer.id, from, to),
        ]);
        const myDay = mine.find((day) => day.date === date)!;
        const peerDay = theirs.find((day) => day.date === date)!;
        if (!myDay.working && !peerDay.working) error('SEM_TURNO', 'Nenhum dos dois trabalha nesse dia.');
        if (myDay.type === 'FERIAS' || peerDay.type === 'FERIAS') error('FERIAS', 'Um dos funcionarios esta de ferias nesse dia.');
        if (myDay.working && peerDay.working && myDay.entry === peerDay.entry && myDay.exit === peerDay.exit) error('TURNOS_IGUAIS', 'Os dois ja tem o mesmo turno nesse dia.');
        const swap = (days: ResolvedDay[], from: ResolvedDay, source: ResolvedDay) =>
          withOverride(days, date, source.working
            ? { type: 'COMPENSACAO', working: true, entry: source.entry, exit: source.exit, lunchStart: source.lunchStart, lunchReturn: source.lunchReturn }
            : { type: 'FOLGA', working: false, entry: null, exit: null, lunchStart: null, lunchReturn: null });
        findings.push(...checkClt(swap(mine, myDay, peerDay)).map((item) => ({ ...item, message: `Voce: ${item.message}` })));
        findings.push(...checkClt(swap(theirs, peerDay, myDay)).map((item) => ({ ...item, message: `${peer.name}: ${item.message}` })));
        break;
      }
      case 'NOVA_ESCALA': {
        const { scheduleId, startDate } = data as { scheduleId: string; startDate: string };
        if (startDate < today) error('DATA_PASSADA', 'A nova escala deve comecar de hoje em diante.');
        const schedule = await this.prisma.schedule.findFirst({ where: { id: scheduleId, companyId: actor.companyId, status: 'ACTIVE' } });
        if (!schedule) { error('ESCALA_INVALIDA', 'Escala nao encontrada ou inativa.'); break; }
        const current = await this.days.resolveDay(actor.companyId, employee.id, parseDateOnly(startDate));
        if (current.scheduleId === scheduleId) error('MESMA_ESCALA', 'Voce ja esta nesta escala.');
        const weekly = schedule.workDays.length * scheduledMinutes({ entry: schedule.entryTime, exit: schedule.exitTime, lunchStart: schedule.lunchStartTime, lunchReturn: schedule.lunchReturnTime });
        if (weekly > 44 * 60) findings.push({ level: 'warning', code: 'CARGA_SEMANAL', message: `A escala soma ${(weekly / 60).toFixed(1)}h semanais, acima de 44h.` });
        break;
      }
      case 'AJUSTE_BATIDA':
      case 'JUSTIFICATIVA': {
        const { date } = data as { date: string };
        if (date > today) error('DATA_FUTURA', 'So e possivel ajustar ou justificar dias que ja ocorreram.');
        const ageDays = Math.floor((parseDateOnly(today).getTime() - parseDateOnly(date).getTime()) / DAY);
        if (ageDays > policy.adjustmentDeadlineDays) error('PRAZO', `O prazo para solicitar ajustes e de ${policy.adjustmentDeadlineDays} dia(s).`);
        break;
      }
      case 'FOLGA_COMPENSACAO': {
        const { date } = data as { date: string };
        if (date < today) error('DATA_PASSADA', 'Escolha uma data de hoje em diante.');
        const day = await this.days.resolveDay(actor.companyId, employee.id, parseDateOnly(date));
        if (!day.working) error('NAO_E_TRABALHO', 'Voce nao esta escalado nesse dia.');
        const bank = await this.prisma.overtimeBank.findFirst({ where: { companyId: actor.companyId, employeeId: employee.id }, select: { balanceMinutes: true } });
        const needed = scheduledMinutes(day) || 480;
        if ((bank?.balanceMinutes ?? 0) < needed) error('SALDO', `Saldo do banco de horas insuficiente (${Math.floor((bank?.balanceMinutes ?? 0) / 60)}h; necessario ${Math.floor(needed / 60)}h).`);
        const coverage = await this.coverageWarning(actor.companyId, employee, date);
        if (coverage) findings.push(coverage);
        break;
      }
    }

    return { ok: !findings.some((item) => item.level === 'error'), findings, normalized: data, dates };
  }

  // ─── Criação ────────────────────────────────────────────────────
  private async requesterEmployee(actor: JwtUser) {
    this.scope.assertCapability(actor, 'requests.create');
    const employee = await this.scope.employeeOf(actor);
    if (!employee) throw new ForbiddenException('Seu usuario ainda nao esta vinculado a um funcionario. Procure o RH.');
    return employee;
  }

  private async buildSteps(actor: JwtUser, employee: { managerId: string | null }, type: RequestType): Promise<Step[]> {
    const manager = employee.managerId
      ? await this.prisma.employee.findFirst({ where: { id: employee.managerId, companyId: actor.companyId }, select: { userId: true } })
      : null;
    const needsManager = Boolean(manager?.userId) && !HR_ROLES.includes(actor.role) && actor.role !== 'GESTOR';
    if (type === 'NOVA_ESCALA') return needsManager ? [{ step: 'MANAGER', status: 'PENDING' }, { step: 'HR', status: 'PENDING' }] : [{ step: 'HR', status: 'PENDING' }];
    return needsManager ? [{ step: 'MANAGER', status: 'PENDING' }] : [{ step: 'HR', status: 'PENDING' }];
  }

  private async approverUserIds(companyId: string, employee: { managerId: string | null }, step: StepName) {
    if (step === 'HR') return this.notify.hrUserIds(companyId);
    const manager = employee.managerId ? await this.prisma.employee.findFirst({ where: { id: employee.managerId, companyId }, select: { userId: true } }) : null;
    return [manager?.userId, ...(await this.notify.hrUserIds(companyId))];
  }

  async create(actor: JwtUser, dto: CreateRequestDto) {
    const employee = await this.requesterEmployee(actor);
    const check = await this.validate(actor, dto.type, dto.payload, dto.peerEmployeeId);
    if (!check.ok) {
      throw new BadRequestException({ message: check.findings.find((item) => item.level === 'error')!.message, findings: check.findings });
    }
    if (dto.type === 'TROCA_TURNO' && !dto.peerEmployeeId) throw new BadRequestException('Escolha o colega da troca.');
    if (['AJUSTE_BATIDA', 'JUSTIFICATIVA', 'NOVA_ESCALA'].includes(dto.type) && !dto.reason?.trim()) {
      throw new BadRequestException('Informe o motivo da solicitacao.');
    }

    const duplicate = await this.prisma.scheduleRequest.findFirst({
      where: { companyId: actor.companyId, requesterEmployeeId: employee.id, type: dto.type, status: { in: ['PENDING', 'AWAITING_PEER'] }, payload: { equals: check.normalized as any } },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException('Voce ja tem uma solicitacao igual em andamento.');

    const steps = await this.buildSteps(actor, employee, dto.type);
    const created = await this.prisma.scheduleRequest.create({
      data: {
        companyId: actor.companyId,
        requesterEmployeeId: employee.id,
        type: dto.type,
        status: dto.peerEmployeeId ? 'AWAITING_PEER' : 'PENDING',
        payload: check.normalized as any,
        reason: dto.reason?.trim() || null,
        peerEmployeeId: dto.peerEmployeeId ?? null,
        currentStep: steps[0].step,
        steps: steps as any,
        createdByUserId: actor.sub,
      },
    });
    await this.audit(actor, 'SCHEDULE_REQUEST_CREATED', created.id, { type: dto.type });

    if (dto.peerEmployeeId) {
      const peer = await this.prisma.employee.findUnique({ where: { id: dto.peerEmployeeId }, select: { userId: true } });
      await this.notify.notify(actor.companyId, [peer?.userId], 'Pedido de troca de turno', `${employee.name} pediu uma troca de turno com voce. Responda em Escalas > Solicitacoes.`, '/dashboard/escalas?view=solicitacoes');
    } else {
      await this.notify.notify(actor.companyId, await this.approverUserIds(actor.companyId, employee, steps[0].step), `${REQUEST_TYPE_LABEL[dto.type]} pendente`, `${employee.name} enviou uma solicitacao para aprovacao.`, '/dashboard/escalas?view=aprovacoes');
    }
    return { ...created, warnings: check.findings.filter((item) => item.level === 'warning') };
  }

  // ─── Consulta ───────────────────────────────────────────────────
  private async decorate(actor: JwtUser, rows: any[]) {
    const me = await this.scope.employeeOf(actor);
    const employeeIds = [...new Set(rows.flatMap((row) => [row.requesterEmployeeId, row.peerEmployeeId].filter(Boolean)))] as string[];
    const people = await this.prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, name: true, managerId: true, department: true, userId: true } });
    const byId = new Map(people.map((person) => [person.id, person]));
    return rows.map((row) => {
      const requester = byId.get(row.requesterEmployeeId);
      const peer = row.peerEmployeeId ? byId.get(row.peerEmployeeId) : null;
      return {
        id: row.id,
        type: row.type,
        typeLabel: REQUEST_TYPE_LABEL[row.type as RequestType],
        status: row.status,
        payload: row.payload,
        reason: row.reason,
        currentStep: row.currentStep,
        steps: row.steps,
        decisionNote: row.decisionNote,
        decidedAt: row.decidedAt,
        createdAt: row.createdAt,
        requester: requester ? { id: requester.id, name: requester.name, department: requester.department } : null,
        peer: peer ? { id: peer.id, name: peer.name } : null,
        peerAcceptedAt: row.peerAcceptedAt,
        mine: me?.id === row.requesterEmployeeId,
        canCancel: me?.id === row.requesterEmployeeId && ['PENDING', 'AWAITING_PEER'].includes(row.status),
        canRespondPeer: me?.id === row.peerEmployeeId && row.status === 'AWAITING_PEER',
        canDecide: row.status === 'PENDING' && this.eligible(actor, me?.id ?? null, requester ?? null, row.currentStep),
      };
    });
  }

  private eligible(actor: JwtUser, myEmployeeId: string | null, requester: { id: string; managerId: string | null; userId: string | null } | null, step: string | null) {
    if (!requester || !scopeOf(actor.role, 'approvals')) return false;
    if (requester.userId === actor.sub) return false;
    if (HR_ROLES.includes(actor.role)) return true;
    return step === 'MANAGER' && actor.role === 'GESTOR' && Boolean(myEmployeeId) && requester.managerId === myEmployeeId;
  }

  async list(actor: JwtUser, filters: { status?: string; type?: string; view?: string }) {
    const me = await this.scope.employeeOf(actor);
    const hasApprovals = Boolean(scopeOf(actor.role, 'approvals'));
    if (!scopeOf(actor.role, 'requests.create') && !hasApprovals) throw new ForbiddenException('Seu perfil nao tem acesso a solicitacoes.');

    const where: any = { companyId: actor.companyId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    const company = scopeOf(actor.role, 'approvals') === 'company';
    if (!company) {
      const team = hasApprovals && me ? (await this.prisma.employee.findMany({ where: { companyId: actor.companyId, managerId: me.id }, select: { id: true } })).map((item) => item.id) : [];
      const visible = [...(me ? [me.id] : []), ...team];
      where.OR = [{ requesterEmployeeId: { in: visible } }, ...(me ? [{ peerEmployeeId: me.id }] : [])];
    }
    if (filters.view === 'mine' && me) {
      where.OR = [{ requesterEmployeeId: me.id }, { peerEmployeeId: me.id }];
    }

    const rows = await this.prisma.scheduleRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 });
    let items = await this.decorate(actor, rows);
    if (filters.view === 'approvals') items = items.filter((item) => item.canDecide);
    return items;
  }

  async get(actor: JwtUser, id: string) {
    const row = await this.prisma.scheduleRequest.findFirst({ where: { id, companyId: actor.companyId } });
    if (!row) throw new NotFoundException('Solicitacao nao encontrada.');
    const [item] = await this.decorate(actor, [row]);
    const me = await this.scope.employeeOf(actor);
    const allowed = item.mine || me?.id === row.peerEmployeeId || item.canDecide || scopeOf(actor.role, 'approvals') === 'company';
    if (!allowed) {
      const team = me ? await this.prisma.employee.count({ where: { id: row.requesterEmployeeId, managerId: me.id } }) : 0;
      if (!team) throw new ForbiddenException('Voce nao tem acesso a esta solicitacao.');
    }
    return item;
  }

  // ─── Decisão ────────────────────────────────────────────────────
  async respondAsPeer(actor: JwtUser, id: string, dto: PeerResponseDto) {
    const me = await this.requesterEmployee(actor);
    const row = await this.prisma.scheduleRequest.findFirst({ where: { id, companyId: actor.companyId } });
    if (!row || row.peerEmployeeId !== me.id) throw new NotFoundException('Solicitacao nao encontrada.');
    if (row.status !== 'AWAITING_PEER') throw new BadRequestException('Esta solicitacao nao aguarda sua resposta.');
    const requester = await this.prisma.employee.findUnique({ where: { id: row.requesterEmployeeId }, select: { id: true, userId: true, managerId: true, name: true } });

    if (dto.action === 'DECLINE') {
      await this.prisma.scheduleRequest.update({ where: { id }, data: { status: 'REJECTED', decisionNote: dto.note?.trim() || 'Colega recusou a troca.', decidedAt: new Date() } });
      await this.audit(actor, 'SCHEDULE_REQUEST_PEER_DECLINED', id);
      await this.notify.notify(actor.companyId, [requester?.userId], 'Troca recusada pelo colega', `${me.name} recusou a troca de turno.`, '/dashboard/escalas?view=solicitacoes');
      return { id, status: 'REJECTED' };
    }

    const recheck = await this.recheckPeerSwap(actor, row);
    if (recheck) throw new BadRequestException(recheck);
    await this.prisma.scheduleRequest.update({ where: { id }, data: { status: 'PENDING', peerAcceptedAt: new Date() } });
    await this.audit(actor, 'SCHEDULE_REQUEST_PEER_ACCEPTED', id);
    if (requester) await this.notify.notify(actor.companyId, await this.approverUserIds(actor.companyId, requester, (row.currentStep as StepName) ?? 'HR'), 'Troca de turno aguardando aprovacao', `${requester.name} e ${me.name} combinaram uma troca de turno.`, '/dashboard/escalas?view=aprovacoes');
    return { id, status: 'PENDING' };
  }

  private async recheckPeerSwap(actor: JwtUser, row: { payload: any; requesterEmployeeId: string }) {
    const date = row.payload?.date as string | undefined;
    if (!date) return null;
    const today = dateKey(toDateOnly(new Date()));
    if (date < today) return 'A data da troca ja passou.';
    return null;
  }

  private async decideOne(actor: JwtUser, id: string, dto: { action: 'APPROVE' | 'REJECT'; note?: string }) {
    const row = await this.prisma.scheduleRequest.findFirst({ where: { id, companyId: actor.companyId } });
    if (!row) throw new NotFoundException('Solicitacao nao encontrada.');
    if (row.status !== 'PENDING') throw new BadRequestException('Esta solicitacao ja foi decidida ou aguarda o colega.');
    const requester = await this.prisma.employee.findUnique({ where: { id: row.requesterEmployeeId }, select: { id: true, name: true, userId: true, managerId: true, department: true } });
    const me = await this.scope.employeeOf(actor);
    if (!this.eligible(actor, me?.id ?? null, requester, row.currentStep)) throw new ForbiddenException('Voce nao pode decidir esta solicitacao.');
    if (dto.action === 'REJECT' && !dto.note?.trim()) throw new BadRequestException('Informe o motivo da reprovacao.');

    const steps = (row.steps as unknown as Step[]).map((step) => ({ ...step }));
    const index = steps.findIndex((step) => step.status === 'PENDING');
    const stamp = { byUserId: actor.sub, byName: actor.name ?? actor.email, at: new Date().toISOString(), note: dto.note?.trim() || undefined };

    if (dto.action === 'REJECT') {
      steps[index] = { ...steps[index], status: 'REJECTED', ...stamp };
      await this.prisma.scheduleRequest.update({ where: { id }, data: { status: 'REJECTED', steps: steps as any, decidedByUserId: actor.sub, decidedAt: new Date(), decisionNote: dto.note!.trim(), currentStep: null } });
      await this.audit(actor, 'SCHEDULE_REQUEST_REJECTED', id, { note: dto.note });
      await this.notify.notify(actor.companyId, [requester?.userId, ...(row.peerEmployeeId ? [(await this.prisma.employee.findUnique({ where: { id: row.peerEmployeeId }, select: { userId: true } }))?.userId] : [])], `${REQUEST_TYPE_LABEL[row.type as RequestType]} reprovada`, `Motivo: ${dto.note!.trim()}`, '/dashboard/escalas?view=solicitacoes', true);
      return { id, status: 'REJECTED' as const };
    }

    steps[index] = { ...steps[index], status: 'APPROVED', ...stamp };
    const next = steps.find((step) => step.status === 'PENDING');
    if (next) {
      await this.prisma.scheduleRequest.update({ where: { id }, data: { steps: steps as any, currentStep: next.step } });
      await this.audit(actor, 'SCHEDULE_REQUEST_STEP_APPROVED', id, { step: steps[index].step });
      if (requester) await this.notify.notify(actor.companyId, await this.approverUserIds(actor.companyId, requester, next.step), `${REQUEST_TYPE_LABEL[row.type as RequestType]} aguardando RH`, `${requester.name}: etapa do gestor aprovada.`, '/dashboard/escalas?view=aprovacoes');
      return { id, status: 'PENDING' as const, currentStep: next.step };
    }

    await this.applyEffects(actor, row);
    await this.prisma.scheduleRequest.update({ where: { id }, data: { status: 'APPROVED', steps: steps as any, decidedByUserId: actor.sub, decidedAt: new Date(), decisionNote: dto.note?.trim() || null, appliedAt: new Date(), currentStep: null } });
    await this.audit(actor, 'SCHEDULE_REQUEST_APPROVED', id);
    const peerUser = row.peerEmployeeId ? (await this.prisma.employee.findUnique({ where: { id: row.peerEmployeeId }, select: { userId: true } }))?.userId : null;
    await this.notify.notify(actor.companyId, [requester?.userId, peerUser], `${REQUEST_TYPE_LABEL[row.type as RequestType]} aprovada`, 'Sua escala ja foi atualizada.', '/dashboard/escalas');
    return { id, status: 'APPROVED' as const };
  }

  decide(actor: JwtUser, id: string, dto: DecideRequestDto) {
    return this.decideOne(actor, id, dto);
  }

  async bulkDecide(actor: JwtUser, dto: BulkDecideDto) {
    const results: { id: string; ok: boolean; message?: string; status?: string }[] = [];
    for (const id of dto.ids) {
      try {
        const result = await this.decideOne(actor, id, dto);
        results.push({ id, ok: true, status: result.status });
      } catch (error: any) {
        results.push({ id, ok: false, message: error?.response?.message ?? error?.message ?? 'Falha' });
      }
    }
    return { results, approved: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok).length };
  }

  async cancel(actor: JwtUser, id: string) {
    const me = await this.requesterEmployee(actor);
    const result = await this.prisma.scheduleRequest.updateMany({
      where: { id, companyId: actor.companyId, requesterEmployeeId: me.id, status: { in: ['PENDING', 'AWAITING_PEER'] } },
      data: { status: 'CANCELLED', currentStep: null, decidedAt: new Date() },
    });
    if (!result.count) throw new BadRequestException('Nao e possivel cancelar esta solicitacao.');
    await this.audit(actor, 'SCHEDULE_REQUEST_CANCELLED', id);
    return { id, status: 'CANCELLED' };
  }

  // ─── Efeitos ────────────────────────────────────────────────────
  private async replaceDayOverride(tx: any, companyId: string, employeeId: string, date: string, data: { exceptionType: string; reason: string; altEntryTime?: string | null; altExitTime?: string | null; userId: string }) {
    const when = parseDateOnly(date);
    await tx.scheduleException.deleteMany({ where: { companyId, employeeId, date: when, exceptionType: { in: ['FOLGA', 'COMPENSACAO', 'AJUSTE_ESCALA'] } } });
    await tx.scheduleException.create({
      data: { companyId, employeeId, date: when, exceptionType: data.exceptionType, reason: data.reason, altEntryTime: data.altEntryTime ?? null, altExitTime: data.altExitTime ?? null, createdByUserId: data.userId },
    });
  }

  private isoAt(date: string, hhmm: string) {
    return `${date}T${hhmm}:00-03:00`;
  }

  private async applyEffects(approver: JwtUser, row: any) {
    const payload = row.payload as Record<string, any>;
    const companyId = approver.companyId;
    const employeeId = row.requesterEmployeeId as string;
    const asAdmin: JwtUser = { ...approver, role: 'ADMIN' };
    const label = `Solicitacao ${String(row.id).slice(0, 8)} (${REQUEST_TYPE_LABEL[row.type as RequestType]})`;

    switch (row.type as RequestType) {
      case 'TROCA_FOLGA': {
        const work = await this.days.resolveDay(companyId, employeeId, parseDateOnly(payload.offDate));
        await this.prisma.$transaction(async (tx) => {
          await this.replaceDayOverride(tx, companyId, employeeId, payload.offDate, { exceptionType: 'FOLGA', reason: label, userId: approver.sub });
          await this.replaceDayOverride(tx, companyId, employeeId, payload.workDate, { exceptionType: 'COMPENSACAO', reason: label, altEntryTime: work.entry, altExitTime: work.exit, userId: approver.sub });
        });
        return;
      }
      case 'TROCA_TURNO': {
        const date = parseDateOnly(payload.date);
        const [mine, theirs] = await Promise.all([
          this.days.resolveDay(companyId, employeeId, date),
          this.days.resolveDay(companyId, row.peerEmployeeId, date),
        ]);
        await this.prisma.$transaction(async (tx) => {
          const give = async (target: string, source: ResolvedDay) =>
            this.replaceDayOverride(tx, companyId, target, payload.date, source.working
              ? { exceptionType: 'COMPENSACAO', reason: label, altEntryTime: source.entry, altExitTime: source.exit, userId: approver.sub }
              : { exceptionType: 'FOLGA', reason: label, userId: approver.sub });
          await give(employeeId, theirs);
          await give(row.peerEmployeeId, mine);
        });
        return;
      }
      case 'NOVA_ESCALA': {
        const start = parseDateOnly(payload.startDate);
        const dayBefore = new Date(start.getTime() - DAY);
        await this.prisma.$transaction(async (tx) => {
          await tx.userSchedule.deleteMany({ where: { companyId, employeeId, startDate: { gte: start } } });
          await tx.userSchedule.updateMany({ where: { companyId, employeeId, startDate: { lt: start }, OR: [{ endDate: null }, { endDate: { gte: start } }] }, data: { endDate: dayBefore } });
          await tx.userSchedule.create({ data: { companyId, employeeId, scheduleId: payload.scheduleId, startDate: start, endDate: null, assignedByUserId: approver.sub } });
        });
        return;
      }
      case 'AJUSTE_BATIDA': {
        const date: string = payload.date;
        const current = await this.prisma.timeTrack.findFirst({ where: { companyId, employeeId, date: parseDateOnly(date) } });
        const pick = (field: 'entry' | 'lunchStart' | 'lunchReturn' | 'exit') =>
          payload[field] ? this.isoAt(date, payload[field]) : (current?.[field] ? current[field]!.toISOString() : null);
        await this.timeTrack.manual(companyId, asAdmin, {
          employeeId, date, entry: pick('entry'), lunchStart: pick('lunchStart'), lunchReturn: pick('lunchReturn'), exit: pick('exit'),
          reason: 'ajuste_erro_marcacao', observation: `${label}: ${row.reason ?? ''}`.trim(),
        } as any);
        const track = await this.prisma.timeTrack.findFirst({ where: { companyId, employeeId, date: parseDateOnly(date) } });
        if (track?.manualStatus === 'pending') await this.timeTrack.approveManual(companyId, asAdmin, track.id, true);
        const fields: [string, string][] = [['entry', 'ENTRY'], ['lunchStart', 'LUNCH_START'], ['lunchReturn', 'LUNCH_RETURN'], ['exit', 'EXIT']];
        for (const [field, type] of fields) {
          if (!payload[field]) continue;
          const occurredAt = new Date(this.isoAt(date, payload[field]));
          await this.prisma.punchEvent.create({
            data: {
              companyId, employeeId, timeTrackId: track?.id ?? null, occurredAt, workDate: parseDateOnly(date), type, origin: 'AJUSTE',
              flags: ['AJUSTE_APROVADO'], justification: row.reason ?? null,
              receipt: punchReceipt({ companyId, employeeId, occurredAt, type, nonce: randomUUID() }),
            },
          });
        }
        return;
      }
      case 'JUSTIFICATIVA': {
        const type = payload.kind === 'ATRASO' ? 'LATE_ARRIVAL' : payload.kind === 'ATESTADO' ? 'MEDICAL_CERTIFICATE' : 'JUSTIFIED_ABSENCE';
        await this.prisma.$transaction(async (tx) => {
          await tx.timeOccurrence.create({
            data: { companyId, employeeId, type: type as any, date: parseDateOnly(payload.date), minutes: payload.minutes ?? 0, reason: row.reason, status: 'APPROVED', createdByUserId: row.createdByUserId, approvedByUserId: approver.sub, approvedAt: new Date() },
          });
          if (payload.kind === 'ATESTADO') {
            await tx.scheduleException.upsert({
              where: { employeeId_date_exceptionType: { employeeId, date: parseDateOnly(payload.date), exceptionType: 'ATESTADO' } },
              create: { companyId, employeeId, date: parseDateOnly(payload.date), exceptionType: 'ATESTADO', reason: label, createdByUserId: approver.sub },
              update: { reason: label },
            });
          }
        });
        return;
      }
      case 'FOLGA_COMPENSACAO': {
        await this.timeTrack.manual(companyId, asAdmin, { employeeId, date: payload.date, reason: 'ajuste_abono_folga', observation: label } as any);
        const track = await this.prisma.timeTrack.findFirst({ where: { companyId, employeeId, date: parseDateOnly(payload.date) } });
        if (track?.manualStatus === 'pending') await this.timeTrack.approveManual(companyId, asAdmin, track.id, true);
        await this.prisma.$transaction(async (tx) => this.replaceDayOverride(tx, companyId, employeeId, payload.date, { exceptionType: 'FOLGA', reason: label, userId: approver.sub }));
        return;
      }
    }
  }

  private audit(actor: JwtUser, action: string, entityId: string, metadata?: Record<string, unknown>) {
    return this.prisma.auditLog.create({ data: { companyId: actor.companyId, userId: actor.sub, action, entity: 'ScheduleRequest', entityId, metadata: (metadata ?? {}) as any } });
  }
}
