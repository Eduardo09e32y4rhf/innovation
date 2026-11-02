import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicSupportController } from '../../modules/support/public-support.controller';
import { CreatePublicSupportTicketDto } from '../../modules/support/dto/create-public-support-ticket.dto';
import { TurnstileOptionalGuard } from './turnstile.guard';

// SEG-10 (API): /support/public/* aceita o token do Turnstile SE enviado e o valida; so o exige com
// TURNSTILE_PUBLIC_SUPPORT_REQUIRED=true (o site atual ainda nao envia o token, entao o padrao NAO exige).
const ctx = (req: any) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;
const ENV = ['TURNSTILE_PUBLIC_SUPPORT_REQUIRED'];

describe('SEG-10: TurnstileOptionalGuard em support/public', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => { for (const k of ENV) { saved[k] = process.env[k]; delete process.env[k]; } });
  afterEach(() => { for (const k of ENV) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });
  const make = (enabled = true) => {
    const turnstile = { isEnabled: () => enabled, verify: vi.fn(async (token?: string) => { if (token === 'ruim') throw new BadRequestException('invalido'); }) };
    return { turnstile, guard: new TurnstileOptionalGuard(turnstile as any) };
  };

  it('com token (header ou corpo) valida; token invalido recusa', async () => {
    const { guard, turnstile } = make();
    expect(await guard.canActivate(ctx({ headers: { 'x-turnstile-token': 'bom' }, body: {}, ip: '1.1.1.1' }))).toBe(true);
    expect(turnstile.verify).toHaveBeenCalledWith('bom', '1.1.1.1');
    await guard.canActivate(ctx({ headers: {}, body: { turnstileToken: 'bom2' } }));
    expect(turnstile.verify).toHaveBeenLastCalledWith('bom2', undefined);
    await expect(guard.canActivate(ctx({ headers: { 'x-turnstile-token': 'ruim' }, body: {} }))).rejects.toBeInstanceOf(BadRequestException);
  });
  it('sem token passa (formulario atual do site nao envia) e nao chama a Cloudflare', async () => {
    const { guard, turnstile } = make();
    expect(await guard.canActivate(ctx({ headers: {}, body: { subject: 'x' } }))).toBe(true);
    expect(turnstile.verify).not.toHaveBeenCalled();
  });
  it('TURNSTILE_PUBLIC_SUPPORT_REQUIRED=true exige o token', async () => {
    process.env.TURNSTILE_PUBLIC_SUPPORT_REQUIRED = 'true';
    const { guard, turnstile } = make();
    await guard.canActivate(ctx({ headers: {}, body: {} }));
    expect(turnstile.verify).toHaveBeenCalledWith(undefined, undefined);
  });
  it('sem chave secreta (Turnstile desligado) nada e validado', async () => {
    const { guard, turnstile } = make(false);
    expect(await guard.canActivate(ctx({ headers: { 'x-turnstile-token': 'ruim' }, body: {} }))).toBe(true);
    expect(turnstile.verify).not.toHaveBeenCalled();
  });
  it('o guard esta aplicado ao controller publico de suporte e o DTO aceita turnstileToken', async () => {
    const guards = (Reflect.getMetadata('__guards__', PublicSupportController) ?? []).map((g: any) => g.name);
    expect(guards).toContain('TurnstileOptionalGuard');
    const dto = plainToInstance(CreatePublicSupportTicketDto, { name: 'A', email: 'a@b.co', subject: 's', description: 'd', turnstileToken: 'abc' });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });
});
