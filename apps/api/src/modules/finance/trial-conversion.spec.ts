import { describe, expect, it, vi } from 'vitest';
import { TrialConversionService } from './trial-conversion.service';
import { trialCountdownContent, trialCountdownKey, trialCountdownStage, trialDaysLeft } from './trial-lifecycle';
import { isFeatureEnabled } from '../../common/feature-flags';

const d = (s: string) => new Date(s);
const END = d('2026-10-22T14:00:00Z'); // fim do teste: 22/10 11h em Sao Paulo

describe('avisos do fim do teste: qual dia dispara', () => {
  it('dispara apenas 7, 3 e 1 dia antes (dias de calendario em Sao Paulo)', () => {
    const stage = (iso: string) => trialCountdownStage(END, d(iso));
    expect(stage('2026-10-15T12:00:00Z')).toBe(7);
    expect(stage('2026-10-19T12:00:00Z')).toBe(3);
    expect(stage('2026-10-21T12:00:00Z')).toBe(1);
    for (const iso of ['2026-10-14T12:00:00Z', '2026-10-16T12:00:00Z', '2026-10-18T12:00:00Z', '2026-10-20T12:00:00Z', '2026-10-22T12:00:00Z', '2026-10-23T12:00:00Z']) expect(stage(iso)).toBeNull();
    expect(trialCountdownStage(null, d('2026-10-21T12:00:00Z'))).toBeNull();
  });
  it('a hora do dia nao muda o aviso: 23h30 em SP do dia 21 (02:30Z do dia 22) ainda e D-1', () => {
    expect(trialDaysLeft(END, d('2026-10-22T02:30:00Z'))).toBe(1);
    expect(trialDaysLeft(END, d('2026-10-22T03:00:00Z'))).toBe(0);
  });
  it('a chave muda por empresa, data de fim, aviso, canal e destinatario', () => {
    const base = { companyId: 'c1', trialEndsAt: END, stage: 7 as const, channel: 'EMAIL' as const, recipient: 'A@x.com' };
    expect(trialCountdownKey(base)).toBe('trial-countdown:c1:2026-10-22:D7:EMAIL:a@x.com');
    expect(trialCountdownKey({ ...base, stage: 3 })).not.toBe(trialCountdownKey(base));
    expect(trialCountdownKey({ ...base, channel: 'INTERNAL', recipient: undefined })).toBe('trial-countdown:c1:2026-10-22:D7:INTERNAL');
  });
  it('o texto diz amanha/em N dias, a data e o valor', () => {
    expect(trialCountdownContent({ stage: 1, trialEndsAt: END, planName: 'Básico', amount: 99.99 }).title).toContain('amanhã');
    const c = trialCountdownContent({ stage: 7, trialEndsAt: END, planName: 'Básico', amount: 99.99 });
    expect(c.title).toContain('7 dias');
    expect(c.message).toContain('22/10/2026');
    expect(c.message).toMatch(/99,99/);
  });
});

