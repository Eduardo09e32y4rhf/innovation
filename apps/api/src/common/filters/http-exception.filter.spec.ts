import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { mapException } from './http-exception.filter';

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

  it('banco inacessivel vira 503 (nao 500) para o cliente tentar de novo', () => {
    for (const code of ['P1001', 'P1002', 'P1008', 'P1017', 'P2024']) {
      expect(mapException({ name: 'PrismaClientKnownRequestError', code })).toMatchObject({ status: 503, body: { code: 'DB_UNAVAILABLE' } });
    }
    expect(mapException({ name: 'PrismaClientInitializationError', message: "Can't reach database server" })).toMatchObject({ status: 503 });
  });

  it('queda real do Postgres chega como UnknownRequestError so com texto: 503; bug de aplicacao continua 500', () => {
    for (const message of [
      'Error in connector: Error querying the database: FATAL: database "x" is not currently accepting connections',
      'FATAL: terminating connection due to administrator command',
      'FATAL: the database system is starting up',
      'FATAL: sorry, too many clients already / remaining connection slots are reserved',
    ]) {
      expect(mapException({ name: 'PrismaClientUnknownRequestError', message })).toMatchObject({ status: 503, body: { code: 'DB_UNAVAILABLE' } });
    }
    expect(mapException({ name: 'PrismaClientUnknownRequestError', message: 'column "x" does not exist' }).status).toBe(500);
    expect(mapException(new Error('terminating connection')).status).toBe(500);
  });
});
