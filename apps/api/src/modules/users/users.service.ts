import { Optional, BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { MfaService } from '../auth/mfa.service';
import { SessionService } from '../auth/session.service';
import { decryptTemporaryPassword, encryptTemporaryPassword } from '../../common/crypto/temporary-password';
import type { JwtUser } from '../../common/types/auth.types';
import { normalizeDisplayName } from '../../common/utils/text-normalization';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { UserRole } from '../../common/types/auth.types';
import { UsersRepository } from './users.repository';

// SEGURANCA: e-mail do DEV proprietario da plataforma — definido via variavel de ambiente
const PLATFORM_OWNER_EMAIL = (process.env.PLATFORM_OWNER_EMAIL ?? '').toLowerCase();
const PLATFORM_OWNER_USER_ID = process.env.PLATFORM_OWNER_USER_ID ?? '';

const VALID_PERMISSIONS = [
  'users.manage_employees',
  'users.view_team',
  'users.reset_password',
  'users.manage_roles',
  'admin.delete_employees',
  'admin.delete_users',
  'admin.manage_company',
  'platform.view_finance',
  'platform.view_reports',
  'faturas.ver',
  'faturas.pagar',
  'faturas.nf_anexar',
  'faturas.cobrar',
  'faturas.desconto',
  'faturas.reembolsar',
  'faturas.todas_empresas',
  'hr.manage_vacations',
  'hr.approve_vacations',
  'hr.manage_schedules',
  'hr.approve_schedules',
  // Chaves usadas pela interface (lib/permissions.ts); antes eram rejeitadas com 400.
  'time_tracking.clock_in',
  'time_tracking.view_own',
  'time_tracking.view_team',
  'time_tracking.view_all',
  'time_tracking.approve_team',
  'time_tracking.approve_all',
  'vacations.request_own',
  'vacations.request_team',
  'vacations.approve',
  'settings.change_own_password',
  'settings.change_team_password',
  'settings.change_all_passwords',
  'users.view_employee_files',
  'admin.manage_rh',
  'platform.manage',
];

const ROLE_MANAGEMENT: Record<string, string[]> = {
  DEV: ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  CEO: ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  CONTABIL: [],
  COMERCIAL: [],
  ADMIN: ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  RH: ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  GESTOR: [],
  FUNCIONARIO: [],
  CONSULTA: [],
};

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    @Optional() private readonly mfa?: MfaService,
    @Optional() private readonly sessions?: SessionService,
  ) {}

  async list(companyId: string, actor: JwtUser) {
    if (actor.role === 'DEV') {
      return this.repository.listAll();
    }
    const users = await this.repository.list(companyId);
    return this.filterRestrictedUsers(users, actor);
  }

  async ping(userId: string) {
    return this.repository.ping(userId);
  }

  async get(companyId: string, actor: JwtUser, id: string) {
    const user = actor.role === 'DEV'
      ? await this.repository.findById(id)
      : await this.repository.findById(id, companyId);
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    if (!this.canAccessUser(actor, user)) throw new NotFoundException('Usuario nao encontrado');
    return user;
  }

  async create(companyId: string, actor: JwtUser, dto: CreateUserDto, meta?: { ip?: string; userAgent?: string }) {
    this.assertRoleChangeAllowed(actor, dto.role);

    if (dto.customPermissions) {
      const invalid = dto.customPermissions.filter(p => !VALID_PERMISSIONS.includes(p));
      if (invalid.length > 0) {
        throw new BadRequestException(`Permissões inválidas: ${invalid.join(', ')}`);
      }
    }

    const targetCompanyId = actor.role === 'DEV' ? dto.companyId : companyId;
    if (actor.role === 'DEV' && !targetCompanyId) {
      throw new ForbiddenException('DEV deve informar a empresa para criar um usuario.');
    }
    if (!targetCompanyId) {
      throw new ForbiddenException('Empresa nao informada.');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.repository.findByEmail(email);
    if (existing) throw new ConflictException('E-mail ja cadastrado');

    const [count, limits] = await Promise.all([
      this.repository.countByCompany(targetCompanyId),
      this.repository.getCompanyLimits(targetCompanyId),
    ]);
    if (!limits) {
      throw new NotFoundException('Empresa nao encontrada.');
    }
    const maxUsers = this.resolveMaxUsers(limits);
    if (count >= maxUsers) {
      throw new ForbiddenException({
        code: 'SEAT_LIMIT_REACHED',
        message: 'A empresa utiliza todas as licencas contratadas.',
        used: count,
        limit: maxUsers,
      });
    }

    // Senha provisória opcional: sem ela o sistema gera uma forte, exibida uma única vez ao criador.
    // Gerada: curta (6), uso único. Informada manualmente: precisa ser forte.
    const temporaryPassword = dto.password || this.generateTemporaryPassword();
    if (dto.password) this.assertStrongPassword(temporaryPassword);
    if (dto.employeeId) {
      const employee = await this.repository.findEmployeeForLink(targetCompanyId, dto.employeeId);
      if (!employee) throw new NotFoundException('Funcionario nao encontrado nesta empresa.');
      if (employee.userId) throw new ConflictException('Este funcionario ja possui um usuario vinculado.');
    }

    const created = await this.repository.createWithEmployeeSync({
      companyId: targetCompanyId,
      name: normalizeDisplayName(dto.name),
      email,
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      role: dto.role ?? 'FUNCIONARIO',
      employeeId: dto.employeeId,
      temporaryPassword: {
        value: temporaryPassword,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      ...(dto.customPermissions !== undefined && dto.customPermissions !== null ? { customPermissions: dto.customPermissions } : {}),
    });
    if (!created) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    await this.repository.createAuditLog({
      companyId: targetCompanyId,
      userId: created.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: created.id,
      metadata: {
        name: created.name,
        email: created.email,
        role: created.role,
        isActive: created.isActive,
        employeeLinked: Boolean((created as any).employee?.id),
        requestedBy: actor.email,
      },
      ...this.metaFields(meta),
    });

    return { ...created, temporaryPassword, temporaryPasswordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) };
  }

  private metaFields(meta?: { ip?: string; userAgent?: string }) {
    return { ipAddress: meta?.ip, userAgent: meta?.userAgent?.slice(0, 300) };
  }

  /** Remove o segundo fator e encerra as sessões (usuário perdeu o aparelho e os códigos). Somente DEV. */
  async resetMfa(companyId: string, actor: JwtUser, id: string, meta?: { ip?: string; userAgent?: string }) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Somente DEV pode redefinir a autenticacao em duas etapas.');
    const user = await this.get(companyId, actor, id);
    await this.mfa?.reset(id);
    await this.sessions?.revokeAllForUser(id);
    await this.repository.createAuditLog({
      companyId: user.companyId, userId: id, action: 'USER_MFA_RESET', entity: 'User', entityId: id,
      metadata: { requestedBy: actor.email }, ...this.metaFields(meta),
    });
    return { reset: true };
  }

  /** Funcionários sem usuário, para atrelar a um acesso. DEV pode escolher a empresa. */
  async linkableEmployees(companyId: string, actor: JwtUser, search: string, targetCompanyId?: string) {
    const scope = actor.role === 'DEV' && targetCompanyId ? targetCompanyId : companyId;
    return this.repository.findLinkableEmployees(scope, search ?? '');
  }

  /** Atrela (ou desatrela) o usuário a um funcionário. Não é obrigatório: sem vínculo o usuário acessa só conforme a sua visão. */
  async linkEmployee(companyId: string, actor: JwtUser, id: string, employeeId: string | null, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.get(companyId, actor, id);
    if (user.role && !this.canManageRole(actor.role, user.role)) throw new ForbiddenException('Voce nao tem permissao para alterar este usuario.');
    let employee: { id: string; name: string; registration: string | null; userId: string | null } | null = null;
    if (employeeId) {
      employee = await this.repository.findEmployeeForLink(user.companyId, employeeId);
      if (!employee) throw new NotFoundException('Funcionario nao encontrado nesta empresa.');
      if (employee.userId && employee.userId !== id) throw new ConflictException('Este funcionario ja esta vinculado a outro usuario.');
    }
    const { previous } = await this.repository.setEmployeeLink(user.companyId, id, employeeId);
    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: id,
      action: employeeId ? 'USER_EMPLOYEE_LINKED' : 'USER_EMPLOYEE_UNLINKED',
      entity: 'User',
      entityId: id,
      metadata: {
        previous: { employeeId: previous ? `${previous.name} (${previous.registration ?? 'sem matricula'})` : null },
        next: { employeeId: employee ? `${employee.name} (${employee.registration ?? 'sem matricula'})` : null },
        requestedBy: actor.email,
      },
      ...this.metaFields(meta),
    });
    return this.get(companyId, actor, id);
  }

  private async changeAccess(companyId: string, actor: JwtUser, id: string, state: 'BLOCK' | 'UNBLOCK' | 'CANCEL', reason?: string, meta?: { ip?: string; userAgent?: string }) {
    if (actor.sub === id) throw new ForbiddenException('Nao e permitido bloquear ou cancelar o proprio acesso.');
    const user = await this.get(companyId, actor, id);
    if (user.role && !this.canManageRole(actor.role, user.role)) throw new ForbiddenException('Voce nao tem permissao para gerir o acesso deste usuario.');
    if (state === 'UNBLOCK' && ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'].includes(String(user.role))) {
      const [used, limits] = await Promise.all([this.repository.countByCompany(user.companyId), this.repository.getCompanyLimits(user.companyId)]);
      const max = this.resolveMaxUsers(limits);
      if (used >= max) throw new ForbiddenException({ code: 'SEAT_LIMIT_REACHED', message: 'A empresa utiliza todas as licencas contratadas.', used, limit: max });
    }
    const result = await this.repository.setAccessState(user.companyId, id, state, reason?.trim() || undefined);
    if (!result.count || !result.user) throw new NotFoundException('Usuario nao encontrado');
    const action = state === 'BLOCK' ? 'USER_BLOCKED' : state === 'CANCEL' ? 'USER_CANCELED' : 'USER_UNBLOCKED';
    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: id,
      action,
      entity: 'User',
      entityId: id,
      metadata: {
        previous: { isActive: user.isActive },
        next: { isActive: result.user.isActive },
        reason: reason?.trim() || undefined,
        requestedBy: actor.email,
      },
      ...this.metaFields(meta),
    });
    return result.user;
  }

  block(companyId: string, actor: JwtUser, id: string, reason?: string, meta?: { ip?: string; userAgent?: string }) {
    return this.changeAccess(companyId, actor, id, 'BLOCK', reason, meta);
  }

  unblock(companyId: string, actor: JwtUser, id: string, meta?: { ip?: string; userAgent?: string }) {
    return this.changeAccess(companyId, actor, id, 'UNBLOCK', undefined, meta);
  }

  cancel(companyId: string, actor: JwtUser, id: string, reason?: string, meta?: { ip?: string; userAgent?: string }) {
    return this.changeAccess(companyId, actor, id, 'CANCEL', reason, meta);
  }

  async update(companyId: string, actor: JwtUser, id: string, dto: UpdateUserDto, meta?: { ip?: string; userAgent?: string }) {
    this.assertRoleChangeAllowed(actor, dto.role);
    if (id === actor.sub &&actor.role !== 'DEV' && (dto.isActive === false || (dto.role && dto.role !== actor.role))) {
      throw new ForbiddenException('Voce nao pode desativar a propria conta nem alterar o proprio perfil.');
    }
    const before = await this.get(companyId, actor, id);
    if (before.role && !this.canManageRole(actor.role, before.role)) {
      throw new ForbiddenException('Voce nao tem permissao para editar este usuario.');
    }

    const { password, name, email, ...rest } = dto;
    const data = {
      ...rest,
      ...(name !== undefined ? { name: normalizeDisplayName(name) } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    };

    // Usa a empresa DO USUÁRIO alvo (o DEV edita usuários de qualquer empresa).
    const result = await this.repository.updateWithEmployeeSync(before.companyId, id, data);
    if (!result.count || !result.user) throw new NotFoundException('Usuario nao encontrado');

    await this.repository.createAuditLog({
      companyId: before.companyId,
      userId: id,
      ...this.metaFields(meta),
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      metadata: {
        previous: {
          name: before.name,
          email: before.email,
          role: before.role,
          isActive: before.isActive,
          customPermissions: before.customPermissions ?? null,
        },
        next: {
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          isActive: result.user.isActive,
          customPermissions: result.user.customPermissions ?? null,
        },
        changedFields: Object.keys(data),
        requestedBy: actor.email,
      },
    });

    return result.user;
  }

  async resetPassword(companyId: string, actor: JwtUser, id: string, dto: ResetUserPasswordDto) {
    const user = actor.role === 'DEV'
      ? await this.repository.findByIdWithPassword(id)
      : await this.repository.findByIdWithPassword(id, companyId);
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    if (user.role && !this.canManageRole(actor.role, user.role)) {
      throw new ForbiddenException('Voce nao tem permissao para resetar a senha deste usuario.');
    }
    if (actor.sub === id) {
      throw new ConflictException('Nao e permitido resetar a propria senha por esta acao.');
    }

    if (!dto.newPassword) {
      throw new BadRequestException('A nova senha nao foi fornecida');
    }
    const newPassword = dto.newPassword;

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash || '');
    if (isSamePassword) {
      throw new ConflictException('A nova senha temporaria nao pode ser igual a senha atual.');
    }

    this.assertStrongPassword(newPassword);
    for (const previousHash of user.previousPasswords ?? []) {
      if (await bcrypt.compare(newPassword, previousHash)) {
        throw new ConflictException('Esta senha ja foi utilizada anteriormente.');
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const data = {
      passwordHash,
      previousPasswords: [user.passwordHash, ...(user.previousPasswords ?? [])].slice(0, 10),
      forcePasswordChange: true,
      failedLoginAttempts: 0,
      resetPasswordCode: null,
      resetPasswordExpires: null,
      passwordChangedAt: new Date(),
    };
    const result = actor.role === 'DEV'
      ? await this.repository.update(id, data)
      : await this.repository.update(id, data, companyId);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');

    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: user.id,
      metadata: {
        requestedBy: actor.email,
        passwordChangedAt: new Date().toISOString(),
        forcePasswordChange: true,
        previousPasswordCount: (user.previousPasswords ?? []).length,
      },
    });

    return this.get(companyId, actor, id);
  }

  async revealTemporaryPassword(companyId: string, actor: JwtUser, id: string) {
    const user = await this.repository.findById(id, actor.role === 'DEV' ? undefined : companyId);
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    this.assertCanRevealTemporaryPassword(actor, user);

    const credential = await this.repository.findTemporaryCredential(id);
    if (!credential || credential.revokedAt || credential.consumedAt || credential.expiresAt <= new Date()) {
      throw new NotFoundException('Senha provisoria indisponivel ou expirada.');
    }

    let temporaryPassword: string;
    try {
      temporaryPassword = decryptTemporaryPassword(credential.encryptedValue);
    } catch {
      throw new NotFoundException('Senha provisoria indisponivel.');
    }

    await this.repository.markTemporaryCredentialRevealed(id);
    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: actor.sub,
      action: 'TEMPORARY_PASSWORD_REVEALED',
      entity: 'User',
      entityId: id,
      metadata: { targetUserId: id, targetRole: user.role, expiresAt: credential.expiresAt.toISOString() },
    });

    return { temporaryPassword, expiresAt: credential.expiresAt };
  }

  async reissueTemporaryPassword(companyId: string, actor: JwtUser, id: string) {
    const user = await this.repository.findByIdWithPassword(id, actor.role === 'DEV' || actor.role === 'CEO' ? undefined : companyId);
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    this.assertCanRevealTemporaryPassword(actor, user);
    if (actor.sub === id) throw new ConflictException('Nao e permitido reemitir a propria senha por esta acao.');

    const temporaryPassword = this.generateTemporaryPassword();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    await this.repository.update(id, {
      passwordHash,
      previousPasswords: [user.passwordHash, ...(user.previousPasswords ?? [])].slice(0, 10),
      forcePasswordChange: true,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
    }, actor.role === 'DEV' || actor.role === 'CEO' ? undefined : companyId);
    await this.repository.replaceTemporaryCredential(id, encryptTemporaryPassword(temporaryPassword), expiresAt);
    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: actor.sub,
      action: 'TEMPORARY_PASSWORD_REISSUED',
      entity: 'User',
      entityId: id,
      metadata: { targetUserId: id, targetRole: user.role, expiresAt: expiresAt.toISOString() },
    });
    return { temporaryPassword, expiresAt };
  }

  /** Mantido por compatibilidade: DELETE /users/:id cancela o acesso (definitivo). */
  async delete(companyId: string, actor: JwtUser, id: string, meta?: { ip?: string; userAgent?: string }) {
    await this.cancel(companyId, actor, id, undefined, meta);
    return { deleted: true, deactivated: true, canceled: true };
  }

  async usage(companyId: string) {
    const [count, limits] = await Promise.all([
      this.repository.countByCompany(companyId),
      this.repository.getCompanyLimits(companyId),
    ]);
    return {
      used: count,
      max: this.resolveMaxUsers(limits),
    };
  }

  private resolveMaxUsers(
    limits: { subscription?: { seatQuantity?: number | null } | null } | null,
  ): number {
    const contractedSeats = Number(limits?.subscription?.seatQuantity);
    return Number.isFinite(contractedSeats) && contractedSeats > 0 ? contractedSeats : 1;
  }

  private assertStrongPassword(password: string) {
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('A senha precisa ter no minimo 10 caracteres, letra maiuscula, minuscula, numero e simbolo.');
    }
  }

  private generateTemporaryPassword() {
    // 6 caracteres sem ambíguos (sem 0/O/1/I/L). Vale para um único acesso: a troca obrigatória exige senha forte de 10+.
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    return Array.from(randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join('');
  }

  private assertCanRevealTemporaryPassword(actor: JwtUser, user: { id: string; role?: string }) {
    if (actor.sub === user.id) throw new ForbiddenException('Nao e permitido revelar a propria senha provisoria.');
    if (!this.canManageRole(actor.role, user.role)) {
      throw new ForbiddenException('Voce nao tem permissao para gerir a senha provisoria deste usuario.');
    }
  }

  private assertRoleChangeAllowed(actor: JwtUser, nextRole?: string) {
    if (!nextRole) return;
    const actorRole = String(actor?.role || '').toUpperCase();
    const protectedRoles = ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL'];

    if (protectedRoles.includes(nextRole) && actorRole !== 'DEV') {
      throw new ForbiddenException('Apenas um perfil DEV pode criar ou promover perfis internos (CEO, Contábil, etc).');
    }
    if (actorRole === 'RH' && ['ADMIN', 'DEV', 'CEO', 'CONTABIL', 'COMERCIAL'].includes(nextRole)) {
      throw new ForbiddenException('RH não pode criar ou promover Administrador, Comercial ou Perfis Internos.');
    }
    if (actorRole === 'GESTOR' || actorRole === 'FUNCIONARIO' || actorRole === 'CONSULTA') {
      throw new ForbiddenException('Seu perfil não tem permissão para alterar ou criar usuários.');
    }
  }

  private canAccessUser(actor: JwtUser, user?: { role?: string } | null) {
    if (!user) return false;
    if (actor?.role === 'DEV') return true;
    if (['DEV', 'CEO', 'CONTABIL', 'COMERCIAL'].includes(String(user.role || '').toUpperCase())) {
      return actor.sub === (user as any).id && ['CEO', 'CONTABIL', 'COMERCIAL'].includes(actor.role);
    }
    return String(user.role || '').toUpperCase() !== 'DEV';
  }

  private filterRestrictedUsers(users: Array<{ role?: string }>, actor: JwtUser) {
    if (actor?.role === 'DEV') return users;
    return users.filter((user) => String(user.role || '').toUpperCase() !== 'DEV');
  }

  private canManageRole(actorRole?: string, targetRole?: string) {
    if (!actorRole || !targetRole) return false;
    return ROLE_MANAGEMENT[actorRole.toUpperCase()]?.includes(targetRole.toUpperCase()) ?? false;
  }

  private isPlatformOwner(actor: JwtUser) {
    if (!actor || actor.role !== 'DEV') return false;
    if (PLATFORM_OWNER_USER_ID) return actor.sub === PLATFORM_OWNER_USER_ID;
    return Boolean(PLATFORM_OWNER_EMAIL) && actor.email.toLowerCase() === PLATFORM_OWNER_EMAIL;
  }
}
