import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleService } from '../../../apps/api/src/modules/schedule/schedule.service';

const rh = { sub: 'rh-1', role: 'RH', companyId: 'company-a', email: 'rh@example.test' } as any;
const employeeActor = { sub: 'user-employee', role: 'FUNCIONARIO', companyId: 'company-a' } as any;
const manager = { sub: 'manager-user', role: 'GESTOR', companyId: 'company-a' } as any;
const schedule = { id: 'schedule-1', companyId: 'company-a', name: '5x2', workDays: [1, 2, 3, 4, 5], restDays: [0, 6], entryTime: '09:00', lunchStartTime: '12:00', lunchReturnTime: '13:00', exitTime: '18:00' };

function harness(overrides: Record<string, any> = {}) {
  const defaults: any = {
    schedule: { findMany: vi.fn().mockResolvedValue([schedule]), findFirst: vi.fn().mockResolvedValue(schedule), create: vi.fn().mockResolvedValue(schedule), update: vi.fn().mockResolvedValue(schedule) },
    employee: { findFirst: vi.fn().mockResolvedValue({ id: 'emp-1', userId: employeeActor.sub, name: 'Ana', managerId: null }), findMany: vi.fn().mockResolvedValue([{ id: 'emp-1', name: 'Ana', department: 'Operacoes' }]) },
    userSchedule: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), updateMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    scheduleException: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn().mockResolvedValue({ id: 'exception-1' }), deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    holiday: { findMany: vi.fn().mockResolvedValue([]) },
    timeTrack: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    timeClosing: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 'audit-1', userId: 'rh-1', metadata: {}, createdAt: new Date() }) },
    $transaction: vi.fn(async (fn: any) => fn(prisma)),
  };
  // Sobrescrita por metodo: um mock parcial de 'schedule' nao pode apagar findMany/update dos demais.
  const prisma: any = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    prisma[key] = value && typeof value === 'object' && defaults[key] && typeof defaults[key] === 'object' ? { ...defaults[key], ...value } : value;
  }
  return { service: new ScheduleService(prisma), prisma };
}

