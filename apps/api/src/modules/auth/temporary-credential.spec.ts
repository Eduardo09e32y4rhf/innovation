import { describe, expect, it } from 'vitest';
import { isTemporaryCredentialUsable } from './temporary-credential';

const now = new Date('2026-10-08T12:00:00Z');
const future = new Date('2026-10-09T12:00:00Z');
const past = new Date('2026-10-07T12:00:00Z');

describe('isTemporaryCredentialUsable', () => {
  it('aceita dentro da validade', () => expect(isTemporaryCredentialUsable({ expiresAt: future }, now)).toBe(true));
  it('recusa expirada, inclusive no instante exato', () => {
    expect(isTemporaryCredentialUsable({ expiresAt: past }, now)).toBe(false);
    expect(isTemporaryCredentialUsable({ expiresAt: now }, now)).toBe(false);
  });
  it('recusa revogada ou consumida', () => {
    expect(isTemporaryCredentialUsable({ expiresAt: future, revokedAt: past }, now)).toBe(false);
    expect(isTemporaryCredentialUsable({ expiresAt: future, consumedAt: past }, now)).toBe(false);
  });
});