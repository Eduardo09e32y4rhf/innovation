import { describe, expect, it, vi } from 'vitest';

// O serviço só usa essas classes como dependências injetadas; o teste usa dublês e não precisa do client gerado do Prisma.
vi.mock('./jobs.service', () => ({ JobsService: class {} }));
vi.mock('../../database/prisma.service', () => ({ PrismaService: class {} }));
vi.mock('../mail/mail.service', () => ({ MailService: class {} }));
vi.mock('./jobs-storage.service', () => ({ JobsStorageService: class {} }));
import { CandidateAccountService } from './candidate-account.service';
import { hashSecret } from './candidate-account.rules';

function build(overrides: Record<string, any> = {}) {
  const prisma: any = {
    candidateLoginCode: { count: vi.fn(async () => 0), create: vi.fn(async () => ({})), findFirst: vi.fn(async () => null), update: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({})) },
    candidateAccount: { upsert: vi.fn(async ({ where }: any) => ({ id: 'acc-1', email: where.email })), update: vi.fn(async ({ data }: any) => ({ id: 'acc-1', email: 'c@x.com', ...data })), delete: vi.fn(async () => ({})) },
    candidateSession: { create: vi.fn(async () => ({})), findUnique: vi.fn(async () => null), deleteMany: vi.fn(async () => ({})) },
    application: { findMany: vi.fn(async () => []), groupBy: vi.fn(async () => []) },
    ...overrides,
  };
  const mail: any = { send: vi.fn(async () => ({ sent: true })) };
  const storage: any = { save: vi.fn(), remove: vi.fn(), read: vi.fn(async () => Buffer.from('%PDF-1.4 x')) };
  const jobs: any = { apply: vi.fn(async () => ({ received: true, applicationId: 'app-1' })) };
  return { svc: new CandidateAccountService(prisma, mail, storage, jobs), prisma, mail, storage, jobs };
}

describe('login por código', () => {
  it('manda o código por e-mail e guarda só o hash', async () => {
    const { svc, prisma, mail } = build();
    expect(await svc.requestCode(' Camila@Exemplo.com ')).toEqual({ sent: true });
    const saved = prisma.candidateLoginCode.create.mock.calls[0][0].data;
    expect(saved.email).toBe('camila@exemplo.com');
    const sentCode = /\b(\d{6})\b/.exec(mail.send.mock.calls[0][1].text)![1];
    expect(saved.codeHash).toBe(hashSecret(`camila@exemplo.com:${sentCode}`));
    expect(JSON.stringify(saved)).not.toContain(sentCode);
  });

  it('não dispara e-mail demais e responde igual', async () => {
    const { svc, mail } = build({ candidateLoginCode: { count: vi.fn(async () => 3), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() } });
    expect(await svc.requestCode('camila@exemplo.com')).toEqual({ sent: true });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('e-mail inválido responde igual e não envia nada', async () => {
    const { svc, mail } = build();
    expect(await svc.requestCode('nao-e-email')).toEqual({ sent: true });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('código errado soma tentativa e recusa', async () => {
    const row = { id: 'c1', codeHash: hashSecret('camila@exemplo.com:123456'), attempts: 0 };
    const { svc, prisma } = build({ candidateLoginCode: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(async () => row), update: vi.fn(async () => ({})), deleteMany: vi.fn() } });
    await expect(svc.verifyCode('camila@exemplo.com', '000000')).rejects.toThrow('Código inválido');
    expect(prisma.candidateLoginCode.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { attempts: { increment: 1 } } });
  });

  it('bloqueia depois de 5 tentativas, mesmo com o código certo', async () => {
    const row = { id: 'c1', codeHash: hashSecret('camila@exemplo.com:123456'), attempts: 5 };
    const { svc } = build({ candidateLoginCode: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(async () => row), update: vi.fn(), deleteMany: vi.fn() } });
    await expect(svc.verifyCode('camila@exemplo.com', '123456')).rejects.toThrow('Código inválido');
  });

  it('código certo cria a conta, usa o código uma vez e devolve a sessão (só o hash fica no banco)', async () => {
    const row = { id: 'c1', codeHash: hashSecret('camila@exemplo.com:123456'), attempts: 1 };
    const { svc, prisma } = build({
      candidateLoginCode: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(async () => row), update: vi.fn(async () => ({})), deleteMany: vi.fn() },
    });
    const result = await svc.verifyCode('camila@exemplo.com', '123456');
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(prisma.candidateLoginCode.update.mock.calls[0][0].data.usedAt).toBeInstanceOf(Date);
    expect(prisma.candidateSession.create.mock.calls[0][0].data.tokenHash).toBe(hashSecret(result.token));
    expect(prisma.candidateSession.create.mock.calls[0][0].data.tokenHash).not.toBe(result.token);
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
    const { svc, jobs } = build();
    const result = await svc.applyWithProfile(full, 'j1', { consent: true });
    expect(result).toEqual({ received: true, applicationId: 'app-1' });
    const [jobId, fields, file] = jobs.apply.mock.calls[0];
    expect(jobId).toBe('j1');
    expect(fields).toMatchObject({ name: 'Camila', email: 'c@x.com', phone: '(11) 91234-5678', consent: true, answers: '{}' });
    expect(file.filename).toBe('cv.pdf');
    expect(Buffer.isBuffer(file.buffer)).toBe(true);
  });
});