describe('QA ESCALA · templates, permissões, calendários e governança', () => {
  it('lista e consulta templates apenas dentro da empresa', async () => {
    const { service, prisma } = harness({ schedule: { findFirst: vi.fn(async ({ where }: any) => where.companyId === 'company-a' ? schedule : null) } });
    await expect(service.listSchedules('company-a')).resolves.toEqual([schedule]);
    expect(prisma.schedule.findMany).toHaveBeenCalledWith({ where: { companyId: 'company-a' }, orderBy: { createdAt: 'desc' } });
    await expect(service.getSchedule('company-b', schedule.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each(['FUNCIONARIO', 'GESTOR', 'CONSULTA', 'CONTABIL', 'COMERCIAL'] as const)('%s não pode criar, editar nem arquivar templates', async (role) => {
    const { service, prisma } = harness();
    const actor = { ...rh, role };
    await expect(service.createSchedule('company-a', actor, { name: 'X' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updateSchedule('company-a', actor, 'schedule-1', { name: 'X' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.archiveSchedule('company-a', actor, 'schedule-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.schedule.create).not.toHaveBeenCalled();
    expect(prisma.schedule.update).not.toHaveBeenCalled();
  });

  it.each(['RH', 'ADMIN', 'DEV'])('%s pode criar template e recebe padrões de dias úteis e folga', async (role) => {
    const { service, prisma } = harness();
    await service.createSchedule('company-a', { ...rh, role }, { name: 'Comercial' } as any);
    expect(prisma.schedule.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: 'company-a', workDays: [1, 2, 3, 4, 5], restDays: [0, 6] }) }));
  });

  it('não permite editar ou arquivar template de outra empresa', async () => {
    const { service, prisma } = harness({ schedule: { findFirst: vi.fn().mockResolvedValue(null) } });
    await expect(service.updateSchedule('company-a', rh, 'foreign-id', { name: 'alterado' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.archiveSchedule('company-a', rh, 'foreign-id')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.schedule.update).not.toHaveBeenCalled();
  });

  it.each(['2026-00', '2026-13', '26-01', '2026-1', 'texto', ''])('rejeita mês inválido: %s', async (month) => {
    const { service } = harness();
    await expect(service.getCalendar('company-a', rh, 'emp-1', month)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retorna exatamente os dias do mês, inclusive fevereiro bissexto', async () => {
    const { service } = harness({ employee: { findFirst: vi.fn().mockResolvedValue({ id: 'emp-1', name: 'Ana' }) } });
    const result = await service.getCalendar('company-a', rh, 'emp-1', '2024-02');
    expect(result.days).toHaveLength(29);
    expect(result.days[0].date).toBe('2024-02-01');
    expect(result.days[28].date).toBe('2024-02-29');
  });

  it('funcionário não consulta calendário de outro funcionário, mesmo da mesma empresa', async () => {
    const { service, prisma } = harness({ employee: { findFirst: vi.fn().mockResolvedValueOnce({ id: 'target', name: 'Alvo' }).mockResolvedValueOnce({ id: 'self', userId: employeeActor.sub }) } });
    await expect(service.getCalendar('company-a', employeeActor, 'target', '2026-06')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.timeTrack.findMany).not.toHaveBeenCalled();
  });

  it('funcionário acessa o próprio calendário e dados privados de ponto continuam disponíveis para si', async () => {
    const privateTrack = { date: new Date('2026-06-01T00:00:00Z'), observation: 'dado próprio', latitude: -23, longitude: -46 };
    const { service } = harness({ employee: { findFirst: vi.fn().mockResolvedValue({ id: 'emp-1', name: 'Ana', userId: employeeActor.sub }) }, timeTrack: { findMany: vi.fn().mockResolvedValue([privateTrack]) } });
    const result = await service.getCalendar('company-a', employeeActor, 'emp-1', '2026-06');
    expect(result.days[0].actual.observation).toBe('dado próprio');
    expect(result.days[0].actual.latitude).toBe(-23);
  });

  it('gestor não consulta funcionário fora da própria equipe', async () => {
    const { service, prisma } = harness({ employee: { findFirst: vi.fn().mockResolvedValueOnce({ id: 'target', name: 'Alvo' }).mockResolvedValueOnce({ id: 'boss', userId: manager.sub }) } });
    await expect(service.getCalendar('company-a', manager, 'target', '2026-06')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.timeTrack.findMany).not.toHaveBeenCalled();
  });

  it('omite observação, justificativa e coordenadas de ponto para gestor', async () => {
    const privateTrack = { date: new Date('2026-06-01T00:00:00Z'), observation: 'privado', manualReason: 'privado', latitude: -23, longitude: -46, entry: new Date('2026-06-01T12:00:00Z') };
    const { service } = harness({ employee: { findFirst: vi.fn().mockResolvedValue({ id: 'emp-1', name: 'Ana', managerId: 'boss' }) }, timeTrack: { findMany: vi.fn().mockResolvedValue([privateTrack]) } });
    const result = await service.getCalendar('company-a', manager, 'emp-1', '2026-06');
    expect(result.days[0].actual).not.toHaveProperty('observation');
    expect(result.days[0].actual).not.toHaveProperty('manualReason');
    expect(result.days[0].actual).not.toHaveProperty('latitude');
    expect(result.days[0].actual.entry).toEqual(privateTrack.entry);
  });

  it.each(['FUNCIONARIO', 'CONSULTA', 'CONTABIL', 'COMERCIAL'])('%s não pode ler calendário de equipe', async (role) => {
    const { service } = harness();
    await expect(service.getTeamSchedule('company-a', { ...rh, role }, '2026-06')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('não cria exceção para funcionário de outra empresa', async () => {
    const { service, prisma } = harness({ employee: { findFirst: vi.fn().mockResolvedValue(null) } });
    await expect(service.createException('company-a', rh, { employeeId: 'foreign', date: '2026-06-01', exceptionType: 'FOLGA' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.scheduleException.upsert).not.toHaveBeenCalled();
  });

  it.each(['FUNCIONARIO', 'GESTOR', 'CONSULTA'])('%s não cria nem apaga exceção', async (role) => {
    const { service, prisma } = harness();
    await expect(service.createException('company-a', { ...rh, role }, { employeeId: 'emp-1', date: '2026-06-01', exceptionType: 'FOLGA' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteException('company-a', { ...rh, role }, 'exception-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.scheduleException.upsert).not.toHaveBeenCalled();
    expect(prisma.scheduleException.deleteMany).not.toHaveBeenCalled();
  });

  it('limita exclusão de exceção ao tenant', async () => {
    const { service, prisma } = harness();
    await service.deleteException('company-a', rh, 'exception-1');
    expect(prisma.scheduleException.deleteMany).toHaveBeenCalledWith({ where: { id: 'exception-1', companyId: 'company-a' } });
  });

  it('preview de atribuição não grava alterações', async () => {
    const { service, prisma } = harness();
    const preview = await service.previewAssignment('company-a', rh, { employeeIds: ['emp-1'], scheduleId: 'schedule-1', startDate: '2026-07-01' } as any);
    expect(preview.canApply).toBe(true);
    expect(prisma.userSchedule.createMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([
    { employeeIds: [], scheduleId: 'schedule-1', startDate: '2026-07-01' },
    { employeeIds: ['foreign-employee'], scheduleId: 'schedule-1', startDate: '2026-07-01' },
    { employeeIds: ['emp-1'], scheduleId: 'schedule-1', startDate: 'not-a-date' },
    { employeeIds: ['emp-1'], scheduleId: 'schedule-1', startDate: '2026-07-10', endDate: '2026-07-09' },
  ])('bloqueia atribuição inválida sem gravar: %#', async (input) => {
    const { service, prisma } = harness({
      schedule: { findFirst: vi.fn().mockResolvedValue(input.scheduleId === 'missing' ? null : schedule) },
      employee: { findMany: vi.fn().mockResolvedValue(input.employeeIds[0] === 'foreign-employee' ? [] : [{ id: 'emp-1', name: 'Ana', department: 'Operacoes' }]) },
    });
    await expect(service.assignSchedule('company-a', rh, input as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.userSchedule.createMany).not.toHaveBeenCalled();
  });

  it('escala inexistente (ou de outra empresa) na atribuição responde 404 e não grava', async () => {
    const { service, prisma } = harness({ schedule: { findFirst: vi.fn().mockResolvedValue(null) } });
    await expect(service.assignSchedule('company-a', rh, { employeeIds: ['emp-1'], scheduleId: 'missing', startDate: '2026-07-01' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.userSchedule.createMany).not.toHaveBeenCalled();
  });
  it('remove IDs duplicados antes de aplicar atribuição e audita tenant e operador', async () => {
    const { service, prisma } = harness();
    const result = await service.assignSchedule('company-a', rh, { employeeIds: ['emp-1', 'emp-1'], scheduleId: 'schedule-1', startDate: '2026-07-01', endDate: '2026-07-31' } as any);
    expect(result.count).toBe(1);
    expect(prisma.userSchedule.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ companyId: 'company-a', employeeId: 'emp-1', assignedByUserId: 'rh-1' })] });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: 'company-a', userId: 'rh-1', action: 'SCHEDULE_ASSIGNMENT_APPLIED' }) }));
  });

  it('não permite atribuir para usuário sem perfil de escrita', async () => {
    const { service, prisma } = harness();
    await expect(service.assignSchedule('company-a', employeeActor, { employeeIds: ['emp-1'], scheduleId: 'schedule-1', startDate: '2026-07-01' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.previewAssignment('company-a', employeeActor, { employeeIds: ['emp-1'], scheduleId: 'schedule-1', startDate: '2026-07-01' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('histórico limita o máximo de resultados e filtra empregado sem expor tenant alheio', async () => {
    const { service, prisma } = harness();
    await service.history('company-a', rh, undefined, '99999');
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: 'company-a' }), take: 200 }));
  });

  it('nega histórico e governança para funcionário', async () => {
    const { service } = harness();
    await expect(service.history('company-a', employeeActor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getCoverageConfig('company-a', employeeActor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejeita regras de cobertura sem setor e setores duplicados ignorando caixa', async () => {
    const { service, prisma } = harness();
    await expect(service.updateCoverageConfig('company-a', rh, { rules: [{ department: '  ', minimumEmployees: 1 }] } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateCoverageConfig('company-a', rh, { rules: [{ department: 'Loja', minimumEmployees: 1 }, { department: ' loja ', minimumEmployees: 2 }] } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('normaliza regras de cobertura e remove dias repetidos', async () => {
    const { service, prisma } = harness();
    const result = await service.updateCoverageConfig('company-a', rh, { rules: [{ department: ' Operações ', minimumEmployees: 2, daysOfWeek: [1, 1, 5] }] } as any);
    expect(result.rules).toEqual([{ department: 'Operações', minimumEmployees: 2, daysOfWeek: [1, 5] }]);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: 'company-a' }) }));
  });
});
