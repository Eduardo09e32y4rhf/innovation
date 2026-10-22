import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { map, Observable } from 'rxjs';

/**
 * Converte a resposta em JSON puro antes do ClassSerializerInterceptor global.
 * Sem isso, o Prisma.Decimal (valores em R$) vira o objeto interno { s, e, d } e o front mostra "R$ NaN".
 * Decimal sai como number (igual ao ResponseInterceptor), nunca como string.
 * Respostas em stream (PDF) e vazias passam direto.
 */
export function toPlainJson<T>(data: T): unknown {
  return JSON.parse(
    JSON.stringify(data, function (this: Record<string, unknown>, key: string, value: unknown) {
      const raw = this[key];
      return Prisma.Decimal.isDecimal(raw) ? (raw as Prisma.Decimal).toNumber() : value;
    }),
  );
}

@Injectable()
export class PlainJsonInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data === undefined || data === null || typeof data !== 'object') return data;
        if (Buffer.isBuffer(data) || typeof (data as { pipe?: unknown }).pipe === 'function' || typeof (data as { getStream?: unknown }).getStream === 'function') return data;
        return toPlainJson(data);
      }),
    );
  }
}
