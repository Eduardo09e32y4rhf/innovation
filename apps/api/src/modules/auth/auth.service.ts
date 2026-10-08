import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'node:crypto';
import { loginFailures } from '../../common/metrics/app-metrics';
import { isCompanyDocumentOptional, normalizeCompanyDocument } from '../../common/company-document';
import { createHmac } from 'node:crypto';
import { AuthRepository } from './auth.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SessionService } from './session.service';
import { MfaService } from './mfa.service';
import { MailService } from '../mail/mail.service';
import { emailVerificationEmail, passwordResetEmail, securityAlertEmail } from '../mail/mail-templates';
import { ValidateResetCodeDto } from './dto/validate-reset-code.dto';
import type { JwtUser, UserRole } from '../../common/types/auth.types';
import { isPlatformOwner } from '../../common/constants/platform-owner';
import { isTemporaryCredentialUsable } from './temporary-credential';

import { NotificationsService } from '../notifications/notifications.service';
import { PlatformFinanceService } from '../finance/platform-finance.service';
import { PricingService } from '../finance/pricing.service';
import { checkCouponEligibility, couponDiscount } from '../coupons/coupon-rules';

// SEGURANÇA: e-mail do DEV proprietário da plataforma — definido via variável de ambiente
const LOGIN_DENIED_MESSAGE = 'Não foi possível entrar';
const PASSWORD_MAX_AGE_DAYS = 30;
const PASSWORD_RESET_PURPOSE = 'PASSWORD_RESET';
const MFA_LOGIN_PURPOSE = 'MFA_LOGIN';
const EMAIL_VERIFY_PURPOSE = 'EMAIL_VERIFY';

export interface RequestMeta { ipAddress?: string; userAgent?: string }

