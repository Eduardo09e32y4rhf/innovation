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

  async create(userId: string, meta: SessionMeta, existingFamily?: string) {
    const family = existingFamily ?? randomUUID();
    const userAgent = meta.userAgent?.slice(0, 300) ?? null;
    if (!existingFamily) {
      // Novo login no mesmo aparelho e rede: substitui a sessão anterior em vez de empilhar várias iguais.
      await this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null, userAgent, ip: meta.ip ?? null }, data: { revokedAt: new Date() } });
    }
    const token = randomBytes(48).toString('base64url');
    const session = await this.prisma.refreshSession.create({
      data: { userId, family, tokenHash: hashToken(token), ip: meta.ip ?? null, userAgent, expiresAt: new Date(Date.now() + ttlMs()) },
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

    const nextToken = randomBytes(48).toString('base64url');
    const next = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const consumed = await tx.refreshSession.updateMany({
        where: { id: current.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now, lastUsedAt: now },
      });
      if (consumed.count !== 1) return null;
      const successor = await tx.refreshSession.create({
        data: { userId: current.userId, family: current.family, tokenHash: hashToken(nextToken),
          ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 300) ?? null, expiresAt: new Date(now.getTime() + ttlMs()) },
      });
      await tx.refreshSession.update({ where: { id: current.id }, data: { replacedBy: successor.id } });
      return successor;
    });
    if (!next) return { status: 'invalid' };
    return { status: 'ok', userId: current.userId, token: nextToken, sessionId: next.id, family: current.family };
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

  async familyOf(token: string | undefined, userId?: string) {
    if (!token) return null;
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(token) }, select: { family: true, revokedAt: true, expiresAt: true, userId: true } });
    return session && !session.revokedAt && session.expiresAt > new Date() && (!userId || session.userId === userId) ? session.family : null;
  }

  /** Uma linha por dispositivo (família), a mais recente. */
  async listActive(userId: string, currentFamily: string | null) {
    const rows = await this.prisma.refreshSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, family: true, ip: true, userAgent: true, createdAt: true, lastUsedAt: true },
    });
    rows.sort((a, b) => Number(b.family === currentFamily) - Number(a.family === currentFamily));
    const seen = new Set<string>();
    const device = new Set<string>();
    return rows.filter((row) => {
      const key = JSON.stringify([row.userAgent, row.ip]);
      // Mesma família ou mesmo aparelho (navegador + rede): mostra só a mais recente.
      if (seen.has(row.family) || device.has(key)) return false;
      seen.add(row.family); device.add(key);
      return true;
    }).map((row) => ({
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
