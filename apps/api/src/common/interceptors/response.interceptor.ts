import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { responseMeta } from '../request-id';

/**
 * Envelope de sucesso. `success` e `data` são o contrato legado consumido pelo front;
 * `meta` é aditivo (requestId + timestamp) e não quebra clientes existentes.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(map((data) => ({ success: true, data, meta: responseMeta(request) })));
  }
}
