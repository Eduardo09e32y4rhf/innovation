import { describe, expect, it, vi } from 'vitest';
import { actor, COMPANY_A, makeService } from '../../../../../tests/qa/employees/helpers';

/**
 * Defeito achado pelo robô QA: "Permitir acesso ao painel = Sim" no cadastro de funcionário criava o usuário
 * sem checar licenças (tela mostrava "2 de 1 licenças") e ainda salvava o funcionário antes de falhar.
 */
const full = { countByCompany: vi.fn().mockResolvedValue(1), getCompanyLimits: vi.fn().mockResolvedValue({ subscription: { seatQuantity: 1 } }) };
const novo = (extra: object = {}) => ({ name: 'Ana', email: 'ana@x.com', accessEnabled: 'YES', accessProfile: 'FUNCIONARIO', ...extra }) as never;

describe('cadastro de funcionário com acesso ao painel respeita as licenças', () => {
  it('licenças esgotadas: recusa com SEAT_LIMIT_REACHED e NÃO grava o funcionário nem o usuário', async () => {
    const { service, repository } = makeService(full as never);
    await expect(service.create(COMPANY_A, novo())).rejects.toThrow(/SEAT_LIMIT_REACHED/);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('com licença livre: cria funcionário e usuário', async () => {
    const { service, repository } = makeService({ countByCompany: vi.fn().mockResolvedValue(0), getCompanyLimits: vi.fn().mockResolvedValue({ subscription: { seatQuantity: 1 } }) } as never);
    await service.create(COMPANY_A, novo());
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.createUser).toHaveBeenCalledTimes(1);
  });

  it('sem pedir acesso ao painel não consome nem consulta licença', async () => {
    const { service, repository } = makeService(full as never);
    await service.create(COMPANY_A, novo({ accessEnabled: 'NO' }));
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('perfil Administrador não ocupa licença (igual à contagem de usuários)', async () => {
    const { service, repository } = makeService(full as never);
    await service.create(COMPANY_A, novo({ accessProfile: 'ADMIN' }));
    expect(repository.createUser).toHaveBeenCalledTimes(1);
  });

  it('pessoa que já tem acesso ativo que conta não precisa de nova licença', async () => {
    const { service, repository } = makeService({ ...full, findUserByEmail: vi.fn().mockResolvedValue({ id: 'u1', companyId: COMPANY_A, isActive: true, role: 'FUNCIONARIO' }) } as never);
    await service.create(COMPANY_A, novo());
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('reativar acesso inativo exige licença', async () => {
    const { service, repository } = makeService({ ...full, findUserByEmail: vi.fn().mockResolvedValue({ id: 'u1', companyId: COMPANY_A, isActive: false, role: 'FUNCIONARIO' }) } as never);
    await expect(service.create(COMPANY_A, novo())).rejects.toThrow(/SEAT_LIMIT_REACHED/);
    expect(repository.updateUser).not.toHaveBeenCalled();
  });

  it('ator existe só para tipagem do helper', () => expect(actor('RH').role).toBe('RH'));
});
