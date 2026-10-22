import { describe, expect, it } from 'vitest';
import { trialOutcome } from './trial-lifecycle';


describe('teste grátis: fim do período', () => {
  it('recusou = cancela; sem recusa = cobra', () => {
    expect(trialOutcome({ trialDeclinedAt: new Date() })).toBe('CANCEL');
    expect(trialOutcome({ trialDeclinedAt: null })).toBe('CHARGE');
  });
});