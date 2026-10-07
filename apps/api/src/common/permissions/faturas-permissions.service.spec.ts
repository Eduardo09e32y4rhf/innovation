import { describe, expect, it, vi } from 'vitest';
import { FaturasPermissionsService } from './faturas-permissions.service';

function build(stored: Record<string, string[]> | null) {
  const upsert = vi.fn();
  const prisma = {
    platformSetting: { findUnique: vi.fn().mockResolvedValue(stored ? { value: stored } : null), upsert },
    auditLog: { create: vi.fn() },
  };
  return { service: new FaturasPermissionsService(prisma as never), prisma, upsert };
}
const dev = { sub: 'u1', role: 'DEV', companyId: 'c1', email: 'dev@x.com' } as never;

describe('FaturasPermissionsService', () => {
  it('sem registro do DEV usa o padrão do perfil', async () => {
    const { service } = build(null);
    expect(await service.has({ role: 'ADMIN' }, 'faturas.plano')).toBe(true);
    expect(await service.has({ role: 'GESTOR' }, 'faturas.ver')).toBe(false);
  });

  it('perfil ajustado pelo DEV vale no lugar do padrão', async () => {
    const { service } = build({ RH: ['faturas.ver'], ADMIN: ['faturas.ver'] });
    expect(await service.has({ role: 'RH' }, 'faturas.ver')).toBe(true);
    expect(await service.has({ role: 'ADMIN' }, 'faturas.pagar')).toBe(false);
  });

  it('configuração do DEV não dá acesso a perfil fora do teto (Gestor) nem visão global ao Admin', async () => {
    const { service } = build({ GESTOR: ['faturas.ver'], ADMIN: ['faturas.todas_empresas'] });
    expect(await service.has({ role: 'GESTOR' }, 'faturas.ver')).toBe(false);
    expect(await service.has({ role: 'GESTOR', customPermissions: ['faturas.ver'] }, 'faturas.ver')).toBe(false);
    expect(await service.has({ role: 'ADMIN' }, 'faturas.todas_empresas')).toBe(false);
    expect(await service.effective({ role: 'COMERCIAL' })).toEqual([]);
  });

  it('DEV não consegue configurar perfil sem acesso nem permissão acima do teto', async () => {
    const { service } = build(null);
    await expect(service.setRole('GESTOR', ['faturas.ver'], dev)).rejects.toThrow();
    await expect(service.setRole('RH', ['faturas.reembolsar'], dev)).rejects.toThrow();
  });

  it('permissão personalizada do usuário vence a do perfil', async () => {
    const { service } = build({ ADMIN: ['faturas.ver'] });
    expect(await service.has({ role: 'ADMIN', customPermissions: ['faturas.pagar'] }, 'faturas.pagar')).toBe(true);
  });

  it('só o DEV altera, não altera o DEV, rejeita permissão inválida e garante faturas.ver', async () => {
    const { service, upsert } = build(null);
    await expect(service.setRole('RH', ['faturas.ver'], { ...(dev as object), role: 'ADMIN' } as never)).rejects.toThrow();
    await expect(service.setRole('DEV', ['faturas.ver'], dev)).rejects.toThrow();
    await expect(service.setRole('RH', ['faturas.inventada'], dev)).rejects.toThrow();
    const result = await service.setRole('RH', ['faturas.pagar'], dev);
    expect(result.permissions).toEqual(['faturas.ver', 'faturas.pagar']);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
