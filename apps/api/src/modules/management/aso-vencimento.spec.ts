import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AsoService } from './aso.service';

/**
 * Defeitos achados pelo robô de ASO: o serviço calculava o vencimento com setFullYear(+1) em vez da regra única
 * (sst/aso-rules): ignorava a periodicidade, dava vencimento ao demissional, estourava em 29/fev, e editar qualquer
 * campo de um ASO concluído empurrava o vencimento para daqui a 1 ano (escondia ASO vencido).
 */
function montar(current: Record<string, unknown> = {}) {
  const base = { id: 'aso-1', companyId: 'c1', employeeId: 'e1', asoType: 'PERIODICO', status: 'COMPLETED', result: 'APTO', examDate: new Date('2025-01-10T00:00:00Z'), dueDate: new Date('2026-01-10T00:00:00Z'), periodicityMonths: null, completedAt: new Date('2025-01-10T00:00:00Z'), ...current };
  const gravado: any[] = [];
  const tx = {
    employeeAsoRecord: {
      create: vi.fn(async ({ data }: any) => { gravado.push(data); return { id: 'novo', ...data, employee: { id: 'e1', name: 'Ana' } }; }),
      update: vi.fn(async ({ data }: any) => { gravado.push(data); return { ...base, ...data, employee: { id: 'e1', name: 'Ana' } }; }),
    },
    employee: { updateMany: vi.fn().mockResolvedValue({ count: 0 }), findFirst: vi.fn(), update: vi.fn() },
  };
  const prisma: any = {
    employee: { findFirst: vi.fn().mockResolvedValue({ id: 'e1' }) },
    employeeAsoRecord: { findFirst: vi.fn().mockResolvedValue(base), findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    notification: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };
  return { service: new AsoService(prisma), prisma, tx, gravado };
}
const dia = (d: Date | null | undefined) => d?.toISOString().slice(0, 10) ?? null;

describe('ASO: vencimento ao criar', () => {
  it('usa a periodicidade informada (6, 12 ou 24 meses) e 12 quando não informada', async () => {
    for (const [meses, esperado] of [[6, '2026-09-15'], [12, '2027-03-15'], [24, '2028-03-15'], [undefined, '2027-03-15'], [7, '2027-03-15']] as const) {
      const { service, gravado } = montar();
      await service.create('c1', 'u1', { employeeId: 'e1', asoType: 'PERIODICO', status: 'COMPLETED', result: 'APTO', examDate: '2026-03-15', periodicityMonths: meses });
      expect(dia(gravado[0].dueDate), `periodicidade ${meses}`).toBe(esperado);
    }
  });

  it('29/02/2024 + 12 meses = 28/02/2025 (antes dava 01/03/2025)', async () => {
    const { service, gravado } = montar();
    await service.create('c1', 'u1', { employeeId: 'e1', asoType: 'PERIODICO', status: 'COMPLETED', result: 'APTO', examDate: '2024-02-29' });
    expect(dia(gravado[0].dueDate)).toBe('2025-02-28');
  });

  it('demissional e complementar não ganham vencimento', async () => {
    for (const asoType of ['DEMISSIONAL', 'COMPLEMENTAR']) {
      const { service, gravado } = montar();
      await service.create('c1', 'u1', { employeeId: 'e1', asoType, status: 'COMPLETED', result: 'APTO', examDate: '2026-03-15' });
      expect(gravado[0].dueDate, asoType).toBeUndefined();
    }
  });

  it('data inválida e tipo inválido são 400 (antes viravam erro 500 do banco)', async () => {
    const { service } = montar();
    await expect(service.create('c1', 'u1', { employeeId: 'e1', examDate: 'ontem', status: 'COMPLETED', result: 'APTO' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create('c1', 'u1', { employeeId: 'e1', dueDate: '32/13/2026' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create('c1', 'u1', { employeeId: 'e1', asoType: 'SUPERMAN' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ASO: editar um exame já concluído', () => {
  it('mudar só clínica, médico ou observação NÃO mexe no vencimento', async () => {
    const { service, gravado } = montar();
    await service.update('c1', 'aso-1', 'u1', { clinicName: 'Clínica Nova', doctorName: 'Dra. Lia', notes: 'ajuste' });
    expect(gravado[0].dueDate).toBeUndefined(); // undefined = o Prisma mantém 10/01/2026 (já vencido)
  });

  it('mudar a data do exame ou a periodicidade recalcula pela regra', async () => {
    const a = montar(); await a.service.update('c1', 'aso-1', 'u1', { examDate: '2026-02-01' });
    expect(dia(a.gravado[0].dueDate)).toBe('2027-02-01');
    const b = montar(); await b.service.update('c1', 'aso-1', 'u1', { periodicityMonths: 24 });
    expect(dia(b.gravado[0].dueDate)).toBe('2027-01-10'); // exame 10/01/2025 + 24 meses
    expect(b.gravado[0].periodicityMonths).toBe(24);
  });

  it('concluir um ASO que estava agendado calcula o vencimento a partir da data do exame', async () => {
    const { service, gravado } = montar({ status: 'SCHEDULED', result: null, dueDate: null, examDate: new Date('2026-05-05T00:00:00Z') });
    await service.update('c1', 'aso-1', 'u1', { status: 'COMPLETED', result: 'APTO' });
    expect(dia(gravado[0].dueDate)).toBe('2027-05-05');
  });

  it('trocar o tipo para demissional limpa o vencimento; data de vencimento explícita vale', async () => {
    const a = montar(); await a.service.update('c1', 'aso-1', 'u1', { asoType: 'DEMISSIONAL' });
    expect(a.gravado[0].dueDate).toBeNull();
    const b = montar(); await b.service.update('c1', 'aso-1', 'u1', { dueDate: '2030-06-30' });
    expect(dia(b.gravado[0].dueDate)).toBe('2030-06-30');
  });
});

describe('ASO periódico automático (cron)', () => {
  it('só considera ASO que renova, de quem ainda trabalha', async () => {
    const { service, prisma } = montar();
    await service.triggerPeriodicAso('c1');
    const where = prisma.employeeAsoRecord.findMany.mock.calls[0][0].where;
    expect(where.asoType.in).toEqual(['ADMISSIONAL', 'PERIODICO', 'RETORNO_AO_TRABALHO', 'MUDANCA_DE_FUNCAO']);
    expect(where.asoType.in).not.toContain('DEMISSIONAL');
    expect(where.employee.status.notIn).toEqual(expect.arrayContaining(['TERMINATED', 'INACTIVE']));
  });
});
