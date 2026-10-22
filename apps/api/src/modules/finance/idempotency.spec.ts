import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { markReplay, requireIdempotencyKey } from './idempotency';

const KEY = '3f2b8c1e-9d4a-4e7b-8a10-5c6d7e8f9a0b';

describe('requireIdempotencyKey', () => {
  it('rejeita chamada HTTP sem chave (400)', () => {
    expect(() => requireIdempotencyKey(undefined)).toThrow(BadRequestException);
    expect(() => requireIdempotencyKey('   ', undefined)).toThrow(BadRequestException);
  });

  it('rejeita chave curta ou com caracteres inválidos', () => {
    expect(() => requireIdempotencyKey('abc')).toThrow(BadRequestException);
    expect(() => requireIdempotencyKey('x'.repeat(129))).toThrow(BadRequestException);
    expect(() => requireIdempotencyKey(`${KEY} ; drop`)).toThrow(BadRequestException);
  });

  it('aceita o cabeçalho e ele vale mais que a chave do corpo', () => {
    expect(requireIdempotencyKey(KEY, 'corpo-corpo-corpo-corpo')).toBe(KEY);
    expect(requireIdempotencyKey([KEY, 'outra-chave-qualquer-aqui'])).toBe(KEY);
  });

  it('cai para a chave do corpo quando não há cabeçalho', () => {
    expect(requireIdempotencyKey(undefined, KEY)).toBe(KEY);
  });
});

describe('markReplay', () => {
  it('repetição responde 200 (fastify code / express status)', () => {
    const fastify = { code: vi.fn() };
    markReplay(fastify, true);
    expect(fastify.code).toHaveBeenCalledWith(200);
    const express = { status: vi.fn() };
    markReplay(express, true);
    expect(express.status).toHaveBeenCalledWith(200);
  });

  it('primeira criação mantém o status padrão', () => {
    const reply = { code: vi.fn() };
    markReplay(reply, false);
    expect(reply.code).not.toHaveBeenCalled();
  });
});
