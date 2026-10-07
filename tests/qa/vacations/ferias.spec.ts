import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { VacationsService } from '../../../apps/api/src/modules/vacations/vacations.service';

const rh = { sub: 'rh-1', role: 'RH', companyId: 'company-a', email: 'rh@example.test' } as any;
const admin = { ...rh, sub: 'admin-1', role: 'ADMIN' } as any;
const dev = { ...rh, sub: 'dev-1', role: 'DEV' } as any;
const consulta = { ...rh, sub: 'consulta-1', role: 'CONSULTA' } as any;
const employee = { ...rh, sub: 'employee-user', role: 'FUNCIONARIO', email: 'ana@example.test' } as any;
const manager = { ...rh, sub: 'manager-user', role: 'GESTOR', email: 'boss@example.test' } as any;
const employeeRow = { id: 'employee-1', companyId: 'company-a', userId: employee.sub, email: employee.email, managerId: null, admissionDate: new Date('2024-01-15T00:00:00.000Z'), workScale: '5X2' };
const vacation = { id: 'vacation-1', employeeId: employeeRow.id, status: 'PENDING', daysUsed: 10, soldDays: 0, employee: employeeRow };

function harness(overrides: Record<string, any> = {}, receiptOverrides: Record<string, any> = {}) {
  const repository: any = {
    list: vi.fn().mockResolvedValue([]), listForManager: vi.fn().mockResolvedValue([]), listForEmployee: vi.fn().mockResolvedValue([]),
    listByEmployee: vi.fn().mockResolvedValue([]), listEntitlements: vi.fn().mockResolvedValue([]),
    findEmployee: vi.fn().mockResolvedValue(employeeRow), findEmployeeByUserId: vi.fn().mockResolvedValue(employeeRow),
    findOverlapping: vi.fn().mockResolvedValue(null), listTimeTracksInPeriod: vi.fn().mockResolvedValue([]), findEntitlement: vi.fn().mockResolvedValue(null),
    reserveAndCreate: vi.fn().mockResolvedValue(vacation), findById: vi.fn().mockResolvedValue(vacation),
    updateStatusWithLedger: vi.fn().mockResolvedValue({ ...vacation, status: 'APPROVED' }), recordPayment: vi.fn().mockResolvedValue({ id: 'payment-1' }),
    listMedicalCertificates: vi.fn().mockResolvedValue([]), createMedicalCertificate: vi.fn().mockResolvedValue({ id: 'certificate-1' }),
    findMedicalCertificate: vi.fn().mockResolvedValue({ id: 'certificate-1', status: 'PENDING' }), updateMedicalCertificateStatus: vi.fn().mockResolvedValue({ count: 1 }),
    ...overrides,
  };
  const receiptService: any = { generate: vi.fn().mockResolvedValue({ buffer: Buffer.from('fake-pdf'), filename: 'receipt.pdf' }), ...receiptOverrides };
  return { service: new VacationsService(repository, receiptService), repository, receiptService };
}

const createDto = (overrides: Record<string, unknown> = {}) => ({ employeeId: employeeRow.id, acquisitionPeriod: '2025/2026', startDate: '2026-07-01', endDate: '2026-07-10', daysUsed: 10, ...overrides }) as any;

