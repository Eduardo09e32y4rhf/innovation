import { afterEach, describe, expect, it } from 'vitest';
import { isOwnerTargetedByOther, isPlatformOwner } from './platform-owner';

const OLD = { id: process.env.PLATFORM_OWNER_USER_ID, email: process.env.PLATFORM_OWNER_EMAIL };
afterEach(() => {
  for (const [k, v] of [['PLATFORM_OWNER_USER_ID', OLD.id], ['PLATFORM_OWNER_EMAIL', OLD.email]] as const) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

describe('dono da plataforma', () => {
  it('com ID configurado, e-mail igual ao do dono nao concede identidade', () => {
    process.env.PLATFORM_OWNER_USER_ID = 'owner-1';
    process.env.PLATFORM_OWNER_EMAIL = 'dono@x.com';
    expect(isPlatformOwner({ id: 'owner-1', email: 'qualquer@x.com' })).toBe(true);
    expect(isPlatformOwner({ id: 'outro', email: 'dono@x.com' })).toBe(false);
    expect(isPlatformOwner({ sub: 'owner-1' })).toBe(true);
  });

  it('sem ID, usa e-mail legado; sem nenhum dos dois, ninguem e dono', () => {
    delete process.env.PLATFORM_OWNER_USER_ID;
    process.env.PLATFORM_OWNER_EMAIL = 'Dono@x.com';
    expect(isPlatformOwner({ id: 'a', email: 'dono@x.com' })).toBe(true);
    delete process.env.PLATFORM_OWNER_EMAIL;
    expect(isPlatformOwner({ id: 'a', email: '' })).toBe(false);
    expect(isPlatformOwner(null)).toBe(false);
  });

  it('dono so e alvo bloqueado para terceiros (CEO ou outro DEV)', () => {
    process.env.PLATFORM_OWNER_USER_ID = 'owner-1';
    expect(isOwnerTargetedByOther({ sub: 'ceo-1' }, { id: 'owner-1' })).toBe(true);
    expect(isOwnerTargetedByOther({ sub: 'dev-2' }, { id: 'owner-1' })).toBe(true);
    expect(isOwnerTargetedByOther({ sub: 'owner-1' }, { id: 'owner-1' })).toBe(false);
    expect(isOwnerTargetedByOther({ sub: 'ceo-1' }, { id: 'user-9' })).toBe(false);
  });
});