import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { defaultErrorCode, HttpExceptionFilter, isRetryable, mapException } from './http-exception.filter';

function run(exception: unknown, requestId = 'req-abcdef12') {
  const sent: any[] = [];
  const reply: any = { status: (s: number) => ({ send: (b: any) => sent.push({ s, b }) }) };
  const host: any = { switchToHttp: () => ({ getResponse: () => reply, getRequest: () => ({ id: requestId, method: 'GET', url: '/x' }) }) };
  new HttpExceptionFilter().catch(exception, host);
  return sent[0];
}

describe('HttpExceptionFilter envelope', () => {
  it('erro 4xx mantém contrato legado e acrescenta code, retryable e meta', () => {
    const { s, b } = run(new NotFoundException('Empresa nao encontrada.'));
    expect(s).toBe(404);
    expect(b).toMatchObject({ success: false, statusCode: 404, error: { message: 'Empresa nao encontrada.', code: 'NOT_FOUND', retryable: false }, meta: { requestId: 'req-abcdef12' } });
  });

  it('erro 500 usa o requestId da requisição e nunca vaza detalhe interno', () => {
    const { s, b } = run(new Error('segredo interno'));
    expect(s).toBe(500);
    expect(b.meta.requestId).toBe('req-abcdef12');
    expect(b.error.requestId).toBe('req-abcdef12');
    expect(JSON.stringify(b)).not.toContain('segredo interno');
  });

  it('classifica códigos e retry', () => {
    expect(defaultErrorCode(504)).toBe('UPSTREAM_TIMEOUT');
    expect(isRetryable(503)).toBe(true);
    expect(isRetryable(422)).toBe(false);
  });
});

describe('mapException', () => {
  it('preserva exceções HTTP e mensagens de validação', () => {
    expect(mapException(new NotFoundException('Empresa nao encontrada.'))).toMatchObject({ status: 404, body: { message: 'Empresa nao encontrada.' } });
    const validation = mapException(new BadRequestException({ message: ['name must be a string'], error: 'Bad Request' }));
    expect(validation.status).toBe(400);
    expect(validation.body.message).toEqual(['name must be a string']);
  });

  it('traduz erros do Prisma em 409/404/400 em vez de 500', () => {
    expect(mapException({ name: 'PrismaClientKnownRequestError', code: 'P2002', meta: { target: ['document'] } })).toMatchObject({ status: 409, body: { code: 'DUPLICATE' } });
    expect(mapException({ code: 'P2025' }).status).toBe(404);
    expect(mapException({ code: 'P2003' }).status).toBe(409);
    expect(mapException({ code: 'P2023' }).status).toBe(400);
    expect(mapException({ name: 'PrismaClientValidationError', message: 'x' }).status).toBe(400);
  });

  it('erros do Fastify 4xx mantêm o status; o resto vira 500 genérico', () => {
    expect(mapException({ statusCode: 413, code: 'FST_ERR_CTP_BODY_TOO_LARGE' })).toMatchObject({ status: 413 });
    expect(mapException(new Error('boom'))).toMatchObject({ status: 500, log: true });
  });
});
