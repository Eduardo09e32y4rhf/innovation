import { describe, expect, it } from 'vitest';
import { validateEnv } from '../config/env.validation';
import { FROZEN_FEATURES, featureEnvName, featureFlagProblems, isFeatureEnabled, parseFlag } from './feature-flags';

describe('feature flags', () => {
  it('o nome da variavel segue FEATURE_<NOME> em maiusculas', () => {
    expect(featureEnvName('ai')).toBe('FEATURE_AI');
    expect(featureEnvName('commercial-sales')).toBe('FEATURE_COMMERCIAL_SALES');
    expect(featureEnvName('manual-contracts')).toBe('FEATURE_MANUAL_CONTRACTS');
    expect(featureEnvName('ceo-onboarding')).toBe('FEATURE_CEO_ONBOARDING');
  });

  it('o padrao e DESLIGADO para todos os modulos congelados', () => {
    expect(FROZEN_FEATURES).toHaveLength(8);
    for (const name of FROZEN_FEATURES) expect(isFeatureEnabled(name, {})).toBe(false);
  });

  it.each(['true', 'TRUE', '1', 'on', 'yes', ' true '])('liga com %j', (value) => {
    expect(isFeatureEnabled('ai', { FEATURE_AI: value })).toBe(true);
  });

  it.each(['false', '0', 'off', 'no', '', 'talvez'])('continua desligada com %j', (value) => {
    expect(isFeatureEnabled('ai', { FEATURE_AI: value })).toBe(false);
  });

  it('uma flag nao liga outra', () => {
    expect(isFeatureEnabled('partners', { FEATURE_AI: 'true' })).toBe(false);
    expect(isFeatureEnabled('commercial-sales', { FEATURE_PROPOSALS: 'true' })).toBe(false);
  });

  it('valor que nao e booleano e apontado na validacao do ambiente', () => {
    expect(parseFlag('maybe')).toBeUndefined();
    expect(featureFlagProblems({ FEATURE_AI: 'maybe' })).toEqual(['FEATURE_AI must be true or false (got "maybe").']);
    expect(featureFlagProblems({ FEATURE_AI: 'true', FEATURE_PARTNERS: 'false', FEATURE_PROPOSALS: '' })).toEqual([]);
    expect(featureFlagProblems({})).toEqual([]);
  });

  it('validateEnv recusa flag invalida e aceita as validas', () => {
    const base = { DATABASE_URL: 'postgresql://x', JWT_SECRET: 'segredo-de-teste' };
    expect(() => validateEnv({ ...base, FEATURE_COMMUNICATION: 'quem-sabe' })).toThrow(/FEATURE_COMMUNICATION/);
    expect(() => validateEnv({ ...base, FEATURE_COMMUNICATION: 'true', FEATURE_AI: 'false' })).not.toThrow();
  });
});
