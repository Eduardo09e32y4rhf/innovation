import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PlatformAuditService } from './platform-audit.service';

const AUDITED_KEY = 'platform:audited';
export interface AuditedOptions {
  action: string;
  entity: string;
  /** Campo do corpo que guarda o motivo, quando existir. */
  reasonField?: string;
}

/** Registra a ação no log global de auditoria quando o handler conclui com sucesso. */
export const Audited = (options: AuditedOptions) => applyDecorators(SetMetadata(AUDITED_KEY, options), UseInterceptors(AuditedInterceptor));

@Injectable()
export class AuditedInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly audit: PlatformAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditedOptions>(AUDITED_KEY, context.getHandler());
    if (!options) return next.handle();
    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(
      tap((result) => {
        const user = request.user as { sub?: string; role?: string; companyId?: string } | undefined;
        const body = request.body && typeof request.body === 'object' ? (request.body as Record<string, unknown>) : undefined;
        const resultObject = result && typeof result === 'object' ? (result as Record<string, unknown>) : undefined;
        const entityId = (resultObject?.id as string | undefined) ?? (request.params?.id as string | undefined) ?? (request.params?.companyId as string | undefined);
        const companyId = (resultObject?.companyId as string | undefined) ?? (request.params?.companyId as string | undefined);
        void this.audit.log({
          actorId: user?.sub, actorRole: user?.role, action: options.action, entity: options.entity, entityId, companyId,
          after: body, reason: options.reasonField ? (body?.[options.reasonField] as string | undefined) : undefined,
          ip: request.ip, userAgent: request.headers?.['user-agent'],
        });
      }),
    );
  }
}
