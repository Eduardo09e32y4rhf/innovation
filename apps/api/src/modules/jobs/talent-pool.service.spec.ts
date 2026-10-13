import { describe, expect, it, vi } from 'vitest';

vi.mock('../../database/prisma.service', () => ({ PrismaService: class {} }));
vi.mock('../mail/mail.service', () => ({ MailService: class {} }));
vi.mock('./jobs-storage.service', () => ({ JobsStorageService: class {} }));
import { CandidateAdminService, MAX_INVITES_PER_DAY, TalentPoolService } from './talent-pool.service';

const account = (over: Record<string, unknown> = {}) => ({
  id: 'a1', email: 'camila@x.com', name: 'Camila Souza', cpf: '52998224725', phone: '11999999999', street: 'Rua Secreta', streetNumber: '10', city: 'Osasco', state: 'SP', neighborhood: 'Centro',
  birthDate: new Date(Date.UTC(1990, 0, 1)), profession: 'Contadora', skills: ['SPED', 'Excel'], education: [{ level: 'Superior', status: 'Completo', course: 'Ciências Contábeis', school: 'X' }],
  hasDriverLicense: true, driverLicenseCategory: 'B', resumeKey: 'k', passwordHash: 'scrypt$aa$bb', talentPoolConsentAt: new Date(), updatedAt: new Date(), createdAt: new Date(), lastLoginAt: null, lockedUntil: null, ...over,
});

function build(rows: any[] = [account()], extra: Record<string, any> = {}) {
  const prisma: any = {
    candidateAccount: { findMany: vi.fn(async () => rows), findFirst: vi.fn(async () => rows[0] ?? null), count: vi.fn(async () => rows.length) },
    candidate: { findMany: vi.fn(async () => []) },
    candidateInvite: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0), findUnique: vi.fn(async () => null), create: vi.fn(async () => ({ id: 'inv1' })) },
    candidateProfileView: { create: vi.fn(async () => ({})) },
    job: { findFirst: vi.fn(async () => ({ id: 'j1', title: 'Analista', company: { name: 'Prosolution' } })) },
    ...extra,
  };
  const mail: any = { send: vi.fn(async () => ({ sent: true })) };
  const storage: any = { read: vi.fn(async () => Buffer.from('%PDF-1.4')) };
  return { svc: new TalentPoolService(prisma, mail, storage), prisma, mail };
}

describe('banco de talentos (RH)', () => {
  it('só consulta quem aceitou o banco de talentos e não vaza contato, CPF nem endereço', async () => {
    const { svc, prisma } = build();
    const result = await svc.search('c1', 'u1', { q: 'contadora sped' });
    expect(prisma.candidateAccount.findMany.mock.calls[0][0].where.talentPoolConsentAt).toEqual({ not: null });
    expect(result.total).toBe(1);
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/52998224725|11999999999|camila@x\.com|Rua Secreta|passwordHash|1990-01-01/);
    expect(result.items[0]).toMatchObject({ name: 'Camila Souza', profession: 'Contadora', city: 'Osasco', highestEducation: 'Superior', driverLicenseCategory: 'B', hasResume: true });
  });
  it('filtra por palavra (sem acento), formação e CNH', async () => {
    const { svc } = build([account(), account({ id: 'a2', name: 'João', profession: 'Motorista', skills: [], education: [{ level: 'Ensino médio', status: 'Completo', course: '', school: '' }] })]);
    expect((await svc.search('c1', 'u1', { q: 'CONTADORA' })).items.map((i) => i.id)).toEqual(['a1']);
    expect((await svc.search('c1', 'u1', { education: 'Ensino médio' })).items.map((i) => i.id)).toEqual(['a2']);
    expect((await svc.search('c1', 'u1', { q: 'ciencias contabeis' })).items.map((i) => i.id)).toEqual(['a1']);
  });
  it('marca quem já se candidatou à empresa sem mostrar o e-mail', async () => {
    const { svc } = build([account()], { candidate: { findMany: vi.fn(async () => [{ email: 'CAMILA@x.com' }]) } });
    expect((await svc.search('c1', 'u1', {})).items[0].alreadyApplied).toBe(true);
  });
  it('convite: exige vaga aberta da própria empresa, registra o acesso e manda e-mail sem expor contato', async () => {
    const { svc, prisma, mail } = build();
    const result = await svc.invite('c1', 'u1', 'a1', { jobId: 'j1', message: ' Venha conversar ' });
    expect(prisma.job.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'j1', companyId: 'c1', status: 'OPEN', isInternal: false });
    expect(prisma.candidateInvite.create.mock.calls[0][0].data).toMatchObject({ accountId: 'a1', companyId: 'c1', jobId: 'j1', message: 'Venha conversar' });
    expect(prisma.candidateProfileView.create.mock.calls[0][0].data.kind).toBe('INVITE');
    expect(mail.send.mock.calls[0][0]).toBe('camila@x.com');
    expect(result).toEqual({ id: 'inv1', emailSent: true });
  });
  it('convite: recusa vaga de outra empresa, repetido e acima do limite diário', async () => {
    await expect(build([account()], { job: { findFirst: vi.fn(async () => null) } }).svc.invite('c1', 'u1', 'a1', { jobId: 'j9' })).rejects.toThrow('vaga aberta');
    await expect(build([account()], { candidateInvite: { count: vi.fn(async () => 0), findUnique: vi.fn(async () => ({ id: 'x' })), create: vi.fn(), findMany: vi.fn() } }).svc.invite('c1', 'u1', 'a1', { jobId: 'j1' })).rejects.toThrow('já foi convidado');
    await expect(build([account()], { candidateInvite: { count: vi.fn(async () => MAX_INVITES_PER_DAY), findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() } }).svc.invite('c1', 'u1', 'a1', { jobId: 'j1' })).rejects.toThrow('Limite');
  });
  it('convite e currículo só para quem está no banco de talentos', async () => {
    const { svc } = build([]);
    await expect(svc.invite('c1', 'u1', 'a1', { jobId: 'j1' })).rejects.toThrow('fora do banco de talentos');
    await expect(svc.resume('c1', 'u1', 'a1')).rejects.toThrow('fora do banco de talentos');
  });
  it('baixar currículo grava quem acessou', async () => {
    const { svc, prisma } = build();
    const file = await svc.resume('c1', 'u1', 'a1');
    expect(file.name).toBeTruthy();
    expect(prisma.candidateProfileView.create.mock.calls[0][0].data).toMatchObject({ accountId: 'a1', companyId: 'c1', userId: 'u1', kind: 'RESUME' });
  });
});

describe('candidatos para o DEV', () => {
  it('lista logins e dados de perfil, sem senha, CPF, telefone nem endereço', async () => {
    const prisma: any = {
      candidateAccount: { count: vi.fn(async () => 1), findMany: vi.fn(async () => [account()]) },
      candidate: { findMany: vi.fn(async () => [{ email: 'camila@x.com', _count: { applications: 3 } }]) },
    };
    const result = await new CandidateAdminService(prisma).list({ q: 'camila' });
    expect(result.items[0]).toMatchObject({ email: 'camila@x.com', profession: 'Contadora', highestEducation: 'Superior', hasDriverLicense: true, driverLicenseCategory: 'B', applications: 3, hasPassword: true });
    expect(JSON.stringify(result)).not.toMatch(/scrypt|52998224725|11999999999|Rua Secreta|passwordHash/);
  });
});
