import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  companyId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditQuery {
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  companyId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

const GENESIS = 'GENESIS';
const SECRET_KEY = /pass(word)?|token|secret|api[-_]?key|authorization|credential|cvv|card/i;
const ADVISORY_LOCK = 71_001;

/** Remove segredos e limita o tamanho antes de gravar. */
export function sanitizeForAudit(value: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;
  if (depth > 5) return '[truncado]';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeForAudit(item, depth + 1) ?? null) as Prisma.InputJsonArray;
  if (typeof value === 'object') {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 60)) {
      out[key] = SECRET_KEY.test(key) ? '[oculto]' : sanitizeForAudit(item, depth + 1);
    }
    return out as Prisma.InputJsonObject;
  }
  return null;
}

/** Serialização estável (chaves ordenadas) usada no hash. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}

export function computeAuditHash(prevHash: string, row: { id: string; createdAt: Date } & Omit<AuditEntry, 'actorRole'> & { actorRole?: string | null }): string {
  const payload = canonical({
    id: row.id, at: row.createdAt.toISOString(), actorId: row.actorId ?? null, actorRole: row.actorRole ?? null, action: row.action, entity: row.entity,
    entityId: row.entityId ?? null, companyId: row.companyId ?? null, before: row.before ?? null, after: row.after ?? null, reason: row.reason ?? null,
  });
  return createHash('sha256').update(`${prevHash}|${payload}`).digest('hex');
}

/**
 * Auditoria global (append-only). Cada linha guarda o hash da anterior: qualquer alteração ou remoção
 * posterior quebra a cadeia e é apontada por verify().
 */
@Injectable()
export class PlatformAuditService {
  private readonly logger = new Logger(PlatformAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Nunca derruba a operação de negócio, mas registra erro alto se a gravação falhar. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.write(entry);
    } catch (error) {
      this.logger.error(`FALHA AO GRAVAR AUDITORIA (${entry.action} ${entry.entity}/${entry.entityId ?? '-'}): ${String(error)}`);
    }
  }

  async write(entry: AuditEntry) {
    const id = randomUUID();
    const createdAt = new Date(Math.floor(Date.now()));
    const before = sanitizeForAudit(entry.before);
    const after = sanitizeForAudit(entry.after);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK})`;
      const last = await tx.platformAuditLog.findFirst({ orderBy: { seq: 'desc' }, select: { hash: true } });
      const prevHash = last?.hash ?? GENESIS;
      const row = { id, createdAt, actorId: entry.actorId ?? null, actorRole: entry.actorRole ?? null, action: entry.action, entity: entry.entity, entityId: entry.entityId ?? null, companyId: entry.companyId ?? null, before, after, reason: entry.reason ?? null };
      const hash = computeAuditHash(prevHash, row);
      return tx.platformAuditLog.create({
        data: {
          id, createdAt, actorId: row.actorId, actorRole: row.actorRole, action: row.action, entity: row.entity, entityId: row.entityId, companyId: row.companyId,
          before: before ?? Prisma.JsonNull, after: after ?? Prisma.JsonNull, reason: row.reason, ip: entry.ip ?? null, userAgent: entry.userAgent?.slice(0, 300) ?? null, prevHash, hash,
        },
      });
    });
  }

  async list(query: AuditQuery) {
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 50, 1), 200);
    const page = Math.max(Number(query.page) || 1, 1);
    const where: Prisma.PlatformAuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`) } : {}) } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.platformAuditLog.findMany({ where, orderBy: { seq: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.platformAuditLog.count({ where }),
    ]);
    return { items: items.map((item) => ({ ...item, seq: Number(item.seq) })), total, page, pageSize };
  }

  /** Percorre a cadeia inteira em lotes e aponta a primeira linha adulterada. */
  async verify() {
    let prev = GENESIS;
    let checked = 0;
    let cursor = BigInt(0);
    for (;;) {
      const batch = await this.prisma.platformAuditLog.findMany({ where: { seq: { gt: cursor } }, orderBy: { seq: 'asc' }, take: 500 });
      if (!batch.length) break;
      for (const row of batch) {
        const expected = computeAuditHash(row.prevHash, {
          id: row.id, createdAt: row.createdAt, actorId: row.actorId, actorRole: row.actorRole, action: row.action, entity: row.entity, entityId: row.entityId,
          companyId: row.companyId, before: row.before, after: row.after, reason: row.reason,
        });
        if (row.prevHash !== prev || row.hash !== expected) return { valid: false, checked, brokenAtSeq: Number(row.seq), brokenId: row.id };
        prev = row.hash;
        checked += 1;
        cursor = row.seq;
      }
    }
    return { valid: true, checked, brokenAtSeq: null as number | null, brokenId: null as string | null };
  }
}
