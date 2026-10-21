import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ceoOnboardingPending, isValidCpf, stepIndex } from '../../../apps/web/app/ceo-onboarding/steps';

// O onboarding do CEO e um modulo congelado (padrao); estes testes cobrem o comportamento com ele ligado.
// O caso "congelado" esta em frozen-features.spec.ts.
beforeEach(() => { process.env.NEXT_PUBLIC_FEATURE_CEO_ONBOARDING = 'true'; });
afterEach(() => { delete process.env.NEXT_PUBLIC_FEATURE_CEO_ONBOARDING; });

describe('onboarding do CEO (frontend)', () => {
  it('so CEO com etapa pendente e redirecionado', () => {
    for (const s of ['INVITED', 'PASSWORD_CHANGE', 'FACE_ENROLLMENT', 'PROFILE_REQUIRED', 'CONTRACT_PENDING'] as const) expect(ceoOnboardingPending({ profile: 'CEO', onboardingState: s })).toBe(true);
    expect(ceoOnboardingPending({ profile: 'CEO', onboardingState: 'ACTIVE' })).toBe(false);
    expect(ceoOnboardingPending({ profile: 'CEO', onboardingState: null })).toBe(false);
    expect(ceoOnboardingPending({ profile: 'DEV', onboardingState: 'CONTRACT_PENDING' })).toBe(false);
    expect(ceoOnboardingPending(null)).toBe(false);
  });
  it('indice da etapa', () => {
    expect(stepIndex('PASSWORD_CHANGE')).toBe(0);
    expect(stepIndex('FACE_ENROLLMENT')).toBe(1);
    expect(stepIndex('PROFILE_REQUIRED')).toBe(1);
    expect(stepIndex('CONTRACT_PENDING')).toBe(2);
    expect(stepIndex('ACTIVE')).toBe(3);
  });
  it('CPF: valida digitos verificadores e rejeita repetidos', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    for (const bad of ['111.111.111-11', '529.982.247-24', '123', '']) expect(isValidCpf(bad)).toBe(false);
  });
});