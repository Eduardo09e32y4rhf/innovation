import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CandidateAccount } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { CONSENT_LABELS, CONSENT_TEXTS, consentTextHash, type ConsentPurpose } from './recruitment-consent';
import { consentReceiptEmail } from './recruitment-mails';
import { PRIVACY_VERSION } from './recruitment-privacy';
import { appBase } from './recruitment-tokens';

const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

type Ctx = { ip?: string; userAgent?: string };

/**
 * RS-D-06 / RS-C-18. Livro de consentimentos do candidato: cada aceite guarda o hash do texto exibido, a versao da politica,
 * IP e user agent. O recibo por e-mail traz um link (token de uso longo, so o hash fica gravado) para revogar.
 * O banco de talentos pedido na candidatura SEM conta so vale depois de confirmar pelo e-mail (duplo aceite).
 */
@Injectable()
export class CandidateConsentService {
  private readonly logger = new Logger(CandidateConsentService.name);

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  private async insert(input: { email: string; purpose: ConsentPurpose; accountId?: string | null; applicationId?: string | null; companyId?: string | null; confirmed: boolean } & Ctx) {
    const token = randomBytes(32).toString('hex');
    const row = await this.prisma.candidateConsent.create({
      data: {
        email: input.email.trim().toLowerCase(), purpose: input.purpose, accountId: input.accountId ?? null, applicationId: input.applicationId ?? null, companyId: input.companyId ?? null,
        policyVersion: PRIVACY_VERSION, textHash: consentTextHash(input.purpose), ip: input.ip ?? null, userAgent: input.userAgent?.slice(0, 400) ?? null,
        confirmedAt: input.confirmed ? new Date() : null, tokenHash: hashToken(token),
      },
    });
    return { row, token };
  }

