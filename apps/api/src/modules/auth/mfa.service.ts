import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { decryptTemporaryPassword, encryptTemporaryPassword } from '../../common/crypto/temporary-password';
import { PrismaService } from '../../database/prisma.service';
import { SecurityStore } from './security-store';
import { generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, matchTotpStep, otpauthUrl } from './totp';

const DEFAULT_ENFORCED = 'DEV,CEO,CONTABIL,COMERCIAL';

/**
 * Perfis que não conseguem operar sem MFA. Em produção é obrigatório por padrão (a tela /mfa de cadastro já existe);
 * desligue só conscientemente com MFA_ENFORCE=false. Fora de produção fica desligado, salvo MFA_ENFORCE=true.
 * Para incluir o ADMIN de empresa: MFA_ENFORCE_ROLES=DEV,CEO,CONTABIL,COMERCIAL,ADMIN.
 */
export function mfaEnforcedRoles(env: NodeJS.ProcessEnv = process.env): string[] {
  const flag = String(env.MFA_ENFORCE ?? (env.NODE_ENV === 'production' ? 'true' : 'false')).toLowerCase();
  if (flag !== 'true') return [];
  return String(env.MFA_ENFORCE_ROLES ?? DEFAULT_ENFORCED).split(',').map((role) => role.trim().toUpperCase()).filter(Boolean);
}

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService, private readonly store: SecurityStore) {}

  isEnforcedFor(role: string) {
    return mfaEnforcedRoles().includes(String(role).toUpperCase());
  }

  async status(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, mfaEnabledAt: true, mfaRecoveryHashes: true } });
    if (!user) throw new NotFoundException('Usuario nao encontrado.');
    return { enabled: Boolean(user.mfaEnabledAt), enabledAt: user.mfaEnabledAt, required: this.isEnforcedFor(user.role), recoveryCodesLeft: user.mfaRecoveryHashes.length };
  }

  /** Gera um segredo novo (pendente) e devolve o QR. Só vira MFA ativo depois de confirmar um código. */
  async setup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, mfaEnabledAt: true } });
    if (!user) throw new NotFoundException('Usuario nao encontrado.');
    if (user.mfaEnabledAt) throw new ConflictException('A autenticacao em duas etapas ja esta ativa.');
    const secret = generateTotpSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecretEnc: encryptTemporaryPassword(secret) } });
    const url = otpauthUrl(secret, user.email);
    return { secret, otpauthUrl: url, qrDataUrl: await QRCode.toDataURL(url, { margin: 1, width: 220 }) };
  }

  /** Confirma o primeiro código, ativa o MFA e entrega os códigos de recuperação (única vez). */
  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { mfaSecretEnc: true, mfaEnabledAt: true } });
    if (!user?.mfaSecretEnc) throw new BadRequestException('Inicie a configuracao antes de confirmar o codigo.');
    if (user.mfaEnabledAt) throw new ConflictException('A autenticacao em duas etapas ja esta ativa.');
    if (!(await this.acceptTotp(userId, this.secretOf(user.mfaSecretEnc), code))) throw new BadRequestException('Codigo invalido. Confira o horario do celular e tente de novo.');
    const recoveryCodes = generateRecoveryCodes();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabledAt: new Date(), mfaRecoveryHashes: recoveryCodes.map(hashRecoveryCode) } });
    return { recoveryCodes };
  }

  /** TOTP válido E ainda não usado: o mesmo código (passo de 30 s) nunca vale duas vezes, mesmo dentro da janela de tolerância. */
  private async acceptTotp(userId: string, secret: string, code: string): Promise<boolean> {
    const step = matchTotpStep(secret, code);
    if (step === null) return false;
    return this.store.claimOnce(`totp:${userId}:${step}`, 120);
  }

  /** Valida o segundo fator: TOTP (uso único) ou código de recuperação (consumido de forma atômica). */
  async verifyLogin(userId: string, input: { code?: string; recoveryCode?: string }): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { mfaSecretEnc: true, mfaEnabledAt: true, mfaRecoveryHashes: true } });
    if (!user?.mfaEnabledAt || !user.mfaSecretEnc) return false;
    if (input.code && (await this.acceptTotp(userId, this.secretOf(user.mfaSecretEnc), input.code))) return true;
    if (input.recoveryCode) {
      const hash = hashRecoveryCode(input.recoveryCode);
      if (user.mfaRecoveryHashes.includes(hash)) {
        // Compare-and-set: duas requisições com o mesmo código disputam a mesma linha; só uma consome.
        const consumed = await this.prisma.user.updateMany({
          where: { id: userId, mfaRecoveryHashes: { equals: user.mfaRecoveryHashes } },
          data: { mfaRecoveryHashes: user.mfaRecoveryHashes.filter((item) => item !== hash) },
        });
        return consumed.count === 1;
      }
    }
    return false;
  }

  /** Auto-desativação: só para perfis que não são obrigados a ter MFA e exige um segundo fator válido (ASVS 2.8 / re-autenticação). */
  async disable(userId: string, input: { code?: string; recoveryCode?: string } = {}) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException('Usuario nao encontrado.');
    if (this.isEnforcedFor(user.role)) throw new ForbiddenException('Este perfil e obrigado a manter a autenticacao em duas etapas.');
    if (!(await this.verifyLogin(userId, input))) throw new ForbiddenException('Informe um codigo valido do app autenticador para desativar.');
    await this.reset(userId);
  }

  /** Remove o segundo fator (usado por DEV quando o usuário perdeu o aparelho e os códigos). */
  async reset(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecretEnc: null, mfaEnabledAt: null, mfaRecoveryHashes: [] } });
  }

  private secretOf(encrypted: string) {
    return decryptTemporaryPassword(encrypted);
  }
}
