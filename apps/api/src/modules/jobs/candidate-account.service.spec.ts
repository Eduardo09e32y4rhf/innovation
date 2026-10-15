import { describe, expect, it, vi } from 'vitest';

// O serviço só usa essas classes como dependências injetadas; o teste usa dublês e não precisa do client gerado do Prisma.
vi.mock('./jobs.service', () => ({ JobsService: class {} }));
vi.mock('../../database/prisma.service', () => ({ PrismaService: class {} }));
vi.mock('../mail/mail.service', () => ({ MailService: class {} }));
vi.mock('./jobs-storage.service', () => ({ JobsStorageService: class {} }));
import { CandidateAccountService } from './candidate-account.service';
import { hashPassword, hashSecret } from './candidate-account.rules';

function build(overrides: Record<string, any> = {}) {
  const prisma: any = {
    candidateLoginCode: { count: vi.fn(async () => 0), create: vi.fn(async () => ({})), findFirst: vi.fn(async () => null), update: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({})) },
    candidateAccount: { upsert: vi.fn(async ({ where }: any) => ({ id: 'acc-1', email: where.email })), update: vi.fn(async ({ data }: any) => ({ id: 'acc-1', email: 'c@x.com', ...data })), delete: vi.fn(async () => ({})) },
    candidateSession: { create: vi.fn(async () => ({})), findUnique: vi.fn(async () => null), deleteMany: vi.fn(async () => ({})) },
    application: { findMany: vi.fn(async () => []), groupBy: vi.fn(async () => []) },
    candidateInvite: { updateMany: vi.fn(async () => ({ count: 1 })), findMany: vi.fn(async () => []) },
    job: { findMany: vi.fn(async () => []) },
    ...overrides,
  };
  const mail: any = { send: vi.fn(async () => ({ sent: true })) };
  const storage: any = { save: vi.fn(), remove: vi.fn(), read: vi.fn(async () => Buffer.from('%PDF-1.4 x')) };
  const jobs: any = { apply: vi.fn(async () => ({ received: true, applicationId: 'app-1' })) };
  return { svc: new CandidateAccountService(prisma, mail, storage, jobs), prisma, mail, storage, jobs };
}

describe('cadastro e login com senha', () => {
  it('cria a conta com a senha só em hash e já devolve a sessão', async () => {
    const { svc, prisma } = build({ candidateAccount: { findUnique: vi.fn(async () => null), create: vi.fn(async ({ data }: any) => ({ id: 'acc-1', ...data })), update: vi.fn(), upsert: vi.fn(), delete: vi.fn() } });
    const result = await svc.register(' Camila@Exemplo.com ', 'segredo123', 'Camila');
    const saved = prisma.candidateAccount.create.mock.calls[0][0].data;
    expect(saved.email).toBe('camila@exemplo.com');
    expect(saved.passwordHash).toMatch(/^scrypt\$/);
    expect(JSON.stringify(saved)).not.toContain('segredo123');
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(prisma.candidateSession.create.mock.calls[0][0].data.tokenHash).toBe(hashSecret(result.token));
  });
  it('recusa senha fraca e e-mail já cadastrado', async () => {
    const { svc } = build({ candidateAccount: { findUnique: vi.fn(async () => ({ id: 'x' })), create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn() } });
    await expect(svc.register('a@x.com', 'curta1')).rejects.toMatchObject({ response: { fields: { password: expect.any(String) } } });
    await expect(svc.register('a@x.com', 'somenteletras')).rejects.toThrow();
    await expect(svc.register('a@x.com', 'segredo123')).rejects.toMatchObject({ response: { fields: { email: 'E-mail já cadastrado' } } });
  });
  it('login certo zera falhas e abre sessão', async () => {
    const account = { id: 'acc-1', email: 'c@x.com', passwordHash: hashPassword('segredo123'), failedLoginCount: 2, lockedUntil: null };
    const { svc, prisma } = build({ candidateAccount: { findUnique: vi.fn(async () => account), update: vi.fn(async () => ({})), create: vi.fn(), upsert: vi.fn(), delete: vi.fn() } });
    const result = await svc.login('C@x.com', 'segredo123');
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(prisma.candidateAccount.update.mock.calls[0][0].data).toMatchObject({ failedLoginCount: 0, lockedUntil: null });
  });
  it('senha errada e e-mail inexistente dão a mesma resposta', async () => {
    const account = { id: 'acc-1', email: 'c@x.com', passwordHash: hashPassword('segredo123'), failedLoginCount: 0, lockedUntil: null };
    const a = build({ candidateAccount: { findUnique: vi.fn(async () => account), update: vi.fn(async () => ({})), create: vi.fn(), upsert: vi.fn(), delete: vi.fn() } });
    await expect(a.svc.login('c@x.com', 'errada999')).rejects.toThrow('E-mail ou senha incorretos.');
    expect(a.prisma.candidateAccount.update.mock.calls[0][0].data).toEqual({ failedLoginCount: 1 });
    const b = build({ candidateAccount: { findUnique: vi.fn(async () => null), update: vi.fn(), create: vi.fn(), upsert: vi.fn(), delete: vi.fn() } });
    await expect(b.svc.login('naoexiste@x.com', 'qualquer123')).rejects.toThrow('E-mail ou senha incorretos.');
  });
  it('bloqueia depois de 5 erros, mesmo com a senha certa', async () => {
    const hash = hashPassword('segredo123');
    const a = build({ candidateAccount: { findUnique: vi.fn(async () => ({ id: 'a', email: 'c@x.com', passwordHash: hash, failedLoginCount: 4, lockedUntil: null })), update: vi.fn(async () => ({})), create: vi.fn(), upsert: vi.fn(), delete: vi.fn() } });
    await expect(a.svc.login('c@x.com', 'errada999')).rejects.toThrow();
    expect(a.prisma.candidateAccount.update.mock.calls[0][0].data.lockedUntil).toBeInstanceOf(Date);
    const b = build({ candidateAccount: { findUnique: vi.fn(async () => ({ id: 'a', email: 'c@x.com', passwordHash: hash, failedLoginCount: 0, lockedUntil: new Date(Date.now() + 60_000) })), update: vi.fn(), create: vi.fn(), upsert: vi.fn(), delete: vi.fn() } });
    await expect(b.svc.login('c@x.com', 'segredo123')).rejects.toMatchObject({ status: 429 });
  });
});

