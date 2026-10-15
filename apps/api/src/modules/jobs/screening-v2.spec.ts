import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InternalJobsService } from './internal-jobs.service';
import { evaluateAnswer, questionWeight, screeningScore, weightShares, type RuleQuestion } from './recruitment-rules';
import { RecruitmentService } from './recruitment.service';

const q = (over: Partial<RuleQuestion>): RuleQuestion => ({ id: 'q', label: 'Pergunta', type: 'SELECT', required: true, options: ['A', 'B', 'C'], knockout: null, scoreRule: null, ...over });

describe('triagem em % (nunca passa de 100%)', () => {
  const exp = q({ id: 'exp', options: ['Sem', 'Pouca', 'Muita'], scoreRule: { v: 2, weight: 3, levels: { Sem: 0, Pouca: 40, Muita: 100 } } });
  const cnh = q({ id: 'cnh', type: 'YESNO', options: [], scoreRule: { v: 2, weight: 1, levels: { Sim: 100, Não: 0 } }, knockout: { acceptValues: ['Sim'], action: 'REJECT' } });
  const turnos = q({ id: 't', type: 'MULTI', options: ['Manhã', 'Tarde', 'Noite'], scoreRule: { v: 2, weight: 2, levels: { Manhã: 100, Tarde: 100, Noite: 40 } } });
  const salario = q({ id: 's', type: 'NUMBER', options: [], scoreRule: { v: 2, weight: 1, ranges: [{ max: 3000, pct: 100 }] }, knockout: { max: 5000, action: 'FLAG' } });
  const info = q({ id: 'i', type: 'TEXT', options: [] });

  it('peso e participacao de cada pergunta somam 100%', () => {
    expect([exp, cnh, turnos, salario, info].map(questionWeight)).toEqual([3, 1, 2, 1, 0]);
    expect(weightShares([exp, cnh, turnos, salario, info])).toEqual([43, 14, 29, 14, 0]);
  });

  it('nota ponderada de 0 a 100; multipla escolha vale a melhor marcada', () => {
    const all = [evaluateAnswer(exp, 'Muita'), evaluateAnswer(cnh, 'Sim'), evaluateAnswer(turnos, 'Manhã|Tarde|Noite'), evaluateAnswer(salario, '2500')];
    expect(all.map((item) => item.points)).toEqual([100, 100, 100, 100]);
    expect(screeningScore(all)).toBe(100);
    const mid = [evaluateAnswer(exp, 'Pouca'), evaluateAnswer(cnh, 'Sim'), evaluateAnswer(turnos, 'Noite'), evaluateAnswer(salario, '4000')];
    expect(screeningScore(mid)).toBe(Math.round((40 * 3 + 100 + 40 * 2 + 0) / 7));
    expect(screeningScore([evaluateAnswer(info, 'oi')])).toBeNull();
  });

  it('formato antigo (pontos livres) vira % e nao estoura 100%', () => {
    const legacy = q({ scoreRule: { points: { A: 10, B: 50, C: 200 } } });
    expect(evaluateAnswer(legacy, 'C').points).toBe(100);
    expect(evaluateAnswer(legacy, 'B').points).toBe(25);
    const multi = q({ type: 'MULTI', scoreRule: { points: { A: 1, B: 1, C: 2 } } });
    expect(evaluateAnswer(multi, 'A|B|C').points).toBe(100);
  });

  it('nota minima da vaga: abaixo dela sinaliza ou reprova; eliminatoria continua valendo', async () => {
    const svc = new RecruitmentService({} as any);
    const answers = new Map([['exp', 'Sem'], ['cnh', 'Sim']]);
    const low = await svc.evaluateApplication([exp, cnh], answers, { minScore: 60, action: 'REJECT' });
    expect(low).toMatchObject({ score: 25, scored: true, knockedOut: true, reject: true });
    expect(low.reason).toContain('25% abaixo do mínimo de 60%');
    expect((await svc.evaluateApplication([exp, cnh], answers, { minScore: 60, action: 'FLAG' })).reject).toBe(false);
    const knock = await svc.evaluateApplication([exp, cnh], new Map([['exp', 'Muita'], ['cnh', 'Não']]), { minScore: null });
    expect(knock).toMatchObject({ knockedOut: true, reject: true });
    expect((await svc.evaluateApplication([info], new Map([['i', 'x']]))).scored).toBe(false);
  });
});

describe('vaga interna pelo link: matricula + CPF', () => {
  function build(employees: any[]) {
    const tx: any = {
      $executeRaw: vi.fn(), candidate: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({ id: 'cand' })) },
      application: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({ id: 'app' })) },
      hiringPipeline: { findFirst: vi.fn(async () => ({ id: 'p' })) },
      pipelineStage: { findMany: vi.fn(async () => [{ id: 's1', kind: 'APPLIED', name: 'Recebidos' }, { id: 's9', kind: 'REJECTED', name: 'Reprovados' }]) },
    };
    const prisma: any = {
      job: { findFirst: vi.fn(async () => ({ id: 'j1', companyId: 'c1', title: 'Vendedor', status: 'OPEN', closedAt: null, updatedAt: new Date(), deadline: null, pipelineId: null, screeningMinScore: null, screeningAction: null, questions: [] })) },
      employee: { findMany: vi.fn(async () => employees) },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    };
    const svc = new InternalJobsService(prisma, { createSystemNotice: vi.fn() } as any, new RecruitmentService({} as any));
    return { svc, prisma, tx };
  }
  const ana = { id: 'e1', name: 'Ana Souza', email: 'ana@x.com', phone: '11999', cpf: '123.456.789-09', registration: '1001', cep: '1', street: 'R', city: 'SP', birthDate: new Date(), updatedAt: new Date() };

  it('aceita quando matricula e CPF batem com funcionario ativo da empresa', async () => {
    const { svc, prisma, tx } = build([ana]);
    const result = await svc.applyPublic('j1', { registration: '1001', cpf: '12345678909', consent: true } as any);
    expect(result).toEqual({ received: true, name: 'Ana' });
    expect(prisma.employee.findMany.mock.calls[0][0].where).toMatchObject({ companyId: 'c1', status: { in: ['ACTIVE', 'ONBOARDING'] } });
    expect(tx.application.create.mock.calls[0][0].data).toMatchObject({ source: 'INTERNAL', employeeId: 'e1', status: 'APPLIED' });
  });
  it('CPF errado ou matricula inexistente: mesma mensagem, sem revelar quem existe', async () => {
    const wrong = build([ana]);
    await expect(wrong.svc.applyPublic('j1', { registration: '1001', cpf: '98765432100', consent: true } as any)).rejects.toThrow(/não conferem/);
    const none = build([]);
    await expect(none.svc.applyPublic('j1', { registration: '9999', cpf: '12345678909', consent: true } as any)).rejects.toThrow(/não conferem/);
    await expect(none.svc.applyPublic('j1', { registration: '1001', cpf: '123', consent: true } as any)).rejects.toThrow(BadRequestException);
    await expect(none.svc.applyPublic('j1', { registration: '1001', cpf: '12345678909', consent: false } as any)).rejects.toThrow(/aceitar/);
  });
  it('nao duplica candidatura', async () => {
    const { svc, tx } = build([ana]);
    tx.application.findFirst.mockResolvedValueOnce({ id: 'old' });
    await expect(svc.applyPublic('j1', { registration: '1001', cpf: '123.456.789-09', consent: true } as any)).rejects.toThrow(ConflictException);
  });
});
