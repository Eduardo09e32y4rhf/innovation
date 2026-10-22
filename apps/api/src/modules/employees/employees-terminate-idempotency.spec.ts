import { describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { actor, COMPANY_A, employee, makeService } from '../../../../../tests/qa/employees/helpers';

/** Simula o compare-and-set do banco: só a primeira chamada vira TERMINATED. */
function casRepo(userId: string | null = 'u1', history = 0) {
  let status = 'ACTIVE';
  const terminateOnce = vi.fn(async () => {
    await Promise.resolve();
    if (status === 'TERMINATED') return { count: 0 };
    status = 'TERMINATED';
    return { count: 1 };
  });
  return {
    terminateOnce,
    findById: vi.fn(async () => employee({ id: 'e1', userId, status })),
    getDeletionImpact: vi.fn().mockResolvedValue({ total: history }),
  };
}

describe('demissão idempotente', () => {
  it('10 chamadas simultâneas: exatamente 1 sucesso, 9 conflitos, efeitos colaterais 1x', async () => {
    const { service, repository, aso } = makeService(casRepo() as never);
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => service.terminate(COMPANY_A, actor('RH'), 'e1')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(9);
    rejected.forEach((r) => expect(r.reason).toBeInstanceOf(ConflictException));
    expect(aso.create).toHaveBeenCalledTimes(1);
    expect(repository.terminateOnce).toHaveBeenCalledTimes(10);
  });

  it('segunda chamada sequencial devolve 409 com mensagem amigável', async () => {
    const { service } = makeService(casRepo() as never);
    await service.terminate(COMPANY_A, actor('RH'), 'e1');
    await expect(service.terminate(COMPANY_A, actor('RH'), 'e1')).rejects.toThrow('Funcionário já desligado.');
  });

  it('o bloqueio do usuário vai junto do compare-and-set (mesma transação)', async () => {
    const { service, repository } = makeService(casRepo('u7') as never);
    await service.terminate(COMPANY_A, actor('RH'), 'e1');
    expect(repository.terminateOnce).toHaveBeenCalledWith(COMPANY_A, 'e1', {}, 'u7');
    expect(repository.updateUser).not.toHaveBeenCalled();
  });

  it('delete permanente com histórico: arquivar 5x simultâneas gera 1 arquivamento', async () => {
    const { service } = makeService(casRepo('u1', 3) as never);
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => service.delete(COMPANY_A, actor('RH'), 'e1')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(4);
  });
});