  /** Candidatura enviada: registra os aceites (candidatura, e opcionalmente banco de talentos e dados sensiveis) e manda UM recibo. Nunca derruba a candidatura. */
  async recordApplication(input: { email: string; name: string; applicationId: string; companyId: string; jobTitle: string; company: string; talentPoolOptIn: boolean; sensitive: boolean } & Ctx) {
    try {
      const purposes: ConsentPurpose[] = ['APPLICATION', ...(input.talentPoolOptIn ? (['TALENT_POOL'] as const) : []), ...(input.sensitive ? (['SENSITIVE_DATA'] as const) : [])];
      const items: { purpose: ConsentPurpose; token: string; needsConfirm: boolean }[] = [];
      const ids: string[] = [];
      for (const purpose of purposes) {
        const needsConfirm = purpose === 'TALENT_POOL';
        const { row, token } = await this.insert({ email: input.email, purpose, applicationId: input.applicationId, companyId: input.companyId, confirmed: !needsConfirm, ip: input.ip, userAgent: input.userAgent });
        items.push({ purpose, token, needsConfirm });
        ids.push(row.id);
      }
      const base = `${appBase()}/carreiras/consentimento`;
      const result = await this.mail.send(input.email.trim().toLowerCase(), consentReceiptEmail({
        name: input.name, company: input.company, jobTitle: input.jobTitle, version: PRIVACY_VERSION,
        items: items.map((item) => ({ label: CONSENT_LABELS[item.purpose], text: CONSENT_TEXTS[item.purpose], revokeUrl: `${base}?token=${item.token}&acao=revogar`, confirmUrl: item.needsConfirm ? `${base}?token=${item.token}&acao=confirmar` : null })),
      }));
      if (result.sent) await this.prisma.candidateConsent.updateMany({ where: { id: { in: ids } }, data: { receiptSentAt: new Date() } });
    } catch (error) {
      this.logger.error(`Registro de consentimento falhou (${input.applicationId}): ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Aceite ou revogacao feitos dentro da conta (banco de talentos, aceite de privacidade). */
  async recordAccountChange(account: Pick<CandidateAccount, 'id' | 'email'>, purpose: ConsentPurpose, granted: boolean, ctx: Ctx = {}) {
    try {
      if (granted) {
        await this.insert({ email: account.email, purpose, accountId: account.id, confirmed: true, ...ctx });
      } else {
        await this.prisma.candidateConsent.updateMany({ where: { email: account.email.toLowerCase(), purpose, revokedAt: null }, data: { revokedAt: new Date(), revokedVia: 'ACCOUNT' } });
      }
    } catch (error) {
      this.logger.error(`Registro de consentimento da conta falhou: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async load(token: string) {
    const invalid = new BadRequestException('Link inválido ou expirado.');
    if (!/^[a-f0-9]{64}$/.test(String(token ?? ''))) throw invalid;
    const row = await this.prisma.candidateConsent.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row) throw invalid;
    return row;
  }

  /** Duplo aceite do banco de talentos: so agora o perfil pode aparecer para outras empresas. */
  async confirm(token: string) {
    const row = await this.load(token);
    if (row.purpose !== 'TALENT_POOL') throw new BadRequestException('Este consentimento não precisa de confirmação.');
    if (row.revokedAt) throw new BadRequestException('Este consentimento já foi revogado.');
    if (row.confirmedAt) return { confirmed: true, purpose: row.purpose };
    const claimed = await this.prisma.candidateConsent.updateMany({ where: { id: row.id, confirmedAt: null, revokedAt: null }, data: { confirmedAt: new Date() } });
    if (!claimed.count) return { confirmed: true, purpose: row.purpose };
    const now = new Date();
    const existing = await this.prisma.candidateAccount.findUnique({ where: { email: row.email }, select: { id: true, talentPoolConsentAt: true } });
    if (existing) {
      if (!existing.talentPoolConsentAt) await this.prisma.candidateAccount.update({ where: { id: existing.id }, data: { talentPoolConsentAt: now } });
    } else {
      const app = row.applicationId ? await this.prisma.application.findUnique({ where: { id: row.applicationId }, select: { id: true, candidate: { select: { name: true, phone: true } } } }) : null;
      // Conta sem senha (a pessoa pode assumi-la por "Esqueci minha senha"); so nome, telefone e o consentimento.
      await this.prisma.candidateAccount.create({ data: { email: row.email, name: app?.candidate.name ?? null, phone: app?.candidate.phone ?? null, talentPoolConsentAt: now } });
    }
    return { confirmed: true, purpose: row.purpose };
  }

  /** Revogacao pelo link do recibo. Idempotente. */
  async revoke(token: string) {
    const row = await this.load(token);
    if (row.revokedAt) return { revoked: true, purpose: row.purpose };
    await this.applyRevocation(row, 'EMAIL_LINK');
    return { revoked: true, purpose: row.purpose };
  }

  private async applyRevocation(row: { id: string; purpose: string; email: string; applicationId: string | null }, via: string) {
    await this.prisma.candidateConsent.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date(), revokedVia: via } });
    if (row.purpose === 'TALENT_POOL') {
      await this.prisma.candidateAccount.updateMany({ where: { email: row.email }, data: { talentPoolConsentAt: null } });
    } else if (row.purpose === 'SENSITIVE_DATA' && row.applicationId) {
      await this.prisma.candidateDiversity.deleteMany({ where: { applicationId: row.applicationId } });
    } else if (row.purpose === 'APPLICATION' && row.applicationId) {
      // Sem base legal para seguir tratando: o prazo de retencao vence agora e o cron diario anonimiza (contratados sao preservados).
      await this.prisma.application.update({ where: { id: row.applicationId }, data: { retentionUntil: new Date() } });
      await this.prisma.applicationEvent.create({ data: { applicationId: row.applicationId, type: 'CONSENT_REVOKED', note: 'Candidato revogou o consentimento. Os dados serão eliminados na próxima rotina de retenção (LGPD art. 8, §5).' } });
    }
  }

  async listForAccount(account: Pick<CandidateAccount, 'email'>) {
    const rows = await this.prisma.candidateConsent.findMany({ where: { email: account.email.toLowerCase() }, orderBy: { grantedAt: 'desc' }, take: 100 });
    return rows.map((row) => ({
      id: row.id, purpose: row.purpose, label: CONSENT_LABELS[row.purpose as ConsentPurpose] ?? row.purpose, policyVersion: row.policyVersion, grantedAt: row.grantedAt,
      confirmedAt: row.confirmedAt, revokedAt: row.revokedAt, pendingConfirmation: row.purpose === 'TALENT_POOL' && !row.confirmedAt && !row.revokedAt, receiptSentAt: row.receiptSentAt,
    }));
  }

  async revokeForAccount(account: Pick<CandidateAccount, 'id' | 'email'>, id: string) {
    const row = await this.prisma.candidateConsent.findFirst({ where: { id, email: account.email.toLowerCase() } });
    if (!row) throw new NotFoundException('Consentimento não encontrado.');
    if (!row.revokedAt) await this.applyRevocation(row, 'ACCOUNT');
    return { revoked: true };
  }
}
