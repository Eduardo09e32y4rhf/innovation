import { describe, expect, it } from 'vitest';
import { resolveSub, subsFor } from '../../../apps/web/app/[tenant]/dashboard/platform/_hub/sections';
import { TAB_POLICY } from '../../../apps/web/app/[tenant]/dashboard/platform/_hub/types';

describe('dossie da empresa na tela unica', () => {
  it('DEV, CEO e COMERCIAL abrem o dossie com 7 subsecoes; CONTABIL nao', () => {
    for (const role of ['DEV', 'CEO', 'COMERCIAL']) {
      expect(subsFor('dossie', role).map((s) => s.key)).toEqual(['general', 'subscription', 'finance', 'users', 'documents', 'support', 'logs']);
      expect(TAB_POLICY[role]).toContain('dossie');
    }
    expect(subsFor('dossie', 'CONTABIL')).toEqual([]);
    expect(TAB_POLICY.CONTABIL).not.toContain('dossie');
  });
  it('subsecao invalida cai em general (links antigos ?tab=users etc. continuam validos)', () => {
    expect(resolveSub('dossie', 'users', 'DEV')).toBe('users');
    expect(resolveSub('dossie', 'xyz', 'CEO')).toBe('general');
  });
});