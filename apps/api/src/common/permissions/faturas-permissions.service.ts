import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser, UserRole } from '../types/auth.types';
import { FATURAS_DEFAULTS, FATURAS_PERMISSIONS, FATURAS_ROLES, FATURAS_ROLES_COM_ACESSO, faturasRoleAllows, isFaturasPermission, userHasFaturasPermission, type FaturasPermission } from './faturas-permissions';

const SETTING_KEY = 'faturas.role-permissions';
const CACHE_MS = 15_000;

/** Permissões de Faturas por perfil, editáveis pelo DEV. Perfil sem registro usa o padrão do código. */
@Injectable()
export class FaturasPermissionsService {
  private cache: { at: number; value: Partial<Record<string, string[]>> } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async overrides(): Promise<Partial<Record<string, string[]>>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const stored = await this.prisma.platformSetting.findUnique({ where: { key: SETTING_KEY } }).catch(() => null);
    const value = (stored?.value && typeof stored.value === 'object' && !Array.isArray(stored.value) ? stored.value : {}) as Partial<Record<string, string[]>>;
    this.cache = { at: Date.now(), value };
    return value;
  }

  async has(user: { role?: UserRole; customPermissions?: unknown } | undefined, permission: FaturasPermission) {
    if (!user?.role || user.role === 'DEV') return Boolean(user?.role);
    if (!faturasRoleAllows(user.role, permission)) return false; // teto por perfil: vale mais que permissao personalizada e que a config do DEV
    const custom = user.customPermissions;
    if (Array.isArray(custom) && custom.length > 0) return custom.includes(permission);
    const override = (await this.overrides())[user.role];
    return userHasFaturasPermission(user, permission, Array.isArray(override) ? override : null);
  }

  /** Lista efetiva de permissões de faturas do usuário (usada pelo front para mostrar/esconder). */
  async effective(user: { role?: UserRole; customPermissions?: unknown }) {
    const result: FaturasPermission[] = [];
    for (const permission of FATURAS_PERMISSIONS) if (await this.has(user, permission)) result.push(permission);
    return result;
  }

  async listRoles() {
    const overrides = await this.overrides();
    return FATURAS_ROLES.map((role) => {
      const override = overrides[role];
      const custom = Array.isArray(override);
      return { role, permissions: custom ? override : [...(FATURAS_DEFAULTS[role] ?? [])], customized: custom, locked: role === 'DEV' };
    });
  }

  async setRole(role: string, permissions: string[], actor: JwtUser) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Apenas DEV altera as permissões de Faturas por perfil.');
    if (!(FATURAS_ROLES as readonly string[]).includes(role)) throw new BadRequestException('Perfil invalido.');
    if (role === 'DEV') throw new BadRequestException('O perfil DEV sempre tem acesso total.');
    if (!(FATURAS_ROLES_COM_ACESSO as readonly string[]).includes(role)) throw new BadRequestException('Este perfil nao pode ter acesso a Faturas.');
    const invalid = permissions.filter((p) => !isFaturasPermission(p));
    if (invalid.length) throw new BadRequestException(`Permissoes invalidas: ${invalid.join(', ')}`);
    const acimaDoTeto = permissions.filter((p) => isFaturasPermission(p) && !faturasRoleAllows(role as UserRole, p));
    if (acimaDoTeto.length) throw new BadRequestException(`O perfil ${role} nao pode receber: ${acimaDoTeto.join(', ')}`);
    // Operacoes de dinheiro e visao global sem poder ver as faturas nao fazem sentido.
    const next = Array.from(new Set(permissions));
    if (next.length && !next.includes('faturas.ver')) next.unshift('faturas.ver');

    const current = await this.overrides();
    const previous = current[role] ?? [...(FATURAS_DEFAULTS[role as UserRole] ?? [])];
    const value = { ...current, [role]: next };
    await this.prisma.platformSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value, updatedBy: actor.sub },
      update: { value, updatedBy: actor.sub },
    });
    this.cache = null;
    await this.prisma.auditLog.create({
      data: { companyId: actor.companyId, userId: actor.sub, action: 'FATURAS_ROLE_PERMISSIONS_UPDATED', entity: 'PlatformSetting', entityId: SETTING_KEY, metadata: { role, previous, next, actorEmail: actor.email } },
    });
    return { role, permissions: next };
  }

  /** Volta o perfil ao padrão do código. */
  async resetRole(role: string, actor: JwtUser) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Apenas DEV altera as permissões de Faturas por perfil.');
    const current = { ...(await this.overrides()) };
    delete current[role];
    await this.prisma.platformSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: current, updatedBy: actor.sub },
      update: { value: current, updatedBy: actor.sub },
    });
    this.cache = null;
    await this.prisma.auditLog.create({
      data: { companyId: actor.companyId, userId: actor.sub, action: 'FATURAS_ROLE_PERMISSIONS_RESET', entity: 'PlatformSetting', entityId: SETTING_KEY, metadata: { role, actorEmail: actor.email } },
    });
    return { role, permissions: [...(FATURAS_DEFAULTS[role as UserRole] ?? [])] };
  }
}
