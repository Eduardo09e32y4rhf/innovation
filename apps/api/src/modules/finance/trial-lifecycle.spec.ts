import { describe, expect, it } from 'vitest';
import { shouldSendTrialNotice, trialNoticeContent, trialOutcome } from './trial-lifecycle';

const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe('teste grátis: aviso do 9º dia', () => {
  const end = d('2026-10-22');
  it('avisa quando faltam 2 dias ou menos, uma única vez', () => {
    expect(shouldSendTrialNotice({ trialEndsAt: end, trialNoticeAt: null, now: d('2026-10-20') })).toBe(true);
    expect(shouldSendTrialNotice({ trialEndsAt: end, trialNoticeAt: null, now: d('2026-10-21') })).toBe(true);
    expect(shouldSendTrialNotice({ trialEndsAt: end, trialNoticeAt: d('2026-10-20'), now: d('2026-10-21') })).toBe(false);
  });
  it('não avisa cedo demais nem depois do fim', () => {
    expect(shouldSendTrialNotice({ trialEndsAt: end, trialNoticeAt: null, now: d('2026-10-15') })).toBe(false);
    expect(shouldSendTrialNotice({ trialEndsAt: end, trialNoticeAt: null, now: d('2026-10-23') })).toBe(false);
    expect(shouldSendTrialNotice({ trialEndsAt: null, trialNoticeAt: null, now: d('2026-10-21') })).toBe(false);
  });
});

describe('teste grátis: fim do período', () => {
  it('recusou = cancela; sem recusa = cobra', () => {
    expect(trialOutcome({ trialDeclinedAt: new Date() })).toBe('CANCEL');
    expect(trialOutcome({ trialDeclinedAt: null })).toBe('CHARGE');
  });
  it('o aviso diz a data, o valor e as duas opções', () => {
    const c = trialNoticeContent({ trialEndsAt: d('2026-10-22'), planName: 'Completo', amount: 199.99 });
    expect(c.message).toContain('22/10/2026');
    expect(c.message).toMatch(/199,99/);
    expect(c.message).toContain('Aceitar');
    expect(c.message).toContain('Recusar assinatura');
  });
});