import { describe, expect, it, vi } from 'vitest';
import { QUESTION_BANK } from './candidate-question-bank';
import { ASSESSMENT_KINDS, essayWordCount, gradeAssessment, publicQuestions, selectAssessmentQuestions, validateAssessmentAnswers } from './candidate-assessment.rules';
import { hashPassword, hashPasswordAsync, verifyPasswordAsync } from './candidate-account.rules';
vi.mock('../../database/prisma.service', () => ({ PrismaService: class {} }));
import { CandidateAssessmentsService } from './candidate-assessments.service';
import { CandidateApplicationGuard } from './candidate-application.guard';
import { CandidateAccountController } from './candidate-account.controller';
import { PublicJobsController } from './public-jobs.controller';

function database() {
  const records = new Map<string, any>();
  let sequence = 0;
  const match = (row: any, where: any) => Object.entries(where).every(([key, value]) => row[key] === value);
  const delegate = {
    findUnique: vi.fn(async ({ where }: any) => where.accountId_kind ? records.get(`${where.accountId_kind.accountId}:${where.accountId_kind.kind}`) ?? null : [...records.values()].find(row => row.id === where.id) ?? null),
    findUniqueOrThrow: vi.fn(async (args: any) => { const row = await delegate.findUnique(args); if (!row) throw new Error('Missing record'); return row; }),
    create: vi.fn(async ({ data }: any) => { const key = `${data.accountId}:${data.kind}`; if (records.has(key)) throw { code: 'P2002' }; const row = { id: String(++sequence), revision: 0, status: 'IN_PROGRESS', essay: '', score: null, shareConsent: false, completedAt: null, ...data }; records.set(key, row); return row; }),
    updateMany: vi.fn(async ({ where, data }: any) => { const row = [...records.values()].find(value => match(value, where)); if (!row) return { count: 0 }; Object.assign(row, { ...data, revision: row.revision + data.revision.increment }); return { count: 1 }; }),
    findMany: vi.fn(async ({ where }: any) => [...records.values()].filter(row => match(row, where))),
  };
  const prisma: any = { candidatePortalAssessment: delegate, application: { findFirst: vi.fn(async () => null) }, candidateAccount: { findUnique: vi.fn(async () => null) } };
  return { prisma, service: new CandidateAssessmentsService(prisma), records };
}

describe('banco educacional', () => {
  it('tem exatamente 500 enunciados únicos, 250 por matéria, cinco alternativas distintas e gabarito válido', () => {
    expect(QUESTION_BANK).toHaveLength(500);
    expect(new Set(QUESTION_BANK.map(q => q.id)).size).toBe(500);
    expect(new Set(QUESTION_BANK.map(q => q.text)).size).toBe(500);
    for (const subject of ['PORTUGUESE', 'MATH']) expect(QUESTION_BANK.filter(q => q.subject === subject)).toHaveLength(250);
    for (const question of QUESTION_BANK) {
      expect(new Set(question.options).size).toBe(5);
      expect(question.correct).toBeGreaterThanOrEqual(0); expect(question.correct).toBeLessThan(5);
      expect(question.explanation.length).toBeGreaterThan(10);
      expect(question.text).not.toMatch(/voc\?|\uFFFD/);
    }
  });
  it('seleciona 20 perguntas de vários assuntos, preserva gabarito após embaralhar e não o envia ao cliente', () => {
    for (const kind of ['PORTUGUESE', 'MATH'] as const) for (let trial = 0; trial < 10; trial++) {
      const selected = selectAssessmentQuestions(kind);
      expect(selected).toHaveLength(20); expect(new Set(selected.map(q => q.id)).size).toBe(20);
      expect(new Set(selected.map(q => q.topic)).size).toBeGreaterThanOrEqual(10);
      for (const q of selected) { const original = QUESTION_BANK.find(item => item.id === q.id)!; expect(q.options[q.correct!]).toBe(original.options[original.correct]); }
      expect(JSON.stringify(publicQuestions(selected))).not.toMatch(/correct|explanation|weight/);
      expect(gradeAssessment(selected, Object.fromEntries(selected.map(q => [q.id, q.correct!])))).toBe(100);
    }
  });
  it('não atribui gabarito ou diagnóstico aos questionários de preferências', () => {
    for (const kind of ['CULTURE', 'WORK_STYLE'] as const) { const questions = selectAssessmentQuestions(kind); expect(questions).toHaveLength(12); expect(questions.every(q => q.correct === undefined && q.options.length === 5)).toBe(true); }
  });
  it('rejeita alternativas forjadas, tipos coercíveis, perguntas estranhas e conclusão incompleta', () => {
    const q = selectAssessmentQuestions('MATH');
    for (const value of [-1, 5, 1.5, '0', null, true]) expect(() => validateAssessmentAnswers(q, { [q[0].id]: value }, false)).toThrow();
    expect(() => validateAssessmentAnswers(q, { other: 1 }, false)).toThrow();
    expect(() => validateAssessmentAnswers(q, {}, true)).toThrow();
    expect(essayWordCount(' um  texto\ncom espaços ')).toBe(4);
  });
});

