import { describe, expect, it } from 'vitest';
import { isCeoOnboardingRestricted, isRouteAllowedDuringCeoOnboarding } from './ceo-onboarding-gate';

describe('onboarding do CEO', () => {
  it('restringe CEO em qualquer etapa pendente; libera ACTIVE, legado sem estado e outros perfis', () => {
    for (const s of ['INVITED', 'PASSWORD_CHANGE', 'FACE_ENROLLMENT', 'PROFILE_REQUIRED', 'CONTRACT_PENDING']) expect(isCeoOnboardingRestricted('CEO', s)).toBe(true);
    expect(isCeoOnboardingRestricted('CEO', 'ACTIVE')).toBe(false);
    expect(isCeoOnboardingRestricted('CEO', null)).toBe(false);
    expect(isCeoOnboardingRestricted('DEV', 'FACE_ENROLLMENT')).toBe(false);
    expect(isCeoOnboardingRestricted('ADMIN', 'CONTRACT_PENDING')).toBe(false);
  });

  it('so rotas de onboarding, autenticacao e termos; administracao e traversal negados', () => {
    for (const ok of ['/ceo-onboarding/state', '/auth/me', '/auth/change-password', '/me', '/legal/terms', '/api/ceo-onboarding/profile?x=1']) expect(isRouteAllowedDuringCeoOnboarding(ok)).toBe(true);
    for (const no of ['/users', '/platform/companies', '/employees', '/jobs', '/commercial-sales', '/ceo-onboarding/../users', '/me/../users', '//users', '/%2e%2e/users', '/auth-evil']) expect(isRouteAllowedDuringCeoOnboarding(no)).toBe(false);
  });

  it('CEO_ONBOARDING_ENFORCEMENT=off e a unica saida e nao afeta o padrao', () => {
    process.env.CEO_ONBOARDING_ENFORCEMENT = 'off';
    expect(isCeoOnboardingRestricted('CEO', 'FACE_ENROLLMENT')).toBe(false);
    delete process.env.CEO_ONBOARDING_ENFORCEMENT;
    expect(isCeoOnboardingRestricted('CEO', 'FACE_ENROLLMENT')).toBe(true);
  });
});