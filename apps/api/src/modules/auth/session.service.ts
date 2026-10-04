import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';

export interface SessionMeta { ip?: string; userAgent?: string }
export type RotateResult =
  | { status: 'ok'; userId: string; token: string; sessionId: string; family: string }
  | { status: 'invalid' }
  | { status: 'reuse'; userId: string };

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const ttlMs = () => Math.max(1, Number(process.env.REFRESH_TTL_DAYS ?? 30) || 30) * 86_400_000;

/**
 * Sessões com refresh token rotativo. O token opaco só existe no cookie httpOnly; no banco fica o SHA-256.
 * Cada uso troca o token (rotação). Reapresentar um token já trocado indica roubo: a família inteira é revogada.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, meta: SessionMeta, family: string = randomUUID()) {
    const token = randomBytes(48).toString('base64url');
    const session = await this.prisma.refreshSession.create({
      data: { userId, family, tokenHash: hashToken(token), ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 300) ?? null, expiresAt: new Date(Date.now() + ttlMs()) },
    });
    return { token, session };
  }

  async rotate(token: string, meta: SessionMeta): Promise<RotateResult> {
    if (!token || token.length < 40) return { status: 'invalid' };
    const current = await this.prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!current) return { status: 'invalid' };

    if (current.revokedAt) {
      // Token já usado/revogado sendo reapresentado: derruba toda a cadeia.
      await this.prisma.refreshSession.updateMany({ where: { family: current.family, revokedAt: null }, data: { revokedAt: new Date() } });
      this.logger.warn(`Reuso de refresh token detectado (usuário ${current.userId}); família revogada.`);
      return { status: 'reuse', userId: current.userId };
    }
    if (current.expiresAt < new Date()) return { status: 'invalid' };

    const next = await this.create(current.userId, meta, current.family);
    await this.prisma.refreshSession.update({ where: { id: current.id }, data: { revokedAt: new Date(), lastUsedAt: new Date(), replacedBy: next.session.id } });
    return { status: 'ok', userId: current.userId, token: next.token, sessionId: next.session.id, family: current.family };
  }

  /** Encerra a sessão do cookie atual (logout). */
  async revokeByToken(token: string | undefined) {
    if (!token) return;
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(token) }, select: { family: true } });
    if (session) await this.prisma.refreshSession.updateMany({ where: { family: session.family, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async revokeAllForUser(userId: string, exceptFamily?: string) {
    const result = await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null, ...(exceptFamily ? { family: { not: exceptFamily } } : {}) },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async revokeFamily(userId: string, family: string) {
    const result = await this.prisma.refreshSession.updateMany({ where: { userId, family, revokedAt: null }, data: { revokedAt: new Date() } });
    return result.count;
  }

  async familyOf(token: string | undefined) {
    if (!token) return null;
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(token) }, select: { family: true, revokedAt: true } });
    return session && !session.revokedAt ? session.family : null;
  }

  /** Uma linha por dispositivo (família), a mais recente. */
  async listActive(userId: string, currentFamily: string | null) {
    const rows = await this.prisma.refreshSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, family: true, ip: true, userAgent: true, createdAt: true, lastUsedAt: true },
    });
    const seen = new Set<string>();
    return rows.filter((row) => !seen.has(row.family) && seen.add(row.family)).map((row) => ({
      id: row.family, ip: row.ip, userAgent: row.userAgent, createdAt: row.createdAt, lastUsedAt: row.lastUsedAt, current: row.family === currentFamily,
    }));
  }

  @Cron('0 4 * * *')
  async purgeOld() {
    const result = await this.prisma.refreshSession.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: new Date(Date.now() - 7 * 86_400_000) } }] },
    });
    if (result.count) this.logger.log(`Sessões antigas removidas: ${result.count}`);
  }
}