describe('recuperar senha por código no e-mail', () => {
  it('manda o código por e-mail, guarda só o hash e responde igual para e-mail sem conta', async () => {
    const { svc, prisma, mail } = build({ candidateAccount: { findUnique: vi.fn(async () => ({ id: 'a' })), update: vi.fn(), create: vi.fn(), upsert: vi.fn(), delete: vi.fn() } });
    expect(await svc.requestPasswordReset(' Camila@Exemplo.com ')).toEqual({ sent: true });
    const saved = prisma.candidateLoginCode.create.mock.calls[0][0].data;
    const sentCode = /\b(\d{6})\b/.exec(mail.send.mock.calls[0][1].text)![1];
    expect(saved.codeHash).toBe(hashSecret(`camila@exemplo.com:${sentCode}`));
    expect(saved.purpose).toBe('RESET');
    const none = build({ candidateAccount: { findUnique: vi.fn(async () => null), update: vi.fn(), create: vi.fn(), upsert: vi.fn(), delete: vi.fn() } });
    expect(await none.svc.requestPasswordReset('x@x.com')).toEqual({ sent: true });
    expect(none.mail.send).not.toHaveBeenCalled();
  });
  it('não dispara e-mail demais', async () => {
    const { svc, mail } = build({ candidateAccount: { findUnique: vi.fn(async () => ({ id: 'a' })), update: vi.fn(), create: vi.fn(), upsert: vi.fn(), delete: vi.fn() }, candidateLoginCode: { count: vi.fn(async () => 3), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() } });
    expect(await svc.requestPasswordReset('c@x.com')).toEqual({ sent: true });
    expect(mail.send).not.toHaveBeenCalled();
  });
  it('código errado soma tentativa; bloqueia depois de 5', async () => {
    const row = { id: 'c1', codeHash: hashSecret('c@x.com:123456'), attempts: 0 };
    const a = build({ candidateLoginCode: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(async () => row), update: vi.fn(async () => ({})), deleteMany: vi.fn() } });
    await expect(a.svc.resetPassword('c@x.com', '000000', 'segredo123')).rejects.toThrow('Código inválido');
    expect(a.prisma.candidateLoginCode.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { attempts: { increment: 1 } } });
    const b = build({ candidateLoginCode: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(async () => ({ ...row, attempts: 5 })), update: vi.fn(), deleteMany: vi.fn() } });
    await expect(b.svc.resetPassword('c@x.com', '123456', 'segredo123')).rejects.toThrow('Código inválido');
  });
  it('código certo troca a senha, derruba as outras sessões e abre uma nova', async () => {
    const row = { id: 'c1', codeHash: hashSecret('c@x.com:123456'), attempts: 1 };
    const { svc, prisma } = build({
      candidateLoginCode: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(async () => row), update: vi.fn(async () => ({})), deleteMany: vi.fn() },
      candidateAccount: { update: vi.fn(async ({ data }: any) => ({ id: 'acc-1', email: 'c@x.com', ...data })), findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    });
    const result = await svc.resetPassword('c@x.com', '123456', 'novaSenha1');
    expect(prisma.candidateLoginCode.update.mock.calls[0][0].data.usedAt).toBeInstanceOf(Date);
    expect(prisma.candidateAccount.update.mock.calls[0][0].data.passwordHash).toMatch(/^scrypt\$/);
    expect(prisma.candidateSession.deleteMany).toHaveBeenCalledWith({ where: { accountId: 'acc-1' } });
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
  });
  it('sessão expirada ou token fora do formato não autentica', async () => {
    const { svc } = build({ candidateSession: { create: vi.fn(), findUnique: vi.fn(async () => ({ expiresAt: new Date(Date.now() - 1000), account: { id: 'a' } })), deleteMany: vi.fn() } });
    expect(await svc.findAccountBySession('lixo')).toBeNull();
    expect(await svc.findAccountBySession('a'.repeat(64))).toBeNull();
  });
});

