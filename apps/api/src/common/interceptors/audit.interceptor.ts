import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SECRET_KEYS = ['password', 'currentPassword', 'newPassword', 'passwordHash', 'token', 'access_token', 'authorization'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const user = request.user;
    if (!WRITE_METHODS.has(method) || !user?.companyId) return next.handle();

    const startedAt = Date.now();
    return next.handle().pipe(
      tap({
        next: (result) => {
          void this.writeAudit(request, result, startedAt).catch(() => undefined);
        },
      }),
    );
  }

  private async writeAudit(request: any, result: unknown, startedAt: number) {
    const user = request.user;
    const params = request.params ?? {};
    const path = request.route?.path ?? request.url;
    await this.prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.sub,
        action: `${request.method} ${path}`.slice(0, 120),
        entity: this.resolveEntity(path),
        entityId: params.id ?? params.userId ?? params.employeeId ?? params.companyId ?? null,
        metadata: {
          path: request.url,
          method: request.method,
          params,
          body: sanitize(request.body),
          status: 'SUCCESS',
          durationMs: Date.now() - startedAt,
          resultId: extractResultId(result) ?? null,
        } as any,
        ipAddress: getIpAddress(request),
        userAgent: request.headers?.['user-agent'],
      },
    });
  }

  private resolveEntity(path: string) {
    const parts = String(path || '').split('/').filter(Boolean);
    // Skip common API prefix segments like 'api' or 'v1'
    const meaningful = parts.find(p => !['api', 'v1', 'v2'].includes(p.toLowerCase())) ?? parts[0] ?? 'Unknown';
    return meaningful.charAt(0).toUpperCase() + meaningful.slice(1);
  }
}

function sanitize(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
    if (SECRET_KEYS.includes(key)) return [key, '[REDACTED]'];
    return [key, sanitize(entry)];
  }));
}

function extractResultId(result: unknown) {
  const data = result && typeof result === 'object' && 'data' in result ? (result as any).data : result;
  return data && typeof data === 'object' && 'id' in data ? String((data as any).id) : undefined;
}

function getIpAddress(request: any) {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim() || request.ip;
}