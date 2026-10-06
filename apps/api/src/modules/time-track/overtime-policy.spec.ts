import { bankBalanceMinutes, bankWindowStart } from './overtime-policy';

type Row = Record<string, any>;

function fakePrisma(opts: { policy?: string; months?: number; credits?: Row[]; debits?: Row[] }) {
  return {
    overtimeRule: { findUnique: async () => (opts.policy ? { overtimePolicy: opts.policy, bankValidityMonths: opts.months ?? 3 } : null) },
    timeTrack: { groupBy: async (args: any) => ((args._sum as Row).overtimeBankMinutes !== undefined ? opts.credits ?? [] : opts.debits ?? []) },
  } as any;
}

describe('politica de hora extra e saldo do banco', () => {
  it('a janela de validade recua o numero de meses configurado', () => {
    const start = bankWindowStart(3, new Date('2026-10-06T12:00:00Z'));
    expect(start.toISOString().slice(0, 10)).toBe('2026-07-06');
  });

  it('empresa que paga a extra na folha nao tem banco de horas', async () => {
    const prisma = fakePrisma({ policy: 'PAYMENT', credits: [{ employeeId: 'a', _sum: { overtimeBankMinutes: 600 } }] });
    expect((await bankBalanceMinutes(prisma, 'c', ['a'])).get('a')).toBe(0);
  });

  it('sem regra cadastrada o padrao e pagamento (sem banco)', async () => {
    expect((await bankBalanceMinutes(fakePrisma({}), 'c', ['a'])).get('a')).toBe(0);
  });

  it('com banco, saldo = creditos aprovados menos debitos de atraso/saida/falta', async () => {
    const prisma = fakePrisma({
      policy: 'BANK',
      credits: [{ employeeId: 'a', _sum: { overtimeBankMinutes: 300 } }],
      debits: [{ employeeId: 'a', _sum: { dailyBalance: -90 } }],
    });
    const balances = await bankBalanceMinutes(prisma, 'c', ['a', 'b']);
    expect(balances.get('a')).toBe(210);
    expect(balances.get('b')).toBe(0);
  });
});
