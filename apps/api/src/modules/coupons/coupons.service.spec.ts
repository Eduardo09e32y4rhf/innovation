import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CouponsService } from './coupons.service';

const actor = { sub: 'u1', role: 'DEV', companyId: 'c' } as any;
const base = { id: 'a1', code: 'TESTE', type: 'TRIAL_DAYS', value: null, trialDays: 30, durationCycles: null, allowedPlanIds: [], minSeats: 5, maxRedemptions: 10, redemptionCount: 0, startsAt: new Date('2026-01-01'), expiresAt: new Date('2026-12-31'), isActive: true };

function make(existing: any = base, redemptions = 0) {
  const repository: any = {
    findById: vi.fn().mockResolvedValue(existing),
    findByCode: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((_id: string, data: any) => Promise.resolve({ ...existing, ...data })),
    countRedemptions: vi.fn().mockResolvedValue(redemptions),
    delete: vi.fn().mockResolvedValue(existing),
  };
  return { service: new CouponsService(repository), repository };
}

describe('CouponsService.update: limpar campos', () => {
  it('remove o limite de usos com null (antes comparava null com os usos e recusava)', async () => {
    const { service, repository } = make({ ...base, redemptionCount: 3 });
    await service.update('a1', { maxRedemptions: null } as any, actor);
    expect(repository.update).toHaveBeenCalledWith('a1', expect.objectContaining({ maxRedemptions: null }));
  });

  it('remove minimo de usuarios, inicio e fim com null', async () => {
    const { service, repository } = make();
    await service.update('a1', { minSeats: null, startsAt: null, expiresAt: null } as any, actor);
    expect(repository.update).toHaveBeenCalledWith('a1', expect.objectContaining({ minSeats: null, startsAt: null, expiresAt: null }));
  });

  it('continua recusando limite menor que os usos ja registrados', async () => {
    const { service } = make({ ...base, redemptionCount: 5 });
    await expect(service.update('a1', { maxRedemptions: 2 } as any, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('troca o codigo de cupom ainda nao usado', async () => {
    const { service, repository } = make();
    await service.update('a1', { code: ' novo-codigo ' } as any, actor);
    expect(repository.update).toHaveBeenCalledWith('a1', expect.objectContaining({ code: 'NOVO-CODIGO' }));
  });

  it('nao troca o codigo de cupom ja usado', async () => {
    const { service } = make({ ...base, redemptionCount: 1 });
    await expect(service.update('a1', { code: 'OUTRO' } as any, actor)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('CouponsService.remove: excluir cupom', () => {
  it('exclui cupom que nunca foi usado', async () => {
    const { service, repository } = make();
    await expect(service.remove('a1')).resolves.toEqual({ deleted: true, id: 'a1' });
    expect(repository.delete).toHaveBeenCalledWith('a1');
  });

  it('cupom inexistente: 404', async () => {
    const { service } = make(null);
    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cupom ja usado: 409 e nada e apagado (o historico de usos marca o CPF/CNPJ que ja usou o teste)', async () => {
    const { service, repository } = make({ ...base, redemptionCount: 2 }, 2);
    await expect(service.remove('a1')).rejects.toThrow(/desative/i);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('contagem de usos zerada no cupom mas com registro de uso: tambem 409', async () => {
    const { service, repository } = make(base, 1);
    await expect(service.remove('a1')).rejects.toBeInstanceOf(ConflictException);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
