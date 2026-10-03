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
});