/** Bloqueio progressivo: 5ª falha = 15 min, depois dobra a cada nova falha (30, 60, 120 ... até 24 h). */
export function lockDurationMs(failedAttempts: number): number {
  if (failedAttempts < 5) return 0;
  return Math.min(24 * 60, 15 * 2 ** (failedAttempts - 5)) * 60_000;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly platformFinance: PlatformFinanceService,
    private readonly pricingService: PricingService,
    private readonly sessions: SessionService,
    private readonly mfa: MfaService,
    private readonly mail: MailService,
  ) {}

  publicPlans() {
    return this.repository.listPublicPlans();
  }

  async quotePublicPlan(dto: { planId: string; seatQuantity: number; couponCode?: string }) {
    const plan = await this.repository.findPublicPlan(dto.planId);
    if (!plan) throw new NotFoundException('O plano selecionado nao esta mais disponivel.');
    const pricing = {
      baseMonthlyPrice: plan.baseMonthlyPrice ? Number(plan.baseMonthlyPrice) : undefined,
      userMonthlyPrice: plan.userMonthlyPrice ? Number(plan.userMonthlyPrice) : undefined,
      price: plan.price ? Number(plan.price) : undefined,
      includedUnits: plan.includedUnits ?? 0,
    };
    if (!dto.couponCode) return { ...this.pricingService.calculate(plan.commitmentMonths as 1 | 3 | 6 | 12, dto.seatQuantity, pricing), trialDays: 0, couponApplied: false };
    const coupon = await this.repository.findCouponByCode(dto.couponCode);
    const check = checkCouponEligibility(coupon, { planId: plan.id, seats: dto.seatQuantity });
    if (!check.ok || !coupon) throw new BadRequestException({ code: check.ok ? 'COUPON_INVALID' : check.code, message: check.ok ? 'Cupom invalido, expirado ou indisponivel.' : check.message });
    const quote = this.pricingService.calculate(plan.commitmentMonths as 1 | 3 | 6 | 12, dto.seatQuantity, pricing, couponDiscount(coupon));
    return { ...quote, trialDays: coupon.type === 'TRIAL_DAYS' ? coupon.trialDays : 0, couponApplied: true, couponType: coupon.type, couponDurationCycles: coupon.durationCycles };
  }
  async registerCompany(dto: RegisterCompanyDto, requestMeta?: RequestMeta) {
    const email = dto.email.trim().toLowerCase();
    const document = normalizeCompanyDocument(dto.document);
    // Padrao: CPF/CNPJ obrigatorio e valido. Ambiente de teste do robo (COMPANY_DOCUMENT_OPTIONAL=true): pode faltar e nao valida os digitos.
    if (!isCompanyDocumentOptional()) this.assertValidDocument(document ?? '');
    else if (process.env.NODE_ENV === 'production') this.logger.warn('COMPANY_DOCUMENT_OPTIONAL=true em producao: cadastro de empresa sem validar CPF/CNPJ.');
    this.assertStrongPassword(dto.password);
    const existing = await this.repository.findUserByEmail(email);
    if (existing) throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS', message: 'Este e-mail ja esta cadastrado. Entre na sua conta para continuar.' });
    const existingCompany = document ? await this.repository.findCompanyByDocument(document) : null;
    if (existingCompany) {
      throw new ConflictException({ code: 'COMPANY_DOCUMENT_EXISTS', message: 'Este CPF/CNPJ ja possui uma empresa cadastrada. Entre com o administrador existente.' });
    }

    const selectedPlan = await this.repository.findPublicPlan(dto.planId);
    if (!selectedPlan) throw new NotFoundException('O plano selecionado nao esta mais disponivel.');
    if (dto.seatQuantity > selectedPlan.maxUsers) {
      throw new BadRequestException(`O plano selecionado permite no maximo ${selectedPlan.maxUsers} usuarios.`);
    }
    const coupon = dto.couponCode ? await this.repository.findCouponByCode(dto.couponCode) : null;
    if (dto.couponCode) {
      const check = checkCouponEligibility(coupon, { planId: selectedPlan.id, seats: dto.seatQuantity });
      if (!check.ok) throw new BadRequestException({ code: check.code, message: check.message });
      // A trava de uso unico do cupom e feita pelo hash do documento: sem documento nao ha como aplicar o cupom.
      if (!document) throw new BadRequestException({ code: 'DOCUMENT_REQUIRED_FOR_COUPON', message: 'Informe o CPF/CNPJ para usar um cupom.' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const company = await this.repository.createCompanyWithAdmin({
      ...dto,
      email,
      document,
      passwordHash,
      platformPlanId: selectedPlan?.id,
      maxUsers: dto.seatQuantity,
      maxEmployees: selectedPlan.maxEmployees ?? 50,
      activeModules: selectedPlan?.activeModules ?? ['employees', 'time-track', 'vacations', 'management', 'recruitment'],
      isFree: selectedPlan?.isFree ?? false,
    });
    const admin = company.users[0];
    const subscriptionData = {
      companyId: company.id,
      planId: selectedPlan.id,
      status: selectedPlan.isFree ? 'ACTIVE' : 'PENDING_PAYMENT',
      seatQuantity: dto.seatQuantity,
      pricingVersion: selectedPlan.pricingVersion,
      baseMonthlyPrice: selectedPlan.baseMonthlyPrice,
      userMonthlyPrice: selectedPlan.userMonthlyPrice,
      discountPercent: selectedPlan.discountPercent,
    };

    let trial = false;
    let trialEndsAt: Date | null = null;
    try {
      if (coupon && coupon.type !== 'TRIAL_DAYS') {
        const documentHash = this.documentHash(document as string); // com cupom, o documento ja foi exigido acima
        const redemption = await this.repository.redeemDiscountCoupon({ ...subscriptionData, couponId: coupon.id, documentHash, seatQuantity: dto.seatQuantity });
        if (!redemption.applied) {
          throw new ConflictException({ code: redemption.reason, message: redemption.reason === 'COUPON_ALREADY_USED' ? 'Este documento ja utilizou este cupom.' : 'Cupom indisponivel.' });
        }
      } else if (coupon) {
        const documentHash = this.documentHash(document as string);
        const redemption = await this.repository.redeemTrialCoupon({
          ...subscriptionData,
          couponId: coupon.id,
          documentHash,
          trialDays: coupon.trialDays,
        });
        if (!redemption.applied) {
          throw new ConflictException({ code: redemption.reason, message: redemption.reason === 'TRIAL_ALREADY_USED' ? 'Este documento ja utilizou um periodo de teste.' : 'Cupom indisponivel.' });
        }
        trial = true;
        trialEndsAt = redemption.trialEndsAt;
      } else {
        await this.repository.createSubscription(subscriptionData);
      }
    } catch (error) {
      try {
        await this.repository.deleteIncompleteCompany(company.id);
      } catch (cleanupError) {
        this.logger.error(
          `Falha ao limpar cadastro incompleto da empresa ${company.id}: ${String(cleanupError)}`,
        );
      }
      throw error;
    }

    let checkout: { active: boolean; paymentUrl: string | null | undefined } = { active: Boolean(selectedPlan?.isFree), paymentUrl: null };
    let billingSetupPending = false;
    if (!selectedPlan.isFree) {
      try {
        checkout = await this.platformFinance.ensureCompanyOnboardingBilling(company.id);
      } catch (error) {
        billingSetupPending = true;
        this.logger.error(`Cadastro ${company.id} criado, mas checkout Asaas ficou pendente: ${String(error)}`);
      }
    }

    void this.sendVerificationEmail({ id: admin.id, email: admin.email, name: admin.name });

    return {
      ...(await this.buildAuthResponse({
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        companyId: admin.companyId,
        role: this.resolveRole(admin),
        customPermissions: admin.customPermissions,
        companyStatus: company.status,
        billingStatus: company.billingStatus,
      }, false, requestMeta)),
      paymentUrl: checkout.paymentUrl,
      billingSetupPending,
      trial,
      trialEndsAt,
    };
  }

  async login(dto: LoginDto, requestMeta?: RequestMeta) {
    try { return await this.loginInner(dto, requestMeta); } catch (e) { if (e instanceof UnauthorizedException) loginFailures.inc(); throw e; }
  }

  private async loginInner(dto: LoginDto, requestMeta?: RequestMeta) {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user || !user.isActive) {
      await this.auditInvalidLogin(dto.email, requestMeta);
      throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    }

    this.assertNotLocked(user.lockedUntil);

    const role = this.resolveRole(user);
    if (!this.canAccessCompany(user.company, role)) {
      await this.auditInvalidLogin(dto.email, requestMeta, user.companyId, user.id);
      throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      await this.registerFailure(user, dto.email, requestMeta);
      throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    }

    await this.assertTemporaryCredentialValid(user, requestMeta);

    // Segundo fator: não entrega sessão; devolve um desafio de 5 minutos.
    if (user.mfaEnabledAt) {
      const mfaToken = await this.jwtService.signAsync({ purpose: MFA_LOGIN_PURPOSE, sub: user.id, pwd: new Date(user.passwordChangedAt).getTime() }, { expiresIn: '5m' });
      return { mfaRequired: true as const, mfaToken, expiresInSeconds: 300 };
    }
    return this.completeLogin(user, requestMeta);
  }

  /** Senha provisoria vencida/revogada nao autentica: o usuario precisa de nova emissao. Roda apos a senha ser validada (nao revela contas). */
  private async assertTemporaryCredentialValid(user: any, requestMeta?: RequestMeta) {
    if (!user.forcePasswordChange) return;
    const credential = await this.repository.findTemporaryCredential(user.id);
    if (!credential || isTemporaryCredentialUsable(credential)) return;
    await this.auditInvalidLogin(user.email, requestMeta, user.companyId, user.id);
    throw new UnauthorizedException({ code: 'TEMPORARY_PASSWORD_EXPIRED', message: 'Senha provisoria expirada. Solicite uma nova ao administrador.' });
  }

  /** Conclui o login (senha — e MFA, se houver — já validados): zera tentativas, registra e cria a sessão. */
  private async completeLogin(user: any, requestMeta?: RequestMeta) {
    if (user.failedLoginAttempts > 0 || user.lockedUntil) await this.repository.resetFailedLogins(user.id);
    const role = this.resolveRole(user);

    // Histórico de acessos: cada login fica registrado com IP e dispositivo.
    void this.repository.createAuditLog({
      companyId: user.companyId, userId: user.id, action: 'LOGIN_SUCCESS', entity: 'Auth', entityId: user.id,
      metadata: { email: user.email, mfa: Boolean(user.mfaEnabledAt) }, ipAddress: requestMeta?.ipAddress, userAgent: requestMeta?.userAgent,
    }).catch(() => undefined);

    return this.buildAuthResponse(this.payloadFor(user, role), this.passwordChangeRequired(user), requestMeta);
  }

  private payloadFor(user: any, role: UserRole): JwtUser {
    return {
      passwordVersion: user.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : 0,
      sub: user.id,
      email: user.email,
      name: user.name,
      companyId: user.companyId,
      role,
      customPermissions: user.customPermissions,
      companyStatus: user.company?.status,
      billingStatus: user.company?.billingStatus,
      onboardingState: user.onboardingState ?? null,
      // Perfis de plataforma sem MFA ficam limitados às rotas de autenticação até configurar.
      ...(this.mfa.isEnforcedFor(role) && !user.mfaEnabledAt ? { mfaPending: true } : {}),
    };
  }

  private assertNotLocked(lockedUntil?: Date | null) {
    if (lockedUntil && lockedUntil > new Date()) {
      const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000));
      throw new UnauthorizedException({ code: 'ACCOUNT_LOCKED', message: `Muitas tentativas incorretas. Tente novamente em ${minutes} min ou redefina sua senha.` });
    }
  }

  /** Conta a falha, aplica bloqueio progressivo e avisa o dono da conta por e-mail. */
  private async registerFailure(user: any, email: string, requestMeta?: RequestMeta) {
    const updated = await this.repository.incrementFailedLogins(user.id);
    await this.auditInvalidLogin(email, requestMeta, user.companyId, user.id);
    const lockMs = lockDurationMs(updated.failedLoginAttempts);
    if (!lockMs) return;
    const until = new Date(Date.now() + lockMs);
    await this.repository.setLockedUntil(user.id, until);
    void this.sendSecurityAlert(user, securityAlertEmail({
      name: user.name, title: 'Conta temporariamente bloqueada',
      detail: `Houve ${updated.failedLoginAttempts} tentativas de login incorretas. Por segurança a conta ficará bloqueada por ${Math.round(lockMs / 60_000)} minuto(s).`,
      ip: requestMeta?.ipAddress, userAgent: requestMeta?.userAgent, at: new Date(),
    }));
    this.assertNotLocked(until);
  }

  /** Segunda etapa do login: valida o código do app autenticador (ou um código de recuperação). */
  private async sendSecurityAlert(user: any, content: ReturnType<typeof securityAlertEmail>) {
    const admins = typeof this.repository.findSecurityAlertRecipients === 'function'
      ? await this.repository.findSecurityAlertRecipients(user.companyId)
      : [];
    const recipients = admins.length ? admins.map((admin) => admin.email) : [user.email];
    await Promise.allSettled(recipients.map((recipient) => this.mail.send(recipient, content)));
  }

  async verifyMfaLogin(dto: { mfaToken: string; code?: string; recoveryCode?: string }, requestMeta?: RequestMeta) {
    let payload: any;
    try { payload = await this.jwtService.verifyAsync(dto.mfaToken); } catch { throw new UnauthorizedException('Desafio expirado. Entre novamente.'); }
    if (payload?.purpose !== MFA_LOGIN_PURPOSE || !payload.sub) throw new UnauthorizedException('Desafio invalido.');
    const user = await this.repository.findUserById(payload.sub);
    if (!user || !user.isActive || Number(payload.pwd) !== new Date(user.passwordChangedAt).getTime()) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    this.assertNotLocked(user.lockedUntil);
    const role = this.resolveRole(user);
    if (!this.canAccessCompany(user.company, role)) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);

    const ok = await this.mfa.verifyLogin(user.id, { code: dto.code, recoveryCode: dto.recoveryCode });
    if (!ok) {
      await this.registerFailure(user, user.email, requestMeta);
      throw new UnauthorizedException('Codigo invalido.');
    }
    return this.completeLogin(user, requestMeta);
  }

  /** Troca o refresh token (rotação) e devolve um novo access token curto. */
  async refresh(refreshToken: string | undefined, requestMeta?: RequestMeta) {
    const rotated = await this.sessions.rotate(refreshToken ?? '', { ip: requestMeta?.ipAddress, userAgent: requestMeta?.userAgent });
    if (rotated.status === 'reuse') throw new UnauthorizedException({ code: 'SESSION_REUSED', message: 'Sessao encerrada por seguranca. Entre novamente.' });
    if (rotated.status !== 'ok') throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Sessao expirada. Entre novamente.' });

    const user = await this.repository.findUserById(rotated.userId);
    const role = user ? this.resolveRole(user) : null;
    if (!user || !user.isActive || !role || !this.canAccessCompany(user.company, role)) {
      await this.sessions.revokeFamily(rotated.userId, rotated.family);
      throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Sessao expirada. Entre novamente.' });
    }
    return this.buildAuthResponse(this.payloadFor(user, role), this.passwordChangeRequired(user), requestMeta, rotated.token);
  }

  async logout(refreshToken: string | undefined) {
    await this.sessions.revokeByToken(refreshToken);
    return { loggedOut: true };
  }

  async listSessions(userId: string, refreshToken: string | undefined) {
    return this.sessions.listActive(userId, await this.sessions.familyOf(refreshToken));
  }

  async revokeSession(userId: string, family: string) {
    const count = await this.sessions.revokeFamily(userId, family);
    if (!count) throw new NotFoundException('Sessao nao encontrada.');
    return { revoked: true };
  }

  async revokeOtherSessions(userId: string, refreshToken: string | undefined) {
    return { revoked: await this.sessions.revokeAllForUser(userId, (await this.sessions.familyOf(refreshToken)) ?? undefined) };
  }

  async mfaEnable(user: JwtUser, code: string, requestMeta?: RequestMeta, refreshToken?: string) {
    const { recoveryCodes } = await this.mfa.enable(user.sub, code);
    const fresh = await this.repository.findUserById(user.sub);
    if (!fresh) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    void this.repository.createAuditLog({ companyId: fresh.companyId, userId: fresh.id, action: 'MFA_ENABLED', entity: 'User', entityId: fresh.id, metadata: {}, ipAddress: requestMeta?.ipAddress, userAgent: requestMeta?.userAgent }).catch(() => undefined);
    // Novo access token sem a limitação "mfaPending"; a sessão atual (cookie) é mantida.
    const role = this.resolveRole(fresh);
    const auth = await this.buildAuthResponse(this.payloadFor(fresh, role), this.passwordChangeRequired(fresh), requestMeta, refreshToken);
    return { ...auth, recoveryCodes };
  }

  /** Confirma o e-mail pelo link enviado no cadastro. */
  async verifyEmail(token: string) {
    let payload: any;
    try { payload = await this.jwtService.verifyAsync(token); } catch { throw new BadRequestException('Link invalido ou expirado.'); }
    if (payload?.purpose !== EMAIL_VERIFY_PURPOSE || !payload.sub) throw new BadRequestException('Link invalido ou expirado.');
    await this.repository.markEmailVerified(payload.sub);
    return { verified: true };
  }

  async sendVerificationEmail(user: { id: string; email: string; name: string }) {
    const token = await this.jwtService.signAsync({ purpose: EMAIL_VERIFY_PURPOSE, sub: user.id, email: user.email }, { expiresIn: '3d' });
    const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    return this.mail.send(user.email, emailVerificationEmail({ name: user.name, url: `${base}/verify-email?token=${encodeURIComponent(token)}` }));
  }

  async resendVerification(userId: string) {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    if (user.emailVerifiedAt) return { alreadyVerified: true };
    const result = await this.sendVerificationEmail(user);
    return { sent: result.sent };
  }


  async requestPasswordReset(dto: RequestPasswordResetDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const user = await this.repository.findUserWithEmployeeByEmail(dto.email);
    if (!user || !user.isActive) return { requested: true };
    const role = this.resolveRole(user);
    if (!this.canAccessCompany(user.company, role)) return { requested: true };

    const { randomBytes } = await import('node:crypto');
    const code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await this.repository.setResetCode(user.id, code, expires);

    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    // Com e-mail configurado o próprio titular recebe o link (30 min, uso único) — sem depender do RH.
    if (this.mail.isConfigured()) {
      const token = await this.jwtService.signAsync({
        purpose: PASSWORD_RESET_PURPOSE, sub: user.id, email: user.email, passwordChangedAt: new Date(user.passwordChangedAt).getTime(),
      }, { expiresIn: '30m' });
      const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
      const sent = await this.mail.send(user.email, passwordResetEmail({ name: user.name, url: `${base}/reset-password?token=${encodeURIComponent(token)}`, minutes: 30 }));
      if (sent.sent) return { requested: true, channel: 'email' as const };
    }

    try {
      // Notifica todos os perfis privilegiados da empresa que podem liberar o código:
      // GESTOR (direto do colaborador), RH e ADMIN (responsáveis pela empresa)
      const rolesParaNotificar = ['GESTOR', 'RH', 'ADMIN'] as const;
      await Promise.allSettled(
        rolesParaNotificar.map((role) =>
          this.notificationsService.createAdminNotice(user.companyId, user.id, {
            type: 'SYSTEM_NOTICE',
            title: 'Código de Recuperação de Senha',
            message: `O colaborador ${user.employee?.name || user.name} (Email: ${user.email}) solicitou recuperação de senha. Informe o código apenas ao colaborador presencialmente.`,
            priority: 'HIGH',
            targetType: 'ROLE',
            targetRole: role,
            source: 'Security',
            extraJson: { resetCode: code },
          }),
        ),
      );
    } catch (err) {
      console.error('Failed to notify privileged roles about reset code:', err);
    }

    return { requested: true };
  }

  async validateResetCode(dto: ValidateResetCodeDto) {
    const user = await this.repository.findUserWithEmployeeByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Dados de validação incorretos');
    
    const storedCode = Buffer.from(user.resetPasswordCode ?? '');
    const providedCode = Buffer.from(dto.code.trim().toUpperCase());
    const codesMatch = storedCode.length === providedCode.length && timingSafeEqual(storedCode, providedCode);

    if (!user.resetPasswordCode || !codesMatch) {
      throw new UnauthorizedException('Código inválido ou expirado');
    }
    if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
      throw new UnauthorizedException('Código expirado');
    }

    // Usuários sem ficha de funcionário (ADMIN, CEO, contabilidade...) são validados apenas pelo código entregue pela empresa.
    const employee = user.employee;
    if (employee) {
      const rawCpf = employee.cpf ? employee.cpf.replace(/\D/g, '') : '';
      const cpfStart = (dto.cpfStart ?? '').trim();
      if (rawCpf && (!cpfStart || !rawCpf.startsWith(cpfStart))) {
        throw new UnauthorizedException('Dados de validação incorretos');
      }
      const empReg = (employee.registration || '').trim().toLowerCase();
      if (empReg && empReg !== (dto.registration ?? '').trim().toLowerCase()) {
        throw new UnauthorizedException('Dados de validação incorretos');
      }
    }

    const token = await this.jwtService.signAsync({
      purpose: PASSWORD_RESET_PURPOSE,
      sub: user.id,
      email: user.email,
      passwordChangedAt: new Date(user.passwordChangedAt).getTime(),
    }, { expiresIn: '15m' });
    
    await this.repository.clearResetCode(user.id);
    
    return { valid: true, resetToken: token };
  }

  async resetPassword(dto: ResetPasswordDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.token);
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado');
    }
    if (payload?.purpose !== PASSWORD_RESET_PURPOSE || !payload.sub) throw new UnauthorizedException('Token invalido ou expirado');

    const user = await this.repository.findUserById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const role = this.resolveRole(user);
    if (!this.canAccessCompany(user.company, role)) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    if (Number(payload.passwordChangedAt) !== new Date(user.passwordChangedAt).getTime()) throw new UnauthorizedException('Token invalido ou expirado');

    const reused = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (reused) throw new ConflictException('A nova senha precisa ser diferente da senha atual');
    
    // Check previous passwords
    for (const oldHash of user.previousPasswords) {
      const matched = await bcrypt.compare(dto.newPassword, oldHash);
      if (matched) throw new ConflictException('Você não pode reutilizar senhas antigas');
    }

    this.assertStrongPassword(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    
    const nextPrevious = [user.passwordHash, ...user.previousPasswords].slice(0, 10);
    await this.repository.updatePassword(user.id, passwordHash, nextPrevious);
    await this.sessions.revokeAllForUser(user.id);
    void this.mail.send(user.email, securityAlertEmail({ name: user.name, title: 'Sua senha foi redefinida', detail: 'A senha da sua conta foi alterada por meio da recuperação de senha. Todas as sessões foram encerradas.', ip: requestMeta.ipAddress, userAgent: requestMeta.userAgent, at: new Date() }));
    
    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: user.id,
      metadata: { reason: 'PASSWORD_RESET_TOKEN' },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });
    return { changed: true };
  }

  async me(user: JwtUser) {
    const freshUser = await this.repository.findUserById(user.sub);
    if (!freshUser || !freshUser.isActive) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const role = this.resolveRole(freshUser);
    if (!this.canAccessCompany(freshUser.company, role)) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    return {
      sub: freshUser.id,
      email: freshUser.email,
      name: freshUser.name,
      companyId: user.ghostMode ? user.companyId : freshUser.companyId,
      role,
      customPermissions: freshUser.customPermissions,
      companyStatus: freshUser.company?.status,
      billingStatus: freshUser.company?.billingStatus,
      onboardingState: freshUser.onboardingState ?? null,
      passwordChangeRequired: this.passwordChangeRequired(freshUser),
      emailVerified: Boolean(freshUser.emailVerifiedAt),
      mfaEnabled: Boolean(freshUser.mfaEnabledAt),
      mfaEnrollmentRequired: this.mfa.isEnforcedFor(role) && !freshUser.mfaEnabledAt,
    };
  }

  async changePassword(user: JwtUser, dto: ChangePasswordDto, requestMeta: { ipAddress?: string; userAgent?: string }, refreshToken?: string) {
    const freshUser = await this.repository.findUserById(user.sub);
    if (!freshUser || !freshUser.isActive) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const currentOk = await bcrypt.compare(dto.currentPassword, freshUser.passwordHash);
    if (!currentOk) throw new ConflictException('Senha atual invalida');
    
    const reused = await bcrypt.compare(dto.newPassword, freshUser.passwordHash);
    if (reused) throw new ConflictException('A nova senha precisa ser diferente da senha atual');
    
    // Check previous passwords
    for (const oldHash of freshUser.previousPasswords) {
      const matched = await bcrypt.compare(dto.newPassword, oldHash);
      if (matched) throw new ConflictException('Você não pode reutilizar senhas antigas');
    }

    this.assertStrongPassword(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    
    const nextPrevious = [freshUser.passwordHash, ...freshUser.previousPasswords].slice(0, 10);
    // CEO em onboarding: a troca de senha libera o preenchimento dos proprios dados (a identidade e comprovada na assinatura gov.br).
    const nextOnboarding = freshUser.role === 'CEO' && freshUser.onboardingState === 'PASSWORD_CHANGE' ? 'PROFILE_REQUIRED' : undefined;
    await this.repository.updatePassword(
      freshUser.id,
      passwordHash,
      nextPrevious,
      nextOnboarding,
    );
    // Troca de senha encerra as outras sessões; a atual (cookie) continua.
    const currentFamily = await this.sessions.familyOf(refreshToken, freshUser.id);
    await this.sessions.revokeAllForUser(freshUser.id, currentFamily ?? undefined);
    void this.mail.send(freshUser.email, securityAlertEmail({ name: freshUser.name, title: 'Sua senha foi alterada', detail: 'A senha da sua conta foi trocada. As outras sessões foram encerradas.', ip: requestMeta.ipAddress, userAgent: requestMeta.userAgent, at: new Date() }));
    
    await this.repository.createAuditLog({
      companyId: freshUser.companyId,
      userId: freshUser.id,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: freshUser.id,
      metadata: { reason: 'PASSWORD_POLICY_30_DAYS' },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });
    const updatedUser = await this.repository.findUserById(freshUser.id);
    if (!updatedUser) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const auth = await this.buildAuthResponse(this.payloadFor(updatedUser, this.resolveRole(updatedUser)), false, requestMeta, currentFamily ? refreshToken : undefined);
    return {
      ...auth,
      changed: true,
      passwordChangeRequired: false,
      onboardingState: updatedUser.onboardingState ?? null,
    };
  }

  private async auditInvalidLogin(email: string, requestMeta?: { ipAddress?: string; userAgent?: string }, companyId?: string, userId?: string) {
    if (!companyId) return;
    await this.repository.createAuditLog({
      companyId,
      userId,
      action: 'LOGIN_FAILED',
      entity: 'Auth',
      entityId: userId,
      metadata: { email: email.trim().toLowerCase() },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    }).catch(() => undefined);
  }

  private passwordChangeRequired(user: { passwordChangedAt?: Date | string | null; forcePasswordChange?: boolean }) {
    if (user.forcePasswordChange) return true;
    if (!user.passwordChangedAt) return true;
    const changedAt = new Date(user.passwordChangedAt);
    if (Number.isNaN(changedAt.getTime())) return true;
    const ageMs = Date.now() - changedAt.getTime();
    return ageMs >= PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  }

  /** Hash estável do documento para impedir reuso de teste/cupom. Sem TRIAL_DOCUMENT_HASH_SECRET usa o segredo do JWT (nunca falha o cadastro). */
  private documentHash(document: string) {
    const secret = process.env.TRIAL_DOCUMENT_HASH_SECRET || process.env.JWT_SECRET || process.env.SECRET_KEY;
    if (!secret) throw new InternalServerErrorException('Segredo de hash de documento nao configurado.');
    return createHmac('sha256', secret).update(document).digest('hex');
  }

  private assertValidDocument(document: string) {
    const digits = document.split('').map(Number);
    if (![11, 14].includes(digits.length) || /^(\d)\1+$/.test(document)) {
      throw new BadRequestException({ code: 'INVALID_DOCUMENT', message: 'Informe um CPF ou CNPJ valido.' });
    }
    const validCpf = () => {
      const calculate = (length: number) => {
        let sum = 0;
        for (let index = 0; index < length; index += 1) sum += digits[index] * (length + 1 - index);
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
      };
      return calculate(9) === digits[9] && calculate(10) === digits[10];
    };
    const validCnpj = () => {
      const calculate = (length: number) => {
        const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const sum = weights.reduce((total, weight, index) => total + digits[index] * weight, 0);
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
      };
      return calculate(12) === digits[12] && calculate(13) === digits[13];
    };
    if ((digits.length === 11 && !validCpf()) || (digits.length === 14 && !validCnpj())) {
      throw new BadRequestException({ code: 'INVALID_DOCUMENT', message: 'Informe um CPF ou CNPJ valido.' });
    }
  }

  private assertStrongPassword(password: string) {
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('A senha precisa ter no minimo 10 caracteres, letra maiuscula, minuscula, numero e simbolo');
    }
  }
  private resolveRole(user: { id: string; email: string; role: UserRole }): UserRole {
    return isPlatformOwner(user) ? 'DEV' : user.role;
  }

  private canAccessCompany(company: { status?: string; billingStatus?: string } | null | undefined, role: UserRole) {
    if (role === 'DEV') return true;
    if (role === 'ADMIN') return Boolean(company && company.billingStatus !== 'CANCELED');
    if (company?.billingStatus === 'PAST_DUE' || company?.billingStatus === 'PENDING_PAYMENT') return true;
    return Boolean(company && (company.status ?? 'ACTIVE') === 'ACTIVE' && company.billingStatus !== 'CANCELED');
  }

  /** Monta a resposta de autenticação. Sem `existingRefresh`, abre uma sessão nova (refresh token no cookie, nunca no corpo). */
  private async buildAuthResponse(payload: JwtUser, passwordChangeRequired = false, requestMeta?: RequestMeta, existingRefresh?: string) {
    const company = await this.repository.findCompanyAuthContext(payload.companyId);
    if (!company) throw new UnauthorizedException('Company not found');

    const existingFamily = await this.sessions.familyOf(existingRefresh, payload.sub);
    const created = existingFamily ? null : await this.sessions.create(payload.sub, { ip: requestMeta?.ipAddress, userAgent: requestMeta?.userAgent });
    const refreshToken = existingFamily ? existingRefresh! : created!.token;
    const sessionFamily = existingFamily ?? created!.session.family;
    return {
      access_token: await this.jwtService.signAsync({ ...payload, purpose: 'access', sessionFamily }),
      refreshToken,
      user: payload,
      company: {
        ...company,
        slug: company.slug || company.id,
      },
      passwordChangeRequired,
      mfaEnrollmentRequired: Boolean(payload.mfaPending),
    };
  }
  async searchEmployeesForPasswordReset(
    actor: JwtUser,
    search: string,
  ) {
    this.assertCanResetEmployeePassword(actor);

    const normalizedSearch = search?.trim() ?? '';

    if (normalizedSearch.length < 2) {
      return [];
    }

    return this.repository.searchEmployeesForPasswordReset(
      actor.companyId,
      normalizedSearch,
    );
  }

  async adminResetEmployeePassword(
    actor: JwtUser,
    employeeId: string,
    newPassword: string,
    requestMeta?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    this.assertCanResetEmployeePassword(actor);
    this.assertStrongPassword(newPassword);

    const employee =
      await this.repository.findEmployeeUserForPasswordReset(
        actor.companyId,
        employeeId,
      );

    if (!employee || !employee.user) {
      throw new NotFoundException(
        'Funcionário com acesso ao sistema não encontrado.',
      );
    }

    if (!employee.user.isActive) {
      throw new BadRequestException(
        'O acesso deste funcionário está desativado.',
      );
    }

    if (!this.canResetTargetRole(actor.role, employee.user.role)) {
      throw new ForbiddenException(
        'Você não possui permissão para redefinir a senha deste perfil.',
      );
    }

    if (employee.user.id === actor.sub) {
      throw new BadRequestException(
        'Para alterar a própria senha, utilize a opção Minha senha.',
      );
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      employee.user.passwordHash,
    );

    if (samePassword) {
      throw new ConflictException(
        'A nova senha precisa ser diferente da senha atual do funcionário.',
      );
    }

    for (const previousHash of employee.user.previousPasswords ?? []) {
      const alreadyUsed = await bcrypt.compare(
        newPassword,
        previousHash,
      );

      if (alreadyUsed) {
        throw new ConflictException(
          'Esta senha já foi utilizada anteriormente pelo funcionário.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const nextPreviousPasswords = [
      employee.user.passwordHash,
      ...(employee.user.previousPasswords ?? []),
    ].slice(0, 10);

    await this.repository.adminUpdatePassword(
      employee.user.id,
      passwordHash,
      nextPreviousPasswords,
    );

    await this.repository.createAuditLog({
      companyId: actor.companyId,
      userId: actor.sub,
      action: 'EMPLOYEE_PASSWORD_RESET_BY_ADMIN',
      entity: 'User',
      entityId: employee.user.id,
      metadata: {
        employeeId: employee.id,
        employeeName: employee.name,
        employeeRegistration: employee.registration,
        actorRole: actor.role,
        forcePasswordChange: true,
      },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return {
      reset: true,
      forcePasswordChange: true,
      employee: {
        id: employee.id,
        name: employee.name,
        registration: employee.registration,
      },
    };
  }

  private assertCanResetEmployeePassword(actor: JwtUser) {
    if (!['ADMIN', 'RH', 'DEV'].includes(actor.role)) {
      throw new ForbiddenException(
        'Você não possui permissão para redefinir senhas.',
      );
    }
  }

  private canResetTargetRole(
    actorRole: UserRole,
    targetRole: UserRole,
  ) {
    const allowedTargets: Record<UserRole, UserRole[]> = {
      DEV: [
        'CEO',
        'CONTABIL',
        'COMERCIAL',
        'ADMIN',
        'RH',
        'RH_RS',
        'GESTOR',
        'FUNCIONARIO',
        'CONSULTA',
      ],
      CEO: [
        'ADMIN',
        'RH',
        'RH_RS',
        'GESTOR',
        'FUNCIONARIO',
        'CONSULTA',
      ],
      CONTABIL: [],
      ADMIN: [
        'ADMIN',
        'RH',
        'RH_RS',
        'GESTOR',
        'FUNCIONARIO',
        'CONSULTA',
      ],
      RH: [
        'RH',
        'GESTOR',
        'FUNCIONARIO',
        'CONSULTA',
      ],
      COMERCIAL: [],
      RH_RS: [],
      GESTOR: [],
      FUNCIONARIO: [],
      CONSULTA: [],
    };

    return allowedTargets[actorRole]?.includes(targetRole) ?? false;
  }
}