describe('perfil mínimo', () => {
  const account: any = { id: 'acc-1', email: 'c@x.com', consentAt: null };
  it('recusa CPF inválido com o campo no erro', async () => {
    const { svc } = build();
    await expect(svc.updateProfile(account, { cpf: '111.111.111-11' })).rejects.toMatchObject({ response: { fields: { cpf: 'CPF inválido' } } });
  });
  it('guarda CPF só com dígitos, UF em maiúscula e formação limpa', async () => {
    const { svc, prisma } = build();
    await svc.updateProfile(account, { cpf: '529.982.247-25', state: 'sp', cep: '06000-000', education: [{ level: 'hack', status: 'x' }], consent: true });
    const data = prisma.candidateAccount.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ cpf: '52998224725', state: 'SP', cep: '06000000', education: [{ level: 'Ensino médio', status: 'Completo', course: '', school: '' }] });
    expect(data.consentAt).toBeInstanceOf(Date);
  });
  it('guarda nascimento, profissão, CNH e banco de talentos; sem CNH limpa a categoria', async () => {
    const { svc, prisma } = build();
    await svc.updateProfile(account, { birthDate: '1990-05-17', profession: ' Contador ', skills: ['Excel', 'excel', 'SPED'], hasDriverLicense: true, driverLicenseCategory: 'b', talentPoolConsent: true });
    const data = prisma.candidateAccount.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ profession: 'Contador', skills: ['Excel', 'SPED'], hasDriverLicense: true, driverLicenseCategory: 'B' });
    expect(data.birthDate.toISOString().slice(0, 10)).toBe('1990-05-17');
    expect(data.talentPoolConsentAt).toBeInstanceOf(Date);
    await svc.updateProfile({ ...account, talentPoolConsentAt: new Date() }, { hasDriverLicense: false, talentPoolConsent: false });
    expect(prisma.candidateAccount.update.mock.calls[1][0].data).toMatchObject({ hasDriverLicense: false, driverLicenseCategory: null, talentPoolConsentAt: null });
  });
  it('recusa data de nascimento e categoria inválidas', async () => {
    const { svc } = build();
    await expect(svc.updateProfile(account, { birthDate: '2999-01-01' })).rejects.toMatchObject({ response: { fields: { birthDate: 'Data inválida' } } });
    await expect(svc.updateProfile(account, { hasDriverLicense: true, driverLicenseCategory: 'Z' })).rejects.toMatchObject({ response: { fields: { driverLicenseCategory: 'Categoria inválida' } } });
  });
  it('rejeita currículo que não é PDF/DOCX de verdade', async () => {
    const { svc } = build();
    await expect(svc.saveResume(account, { buffer: Buffer.from('MZ-exe'), filename: 'virus.pdf' })).rejects.toThrow('Currículo inválido');
  });
});

