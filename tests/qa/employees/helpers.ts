import { it, vi } from 'vitest';
import type { JwtUser, UserRole } from '../../../apps/api/src/common/types/auth.types';
import { EmployeesService } from '../../../apps/api/src/modules/employees/employees.service';

export const ROLES: UserRole[] = ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
export const COMPANY_A = 'company-a';
export const COMPANY_B = 'company-b';

export const actor = (role: UserRole, sub = `user-${role.toLowerCase()}`, companyId = COMPANY_A): JwtUser => ({
  sub,
  email: `${sub}@empresa.com`,
  name: sub,
  companyId,
  role,
});

export const employee = (over: Record<string, unknown> = {}) => ({
  id: 'emp-1',
  companyId: COMPANY_A,
  name: 'Ana Souza',
  cpf: null,
  email: 'ana@empresa.com',
  phone: null,
  userId: null,
  managerId: null,
  status: 'ACTIVE',
  position: 'Analista',
  department: 'RH',
  registration: null,
  terminationDate: null,
  observations: null,
  user: null,
  ...over,
});

const REPOSITORY_METHODS = [
  'list', 'count', 'findById', 'findByUserId', 'listByManager', 'listSwapCandidates', 'countByManager', 'findByCpf',
  'findByRegistration', 'create', 'update', 'updateUserLink', 'findUserByEmail', 'findUserById', 'createUser', 'updateUser',
  'getDeletionImpact', 'getDossier', 'getOfficialDocumentData', 'delete', 'createAuditLog', 'countByCompany', 'getCompanyLimits',
] as const;

export type FakeRepo = Record<(typeof REPOSITORY_METHODS)[number], ReturnType<typeof vi.fn>>;

/** Repositório falso com padrões seguros (nada existe, banco vazio, 10 licenças). */
export function makeRepo(over: Partial<FakeRepo> = {}): FakeRepo {
  const repo = Object.fromEntries(REPOSITORY_METHODS.map((name) => [name, vi.fn().mockResolvedValue(undefined)])) as FakeRepo;
  repo.list.mockResolvedValue([]);
  repo.listByManager.mockResolvedValue([]);
  repo.listSwapCandidates.mockResolvedValue([]);
  repo.update.mockResolvedValue({ count: 1 });
  repo.delete.mockResolvedValue({ count: 1 });
  repo.updateUser.mockResolvedValue({ count: 1 });
  repo.updateUserLink.mockResolvedValue({ count: 1 });
  repo.countByCompany.mockResolvedValue(0);
  repo.getCompanyLimits.mockResolvedValue({ subscription: { seatQuantity: 10 } });
  repo.getDeletionImpact.mockResolvedValue({ total: 0 });
  repo.create.mockImplementation(async (_companyId: string, data: Record<string, unknown>) => employee({ id: 'new-emp', ...data }));
  repo.createUser.mockImplementation(async (data: Record<string, unknown>) => ({ id: 'new-user', ...data }));
  Object.assign(repo, over);
  return repo;
}

export function makeAso() {
  return { create: vi.fn().mockResolvedValue({ id: 'aso-1' }), getLatestByEmployee: vi.fn().mockResolvedValue(null) };
}

export function makeService(over: Partial<FakeRepo> = {}) {
  const repository = makeRepo(over);
  const aso = makeAso();
  const service = new EmployeesService(repository as never, aso as never);
  return { service, repository, aso };
}

/**
 * Registra um caso. Quando `bug` é informado, o caso descreve o comportamento CORRETO e hoje falha:
 * usamos it.fails, então a suíte fica verde e acusa (fica vermelha) quando o defeito for corrigido
 * — hora de remover a marca `bug` e deixar o teste valer como regressão.
 */
export function check(name: string, bug: string | null, fn: () => unknown | Promise<unknown>) {
  if (bug) it.fails(`[${bug}] ${name}`, fn as never);
  else it(name, fn as never);
}

/** Gerador pseudo-aleatório determinístico (os mesmos casos em toda execução). */
export function prng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** CPF válido a partir de 9 dígitos (algoritmo oficial, implementado de forma independente do código testado). */
export function cpfFromBase(base: string): string {
  const digits = base.split('').map(Number);
  const dv = (len: number) => {
    const sum = digits.slice(0, len).reduce((total, d, i) => total + d * (len + 1 - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(9);
  digits.push(d1);
  const d2 = dv(10);
  return `${base}${d1}${d2}`;
}

export const VALID_CPF = cpfFromBase('529982247');