describe('QA FÉRIAS · fluxos funcionais, regras e segurança', () => {
  it('roteia listagem ao escopo correto para cada perfil', async () => {
    const { service, repository } = harness();
    await service.list('company-a', admin);
    await service.list('company-a', rh);
    await service.list('company-a', dev);
    await service.list('company-a', consulta);
    await service.list('company-a', manager);
    await service.list('company-a', employee);
    expect(repository.list).toHaveBeenCalledTimes(4);
    expect(repository.listForManager).toHaveBeenCalledWith('company-a', manager.sub, manager.email);
    expect(repository.listForEmployee).toHaveBeenCalledWith('company-a', employee.sub, employee.email);
  });

  it('consulta férias e saldo somente após validar acesso ao colaborador', async () => {
    const { service, repository } = harness();
    await service.listByEmployee('company-a', rh, employeeRow.id);
    await service.listEntitlements('company-a', rh, employeeRow.id);
    expect(repository.listByEmployee).toHaveBeenCalledWith('company-a', employeeRow.id);
    expect(repository.listEntitlements).toHaveBeenCalledWith('company-a', employeeRow.id);
  });

  it('bloqueia tentativa de funcionário consultar saldo e férias de outro colaborador', async () => {
    const other = { ...employeeRow, id: 'other-employee', userId: 'other-user', managerId: null };
    const { service, repository } = harness({ findEmployee: vi.fn().mockResolvedValue(other), findEmployeeByUserId: vi.fn().mockResolvedValue(employeeRow) });
    await expect(service.listByEmployee('company-a', employee, other.id)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.listEntitlements('company-a', employee, other.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.listByEmployee).not.toHaveBeenCalled();
    expect(repository.listEntitlements).not.toHaveBeenCalled();
  });

  it('bloqueia colaborador inexistente ou de outro tenant antes de consultar dados', async () => {
    const { service, repository } = harness({ findEmployee: vi.fn().mockResolvedValue(null) });
    await expect(service.listEntitlements('company-a', rh, 'foreign-id')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.listEntitlements).not.toHaveBeenCalled();
  });

  it.each(['FUNCIONARIO', 'GESTOR', 'CONSULTA'])('%s não aprova nem nega solicitações', async (role) => {
    const { service, repository } = harness();
    await expect(service.updateStatus('company-a', { ...rh, role }, vacation.id, { status: 'APPROVED' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.updateStatusWithLedger).not.toHaveBeenCalled();
  });

  it.each(['RH', 'ADMIN', 'DEV'])('%s pode aprovar solicitação e registra operador', async (role) => {
    const { service, repository } = harness();
    await service.updateStatus('company-a', { ...rh, role }, vacation.id, { status: 'APPROVED', observation: 'Conferido' } as any);
    expect(repository.updateStatusWithLedger).toHaveBeenCalledWith('company-a', vacation.id, 'APPROVED', 'Conferido', rh.sub);
  });

  it('bloqueia transições inválidas de status e não altera ledger', async () => {
    const { service, repository } = harness({ findById: vi.fn().mockResolvedValue({ ...vacation, status: 'REJECTED' }) });
    await expect(service.updateStatus('company-a', rh, vacation.id, { status: 'APPROVED' } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateStatusWithLedger).not.toHaveBeenCalled();
  });

  it('não encontra solicitação de férias em tenant diferente', async () => {
    const { service, repository } = harness({ findById: vi.fn().mockResolvedValue(null) });
    await expect(service.updateStatus('company-a', rh, 'foreign-vacation', { status: 'APPROVED' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.updateStatusWithLedger).not.toHaveBeenCalled();
  });

  it.each([
    { startDate: 'invalid', endDate: '2026-07-10' },
    { startDate: '2026-07-10', endDate: '2026-07-01' },
    { startDate: '2026-07-01', endDate: '2026-08-01' },
    { startDate: '2026-07-01', endDate: '2026-07-10', daysUsed: 31 },
    { startDate: '2026-07-01', endDate: '2026-07-10', daysUsed: 0 },
  ])('rejeita período ou quantidade de dias inválidos sem reservar saldo: %#', async (input) => {
    const { service, repository } = harness();
    await expect(service.create('company-a', rh, createDto(input))).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.reserveAndCreate).not.toHaveBeenCalled();
  });

  it('nega criação por funcionário que tenta solicitar para outra pessoa', async () => {
    const target = { ...employeeRow, id: 'target', managerId: null };
    const { service, repository } = harness({ findEmployee: vi.fn().mockResolvedValue(target), findEmployeeByUserId: vi.fn().mockResolvedValue(employeeRow) });
    await expect(service.create('company-a', employee, createDto({ employeeId: 'target' }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.reserveAndCreate).not.toHaveBeenCalled();
  });

  it('nega criação para colaborador de outra empresa', async () => {
    const { service, repository } = harness({ findEmployee: vi.fn().mockResolvedValue(null) });
    await expect(service.create('company-a', rh, createDto())).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOverlapping).not.toHaveBeenCalled();
    expect(repository.reserveAndCreate).not.toHaveBeenCalled();
  });

  it('nega solicitação antes de completar 12 meses de empresa', async () => {
    const { service, repository } = harness({ findEmployee: vi.fn().mockResolvedValue({ ...employeeRow, admissionDate: new Date() }) });
    await expect(service.create('company-a', rh, createDto())).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.reserveAndCreate).not.toHaveBeenCalled();
  });

  it('rejeita datas de início proibidas pela regra de calendário e períodos sobrepostos', async () => {
    const { service } = harness();
    await expect(service.create('company-a', rh, createDto({ startDate: '2026-07-05', endDate: '2026-07-14' }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create('company-a', rh, createDto({ startDate: '2026-07-03', endDate: '2026-07-12' }))).rejects.toBeInstanceOf(BadRequestException);
    const overlap = harness({ findOverlapping: vi.fn().mockResolvedValue(vacation) });
    await expect(overlap.service.create('company-a', rh, createDto())).rejects.toBeInstanceOf(BadRequestException);
    expect(overlap.repository.reserveAndCreate).not.toHaveBeenCalled();
  });

  it('rejeita ciclo aquisitivo malformado antes de criar solicitação', async () => {
    const { service, repository } = harness();
    await expect(service.create('company-a', rh, createDto({ acquisitionPeriod: '2025-2026' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.reserveAndCreate).not.toHaveBeenCalled();
  });

  it('bloqueia excesso de abono, saldo e fragmentações', async () => {
    const sold = harness();
    await expect(sold.service.create('company-a', rh, createDto({ startDate: '2026-07-10', endDate: '2026-07-29', daysUsed: 20, soldDays: 11 }))).rejects.toBeInstanceOf(BadRequestException);
    const split = harness({ findEntitlement: vi.fn().mockResolvedValue({ vacations: [{ daysUsed: 5 }, { daysUsed: 5 }] }) });
    await expect(split.service.create('company-a', rh, createDto({ startDate: '2026-07-10', endDate: '2026-07-29', daysUsed: 20 }))).rejects.toBeInstanceOf(BadRequestException);
    expect(split.repository.reserveAndCreate).not.toHaveBeenCalled();
  });

  it('converte insuficiência concorrente de saldo em erro legível e não oculta outros erros', async () => {
    const insufficient = harness({ reserveAndCreate: vi.fn().mockRejectedValue(new Error('VACATION_BALANCE:4')) });
    await expect(insufficient.service.create('company-a', rh, createDto())).rejects.toBeInstanceOf(BadRequestException);
    const unexpected = harness({ reserveAndCreate: vi.fn().mockRejectedValue(new Error('database offline')) });
    await expect(unexpected.service.create('company-a', rh, createDto())).rejects.toThrow('database offline');
  });

  it('registra pagamento somente por RH/Admin/Dev e valida data de quitação', async () => {
    const { service, repository } = harness();
    await expect(service.recordPayment('company-a', employee, vacation.id, { amount: 100, dueDate: '2026-06-29', status: 'PAID' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.recordPayment('company-a', rh, vacation.id, { amount: 100, dueDate: '2026-06-29', status: 'PAID' } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.recordPayment).not.toHaveBeenCalled();
    await service.recordPayment('company-a', rh, vacation.id, { amount: 100, dueDate: '2026-06-29', paidAt: '2026-06-28' } as any);
    expect(repository.recordPayment).toHaveBeenCalledWith('company-a', vacation.id, expect.objectContaining({ status: 'PAID', actorUserId: rh.sub }));
  });

  it('não registra pagamento para solicitação inexistente em tenant alheio', async () => {
    const { service, repository } = harness({ findById: vi.fn().mockResolvedValue(null) });
    await expect(service.recordPayment('company-a', rh, 'foreign', { amount: 10, dueDate: '2026-06-29' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.recordPayment).not.toHaveBeenCalled();
  });

  it('protege recibo PDF por tenant, identidade do empregado e status elegível', async () => {
    const outsider = { ...employeeRow, id: 'other', managerId: null };
    const isolated = harness({ findById: vi.fn().mockResolvedValue({ ...vacation, employeeId: outsider.id }), findEmployee: vi.fn().mockResolvedValue(outsider), findEmployeeByUserId: vi.fn().mockResolvedValue(employeeRow) });
    await expect(isolated.service.generateReceiptPdf('company-a', employee, vacation.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(isolated.receiptService.generate).not.toHaveBeenCalled();
    const missing = harness({ findById: vi.fn().mockResolvedValue(null) });
    await expect(missing.service.generateReceiptPdf('company-a', rh, 'foreign')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('filtra atestados por escopo e não revela atestado de terceiro', async () => {
    const outsider = { ...employeeRow, id: 'other', managerId: null };
    const { service, repository } = harness({ findEmployee: vi.fn().mockResolvedValue(outsider), findEmployeeByUserId: vi.fn().mockResolvedValue(employeeRow) });
    await expect(service.listMedicalCertificates('company-a', employee, outsider.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.listMedicalCertificates).not.toHaveBeenCalled();
  });

  it('valida intervalo e documento obrigatório no cadastro de atestado', async () => {
    const { service, repository } = harness();
    const base = { employeeId: employeeRow.id, certificateType: 'HOURS', startAt: '2026-06-10T10:00:00Z', endAt: '2026-06-10T12:00:00Z', coveredMinutes: 60, issueDate: '2026-06-10', documentId: 'doc-1' };
    await expect(service.createMedicalCertificate('company-a', rh, { ...base, endAt: base.startAt } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createMedicalCertificate('company-a', rh, { ...base, documentId: ' ' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createMedicalCertificate('company-a', rh, { ...base, coveredMinutes: 121 } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createMedicalCertificate).not.toHaveBeenCalled();
  });

  it('exige justificativa para rejeitar atestado e barra revisor sem permissão', async () => {
    const { service, repository } = harness();
    await expect(service.updateMedicalCertificateStatus('company-a', employee, 'certificate-1', { status: 'APPROVED' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updateMedicalCertificateStatus('company-a', rh, 'certificate-1', { status: 'REJECTED', reason: ' ' } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateMedicalCertificateStatus).not.toHaveBeenCalled();
  });
});