/** Banco em memoria minimo: so o que o servico usa, com chave unica de verdade (P2002). */
function setup(overrides: { company?: any; subscriptions?: any[]; mailSent?: boolean } = {}) {
  const logs = new Map<string, any>();
  const invoices = new Map<string, any>();
  const prisma: any = {
    company: { findUnique: vi.fn(async () => overrides.company ?? null) },
    companySubscription: { findMany: vi.fn(async () => overrides.subscriptions ?? []) },
    platformInvoice: {
      findUnique: vi.fn(async ({ where }: any) => invoices.get(where.chargeRequestKey) ?? null),
      create: vi.fn(async ({ data }: any) => {
        if (invoices.has(data.chargeRequestKey)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        const row = { id: `inv-${invoices.size + 1}`, ...data };
        invoices.set(data.chargeRequestKey, row);
        return row;
      }),
    },
    financeNotificationLog: {
      create: vi.fn(async ({ data }: any) => {
        if (logs.has(data.idempotencyKey)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        logs.set(data.idempotencyKey, { ...data });
        return data;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const row = logs.get(where.idempotencyKey);
        if (!row || row.status !== where.status) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
      update: vi.fn(async ({ where, data }: any) => { Object.assign(logs.get(where.idempotencyKey), data); return data; }),
    },
  };
  const platformFinance = { attachFirstInvoiceLink: vi.fn(async () => undefined) };
  const notifications = { createSystemNotice: vi.fn(async () => ({ count: 1, id: 'n1' })) };
  const mail = { send: vi.fn(async () => ({ sent: overrides.mailSent ?? true, provider: (overrides.mailSent === false ? 'none' : 'resend') as 'none' | 'resend' })) };
  const service = new TrialConversionService(prisma, platformFinance as any, notifications as any, mail as any);
  return { service, prisma, logs, invoices, platformFinance, notifications, mail };
}

const plan = { id: 'p1', name: 'Básico', isFree: false, commitmentMonths: 1, baseMonthlyPrice: 99.99, userMonthlyPrice: 2.5, includedUnits: 10, price: 99.99, discountPercent: 0, pricingVersion: '2026.2' };
const company = (extra: any = {}) => ({ id: 'c1', name: 'Acme', trialEndsAt: END, asaasSubscriptionId: null, platformPlan: plan, subscription: { seatQuantity: 12, pricingVersion: '2026.2', baseMonthlyPrice: null, couponType: null, couponCyclesLeft: null, asaasSubscriptionId: null, mpPreapprovalId: null, ...extra }, ...extra.company });

describe('primeira fatura no fim do teste (sem propostas)', () => {
  const now = d('2026-10-22T15:00:00Z');
  it('gera a fatura pelo preco unico: 12 unidades do Basico = 9999 + 2 x 250 = R$ 104,99, vencendo em 3 dias', async () => {
    const { service, invoices, platformFinance } = setup({ company: company() });
    const r = await service.generateFirstInvoice('c1', now);
    expect(r).toMatchObject({ created: true, amountCents: 10_499 });
    const inv = [...invoices.values()][0];
    expect(Number(inv.amount)).toBe(104.99);
    expect(inv.chargeRequestKey).toBe('first-invoice:c1:2026-10-22');
    expect(inv.dueDate.toISOString()).toBe('2026-10-25T00:00:00.000Z');
    expect(inv.pricingSnapshot).toMatchObject({ source: 'TRIAL_CONVERSION', cycleTotalCents: 10_499, extraCents: 500 });
    expect(platformFinance.attachFirstInvoiceLink).toHaveBeenCalledWith(inv.id);
  });
  it('e idempotente por empresa e ciclo: rodar duas vezes nao duplica nem recria o link', async () => {
    const { service, invoices, platformFinance } = setup({ company: company() });
    await service.generateFirstInvoice('c1', now);
    const second = await service.generateFirstInvoice('c1', d('2026-10-23T09:00:00Z'));
    expect(second).toMatchObject({ created: false, reason: 'ALREADY_CREATED' });
    expect(invoices.size).toBe(1);
    expect(platformFinance.attachFirstInvoiceLink).toHaveBeenCalledTimes(1);
  });
  it('corrida: se a chave ja existe no banco (P2002) devolve ALREADY_CREATED sem erro', async () => {
    const { service, prisma } = setup({ company: company() });
    prisma.platformInvoice.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await service.generateFirstInvoice('c1', now)).toMatchObject({ created: false, reason: 'ALREADY_CREATED' });
  });
  it('aplica o cupom vigente e o preco contratado (pricingVersion antiga)', async () => {
    const { service } = setup({ company: company({ couponType: 'PERCENT', couponValue: 10, couponCyclesLeft: 2, pricingVersion: '2026.1', baseMonthlyPrice: 79.99 }) });
    // base 7999 + 2 x 250 = 8499; cupom 10% = 850 (849,9); total 7649
    expect(await service.generateFirstInvoice('c1', now)).toMatchObject({ created: true, amountCents: 7649 });
  });
  it('plano gratis, cupom 100% e recorrencia ja criada no provedor nao geram fatura', async () => {
    expect(await setup({ company: { ...company(), platformPlan: { ...plan, isFree: true } } }).service.generateFirstInvoice('c1', now)).toMatchObject({ created: false, reason: 'FREE_OR_NO_PLAN' });
    expect(await setup({ company: company({ couponType: 'PERCENT', couponValue: 100 }) }).service.generateFirstInvoice('c1', now)).toMatchObject({ created: false, reason: 'ZERO_AMOUNT' });
    expect(await setup({ company: company({ asaasSubscriptionId: 'sub_1' }) }).service.generateFirstInvoice('c1', now)).toMatchObject({ created: false, reason: 'PROVIDER_RECURRING' });
    expect(await setup({ company: null as any }).service.generateFirstInvoice('x', now)).toMatchObject({ created: false, reason: 'NO_COMPANY' });
  });
  it('falha ao gerar o link nao desfaz a fatura local', async () => {
    const { service, invoices, platformFinance } = setup({ company: company() });
    platformFinance.attachFirstInvoiceLink.mockRejectedValueOnce(new Error('asaas fora'));
    expect(await service.generateFirstInvoice('c1', now)).toMatchObject({ created: true });
    expect(invoices.size).toBe(1);
  });
});

describe('avisos 7, 3 e 1 dia antes: e-mail e notificacao no sistema, idempotentes', () => {
  const sub = (endsAt = END) => ({
    companyId: 'c1', trialEndsAt: endsAt, seatQuantity: 12, plan, pricingVersion: '2026.2', baseMonthlyPrice: null,
    company: { id: 'c1', slug: 'acme', users: [{ name: 'Ana', email: 'ana@acme.com' }, { name: 'Beto', email: 'beto@acme.com' }] },
  });
  it('no D-3 envia 1 notificacao e 1 e-mail por administrador, com o valor da primeira fatura', async () => {
    const { service, notifications, mail } = setup({ subscriptions: [sub()] });
    const r = await service.sendCountdownWarnings(d('2026-10-19T12:00:00Z'));
    expect(r).toEqual({ checked: 1, internal: 1, emails: 2 });
    expect(notifications.createSystemNotice).toHaveBeenCalledWith('c1', expect.objectContaining({ targetRoles: ['ADMIN'], source: 'TRIAL_COUNTDOWN', title: expect.stringContaining('3 dias'), message: expect.stringContaining('104,99') }));
    expect(mail.send).toHaveBeenCalledTimes(2);
  });
  it('rodar o cron de novo no mesmo dia (a cada hora) nao reenvia nada', async () => {
    const { service, notifications, mail } = setup({ subscriptions: [sub()] });
    await service.sendCountdownWarnings(d('2026-10-19T12:00:00Z'));
    const again = await service.sendCountdownWarnings(d('2026-10-19T18:00:00Z'));
    expect(again).toEqual({ checked: 1, internal: 0, emails: 0 });
    expect(notifications.createSystemNotice).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledTimes(2);
  });
  it('cada marco (D-7, D-3, D-1) envia uma vez; dias fora dos marcos nao enviam', async () => {
    const { service, notifications } = setup({ subscriptions: [sub()] });
    for (const day of ['15', '16', '17', '18', '19', '20', '21']) await service.sendCountdownWarnings(d(`2026-10-${day}T12:00:00Z`));
    expect(notifications.createSystemNotice).toHaveBeenCalledTimes(3);
    for (const day of ['15', '19', '21']) await service.sendCountdownWarnings(d(`2026-10-${day}T20:00:00Z`));
    expect(notifications.createSystemNotice).toHaveBeenCalledTimes(3);
  });
  it('e-mail que falhou e tentado de novo na proxima rodada, sem repetir a notificacao ja enviada', async () => {
    const { service, notifications, mail, logs } = setup({ subscriptions: [sub()] });
    mail.send.mockResolvedValueOnce({ sent: false, provider: 'resend' as any, error: 'timeout' } as any);
    await service.sendCountdownWarnings(d('2026-10-19T12:00:00Z'));
    expect([...logs.values()].filter((l) => l.status === 'FAILED')).toHaveLength(1);
    const again = await service.sendCountdownWarnings(d('2026-10-19T13:00:00Z'));
    expect(again).toMatchObject({ internal: 0, emails: 1 });
    expect(notifications.createSystemNotice).toHaveBeenCalledTimes(1);
  });
  it('sem provedor de e-mail o registro vira SKIPPED e nao fica repetindo a cada hora', async () => {
    const { service, mail, logs } = setup({ subscriptions: [sub()], mailSent: false });
    await service.sendCountdownWarnings(d('2026-10-19T12:00:00Z'));
    await service.sendCountdownWarnings(d('2026-10-19T13:00:00Z'));
    expect(mail.send).toHaveBeenCalledTimes(2);
    expect([...logs.values()].filter((l) => l.status === 'SKIPPED')).toHaveLength(2);
  });
});

describe('modulos congelados: o fim do teste depende das flags', () => {
  it('propostas e contratos manuais ficam desligados por padrao', () => {
    expect(isFeatureEnabled('proposals', {})).toBe(false);
    expect(isFeatureEnabled('manual-contracts', {})).toBe(false);
    expect(isFeatureEnabled('proposals', { FEATURE_PROPOSALS: 'true' })).toBe(true);
    expect(isFeatureEnabled('manual-contracts', { FEATURE_MANUAL_CONTRACTS: '1' })).toBe(true);
  });
});
