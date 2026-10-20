import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { VACATION_RECEIPT_VERSION, VacationReceiptService } from './vacation-receipt.service';

describe('VacationReceiptService', () => {
  const actor = {
    sub: '00000000-0000-0000-0000-000000000001',
    companyId: '00000000-0000-0000-0000-000000000010',
    role: 'RH',
    email: 'rh@example.com',
    name: 'Responsavel RH',
  } as any;

  function fixture(overrides: Record<string, unknown> = {}) {
    const repository: any = {
      findCompany: vi.fn().mockResolvedValue({
        id: actor.companyId,
        name: 'Innovation RH',
        legalName: 'Innovation RH Tecnologia Ltda',
        document: '00.000.000/0001-00',
        city: 'Sao Paulo',
        state: 'SP',
      }),
      createGeneratedDocument: vi.fn().mockResolvedValue({ id: 'document-1' }),
    };
    const storage: any = {
      saveFile: vi.fn().mockResolvedValue('/data/receipt.pdf'),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };
    const service = new VacationReceiptService(repository, storage);
    const vacation: any = {
      id: '11111111-1111-1111-1111-111111111111',
      employeeId: '22222222-2222-2222-2222-222222222222',
      acquisitionPeriod: '2025-01-15/2026-01-14',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-20T00:00:00.000Z'),
      daysUsed: 20,
      soldDays: 10,
      status: 'APPROVED',
      employee: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Maria da Silva',
        cpf: '000.000.000-00',
        registration: '0001',
        position: 'Analista',
        department: 'RH',
        admissionDate: new Date('2024-01-15T00:00:00.000Z'),
        salary: '3000.00',
      },
      payments: [{
        id: 'payment-1',
        status: 'PAID',
        amount: '3550.00',
        paidAt: new Date('2026-06-29T12:00:00.000Z'),
        paymentMethod: 'PIX',
      }],
      ...overrides,
    };
    return { service, repository, storage, vacation };
  }

  it('gera e persiste um PDF imutavel com identificador, competencia, versao e hash', async () => {
    const { service, repository, storage, vacation } = fixture();

    const result = await service.generate(actor.companyId, actor, vacation);

    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.version).toBe(VACATION_RECEIPT_VERSION);
    expect(result.filename).toBe('recibo-ferias-maria-da-silva-2026-07.pdf');
    expect(storage.saveFile).toHaveBeenCalledWith(expect.stringContaining('vacation-receipt-'), result.buffer);
    expect(repository.createGeneratedDocument).toHaveBeenCalledWith(expect.objectContaining({
      companyId: actor.companyId,
      sha256: result.sha256,
      metadata: expect.objectContaining({
        documentKind: 'VACATION_RECEIPT',
        competence: '2026-07',
        version: VACATION_RECEIPT_VERSION,
        paymentId: 'payment-1',
      }),
    }));
  });

  it('bloqueia recibo sem pagamento oficial registrado', async () => {
    const { service, vacation } = fixture({ payments: [] });

    await expect(service.generate(actor.companyId, actor, vacation))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('remove o arquivo se o registro imutavel falhar', async () => {
    const { service, repository, storage, vacation } = fixture();
    repository.createGeneratedDocument.mockRejectedValue(new Error('database unavailable'));

    await expect(service.generate(actor.companyId, actor, vacation))
      .rejects.toThrow('database unavailable');
    expect(storage.deleteFile).toHaveBeenCalledOnce();
  });

  function calcOf(repository: any) {
    return repository.createGeneratedDocument.mock.calls[0][0].metadata.calculation;
  }

  it('desconta INSS/IRRF so sobre ferias + 1/3 e isenta abono + 1/3 (salario 3.000, 20 dias + 10 vendidos)', async () => {
    const { service, repository, vacation } = fixture();
    await service.generate(actor.companyId, actor, vacation);
    const calc = calcOf(repository);
    // ferias 2.000,00 + 1/3 666,67 = 2.666,67 tributavel; abono 1.000,00 + 1/3 333,33 isento
    expect(calc.taxableGross).toBe(2666.67);
    expect(calc.exemptAmount).toBe(1333.33);
    expect(calc.calculatedGross).toBe(4000);
    // INSS: 1.621 x 7,5% = 121,575 + (2.666,67 - 1.621) x 9% = 94,1103 -> 215,69
    expect(calc.inssDiscount).toBe(215.69);
    // rendimento ate R$ 5.000 -> IRRF zerado pelo redutor da Lei 15.270/2025
    expect(calc.irrfDiscount).toBe(0);
    expect(calc.calculatedNet).toBe(3784.31);
  });

  it('aplica teto do INSS, dependentes e IRRF 27,5% (salario 9.000, 30 dias, 2 dependentes)', async () => {
    const { service, repository, vacation } = fixture({ daysUsed: 30, soldDays: 0 });
    vacation.employee = { ...vacation.employee, salary: '9000', dependents: [{ name: 'A' }, { name: 'B' }] };
    await service.generate(actor.companyId, actor, vacation);
    const calc = calcOf(repository);
    expect(calc.taxableGross).toBe(12000);
    expect(calc.exemptAmount).toBe(0);
    // INSS no teto 8.475,55 -> 988,09
    expect(calc.inssDiscount).toBe(988.09);
    // base IR = 12.000 - 988,09 - 2 x 189,59 = 10.632,73; x 27,5% - 908,73 = 2.015,27; acima de 7.350 sem redutor
    expect(calc.dependents).toBe(2);
    expect(calc.irrfBase).toBe(10632.73);
    expect(calc.irrfDiscount).toBe(2015.27);
    expect(calc.calculatedNet).toBe(8996.64);
  });

  it('aceita dependentes salvos como texto JSON', async () => {
    const { service, repository, vacation } = fixture({ daysUsed: 30, soldDays: 0 });
    vacation.employee = { ...vacation.employee, salary: '9000', dependents: '[{"name":"A"}]' };
    await service.generate(actor.companyId, actor, vacation);
    expect(calcOf(repository).dependents).toBe(1);
  });
});