describe('persistência e privacidade das avaliações', () => {
  it('bloqueia candidaturas sem sessão, e-mail confirmado ou qualquer uma das três provas e não exige nota mínima', async () => {
    const list = vi.fn(); const guard = new CandidateApplicationGuard({ list } as any);
    const context = (account: unknown) => ({ switchToHttp: () => ({ getRequest: () => ({ candidateAccount: account }) }) }) as any;
    await expect(guard.canActivate(context(null))).rejects.toThrow();
    await expect(guard.canActivate(context({ id: 'a', verifiedAt: null }))).rejects.toThrow('Confirme');
    const required = ['PORTUGUESE', 'MATH', 'ESSAY'].map(kind => ({ kind, status: 'COMPLETED', score: 0 }));
    for (let missing = 0; missing < 3; missing++) { list.mockResolvedValue(required.filter((_, i) => i !== missing)); await expect(guard.canActivate(context({ id: 'a', verifiedAt: new Date() }))).rejects.toThrow('Conclua'); }
    list.mockResolvedValue(required); expect(await guard.canActivate(context({ id: 'a', verifiedAt: new Date() }))).toBe(true);
    for (const controller of [PublicJobsController, CandidateAccountController]) {
      const guards = Reflect.getMetadata('__guards__', controller.prototype.apply).map((item: any) => item.name);
      expect(guards.indexOf('CandidateAuthGuard')).toBeLessThan(guards.indexOf('CandidateApplicationGuard'));
      expect(guards).toContain('CandidateApplicationGuard');
    }
  });
  it('inícios concorrentes recebem a mesma prova e nunca recebem gabarito', async () => {
    const { service, records } = database();
    const rows = await Promise.all(Array.from({ length: 20 }, () => service.start('account-a', 'MATH')));
    expect(records.size).toBe(1); expect(new Set(rows.map(row => row.id)).size).toBe(1);
    expect(JSON.stringify(rows)).not.toContain('correct');
  });
  it('50 contas simultâneas preservam suas próprias respostas sem sobrescrita', async () => {
    const { service, records } = database();
    await Promise.all(Array.from({ length: 50 }, async (_, i) => {
      const owner = `account-${i}`; const row = await service.start(owner, 'MATH');
      await service.save(owner, 'MATH', { revision: 0, answers: { [row.questions[0].id]: i % 5 }, essay: '', complete: false, shareConsent: false });
      const restored = await service.start(owner, 'MATH');
      expect(restored.answers).toEqual({ [row.questions[0].id]: i % 5 });
    }));
    expect(records.size).toBe(50);
  });
  it('duas abas não sobrescrevem respostas e uma prova concluída não aceita reenvio', async () => {
    const { service, records } = database(); await service.start('a', 'MATH');
    const row = records.get('a:MATH'); const answers = Object.fromEntries(row.questions.map((q: any) => [q.id, q.correct]));
    const payload = { revision: 0, answers, essay: '', complete: true, shareConsent: false };
    const writes = await Promise.allSettled([service.save('a', 'MATH', payload), service.save('a', 'MATH', payload)]);
    expect(writes.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await service.start('a', 'MATH')).score).toBe(100);
    await expect(service.save('a', 'MATH', payload)).rejects.toThrow();
  });
  it('uma conta não consegue salvar ou compartilhar a prova de outra', async () => {
    const { service } = database(); await service.start('a', 'MATH');
    await expect(service.save('b', 'MATH', { revision: 0, answers: {}, essay: '', complete: false, shareConsent: true })).rejects.toThrow();
    await expect(service.share('b', 'MATH', true)).rejects.toThrow();
    expect((await service.list('b')).every(row => row.status === 'NOT_STARTED')).toBe(true);
  });
  it('redação exige tamanho válido e não ganha nota automática', async () => {
    const { service } = database(); await service.start('a', 'ESSAY');
    for (const count of [149, 601]) await expect(service.save('a', 'ESSAY', { revision: 0, answers: {}, essay: 'palavra '.repeat(count), complete: true, shareConsent: false })).rejects.toThrow();
    const result = await service.save('a', 'ESSAY', { revision: 0, answers: {}, essay: 'palavra '.repeat(150), complete: true, shareConsent: false });
    expect(result.status).toBe('COMPLETED'); expect(result.score).toBeNull();
  });
  it('não libera avaliações por coincidência de e-mail e respeita revogação', async () => {
    const { service, prisma } = database();
    prisma.application.findFirst.mockResolvedValue({ portalAccountId: null });
    expect(await service.sharedForApplication('company', 'app')).toEqual([]);
    expect(prisma.candidateAccount.findUnique).not.toHaveBeenCalled();
    prisma.application.findFirst.mockResolvedValue({ portalAccountId: 'a' }); prisma.candidateAccount.findUnique.mockResolvedValue({ id: 'a', verifiedAt: new Date() });
    const row = await service.start('a', 'CULTURE');
    await service.save('a', 'CULTURE', { revision: 0, answers: Object.fromEntries(row.questions.map(q => [q.id, 2])), essay: '', complete: true, shareConsent: true });
    expect(await service.sharedForApplication('company', 'app')).toHaveLength(1);
    await service.share('a', 'CULTURE', false);
    expect(await service.sharedForApplication('company', 'app')).toEqual([]);
    prisma.application.findFirst.mockResolvedValue(null);
    await expect(service.sharedForApplication('other-company', 'app')).rejects.toThrow();
  });
  it('todos os tipos de avaliação são enumerados e um tipo inventado é rejeitado', async () => {
    const { service } = database(); expect(await service.list('a')).toHaveLength(ASSESSMENT_KINDS.length);
    await expect(service.start('a', '__proto__')).rejects.toThrow();
  });
});

describe('senhas e concorrência', () => {
  it('mantém compatibilidade com senhas existentes e permite que o event loop continue', async () => {
    const stored = hashPassword('segredo123');
    expect(await verifyPasswordAsync('segredo123', stored)).toBe(true);
    expect(await verifyPasswordAsync('errada123', stored)).toBe(false);
    expect(await verifyPasswordAsync('segredo123', 'scrypt$bad$bad')).toBe(false);
    let ticked = false; const tick = new Promise<void>(resolve => setImmediate(() => { ticked = true; resolve(); }));
    const jobs = Array.from({ length: 8 }, (_, i) => hashPasswordAsync(`segredo${i}123`));
    await tick; expect(ticked).toBe(true);
    const hashes = await Promise.all(jobs); expect(new Set(hashes).size).toBe(8);
    for (let i = 0; i < hashes.length; i++) expect(await verifyPasswordAsync(`segredo${i}123`, hashes[i])).toBe(true);
  });
});