describe('minhas candidaturas', () => {
  it('mostra totais por etapa, esconde número abaixo de 5 e não vaza dados internos do RH', async () => {
    const app = {
      id: 'a1', jobId: 'j1', createdAt: new Date(), status: 'SCREENING', stage: { name: 'Triagem' }, events: [],
      job: { id: 'j1', title: 'Analista', confidential: false, company: { name: 'Prosolution' } },
      rating: 5, rejectionReason: 'interno', aiScore: 90, score: 70,
    };
    const { svc } = build({
      application: {
        findMany: vi.fn(async () => [app]),
        groupBy: vi.fn(async () => [{ jobId: 'j1', status: 'APPLIED', _count: { _all: 48 } }, { jobId: 'j1', status: 'SCREENING', _count: { _all: 12 } }, { jobId: 'j1', status: 'INTERVIEW', _count: { _all: 4 } }]),
      },
    });
    const result = await svc.applications({ id: 'acc-1', email: 'c@x.com' } as any);
    const item: any = result.applications[0];
    expect(item.funnel.map((row: any) => row.label)).toEqual(['48', '12', 'menos de 5', 'menos de 5']);
    expect(item.funnel.map((row: any) => row.stage)).toEqual(['Candidatura recebida', 'Em análise pelo RH', 'Em fase de entrevistas', 'Proposta em andamento']);
    expect(item.funnel[2]).toMatchObject({ status: 'INTERVIEW', count: null });
    expect(item.funnel[0]).toMatchObject({ status: 'APPLIED', count: 48 });
    expect(JSON.stringify(item)).not.toMatch(/rating|rejectionReason|aiScore|score/);
    expect(result.appliedJobIds).toEqual(['j1']);
  });
  it('vaga confidencial não mostra funil', async () => {
    const app = { id: 'a1', jobId: 'j1', createdAt: new Date(), status: 'APPLIED', stage: null, events: [], job: { id: 'j1', title: 'X', confidential: true, company: { name: 'P' } } };
    const { svc } = build({ application: { findMany: vi.fn(async () => [app]), groupBy: vi.fn(async () => []) } });
    expect(((await svc.applications({ id: 'a', email: 'c@x.com' } as any)).applications[0] as any).funnel).toBeNull();
  });
  it('mostra a entrevista ja enviada por e-mail e pede so as avisadas', async () => {
    const interview = { scheduledAt: new Date('2026-10-16T17:30:00Z'), mode: 'ONLINE', location: null, meetingUrl: 'https://meet.google.com/x', durationMinutes: 45 };
    const app = { id: 'a1', jobId: 'j1', createdAt: new Date(), status: 'INTERVIEW', stage: null, events: [], interviews: [interview], job: { id: 'j1', title: 'X', confidential: true, company: { name: 'P' } } };
    const findMany = vi.fn(async () => [app]);
    const { svc } = build({ application: { findMany, groupBy: vi.fn(async () => []) } });
    const item = (await svc.applications({ id: 'a', email: 'c@x.com' } as any)).applications[0] as any;
    expect(item.interview).toEqual(interview);
    expect((findMany.mock.calls[0] as any)[0].include.interviews.where.notifiedAt).toEqual({ not: null });
    const rejected = { ...app, status: 'REJECTED' };
    const { svc: svc2 } = build({ application: { findMany: vi.fn(async () => [rejected]), groupBy: vi.fn(async () => []) } });
    expect(((await svc2.applications({ id: 'a', email: 'c@x.com' } as any)).applications[0] as any).interview).toBeNull();
  });
});

describe('candidatura reaproveitando o perfil', () => {
  const full: any = { id: 'acc-1', email: 'c@x.com', name: 'Camila', phone: '(11) 91234-5678', resumeKey: 'candidates/acc-1/x.pdf', resumeName: 'cv.pdf', resumeType: 'application/pdf' };
  it('exige consentimento', async () => {
    const { svc } = build();
    await expect(svc.applyWithProfile(full, 'j1', { consent: false } as any)).rejects.toThrow('Consentimento');
  });
  it('perfil sem currículo não envia', async () => {
    const { svc, jobs } = build();
    await expect(svc.applyWithProfile({ ...full, resumeKey: null }, 'j1', { consent: true })).rejects.toThrow('faltam Currículo');
    expect(jobs.apply).not.toHaveBeenCalled();
  });
  it('envia nome, e-mail, telefone e o currículo salvo; sem perguntas vai direto', async () => {
    const { svc, jobs, prisma } = build();
    const result = await svc.applyWithProfile(full, 'j1', { consent: true });
    expect(prisma.candidateInvite.updateMany).toHaveBeenCalledWith({ where: { accountId: 'acc-1', jobId: 'j1', status: 'SENT' }, data: { status: 'APPLIED' } });
    expect(result).toEqual({ received: true, applicationId: 'app-1' });
    const [jobId, fields, file] = jobs.apply.mock.calls[0];
    expect(jobId).toBe('j1');
    expect(fields).toMatchObject({ name: 'Camila', email: 'c@x.com', phone: '(11) 91234-5678', consent: true, answers: '{}' });
    expect(file.filename).toBe('cv.pdf');
    expect(Buffer.isBuffer(file.buffer)).toBe(true);
  });
});
