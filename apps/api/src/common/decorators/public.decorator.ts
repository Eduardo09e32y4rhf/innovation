import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Rota publica de proposito (sem login). Hoje o JwtAuthGuard nao e global, entao rota publica e a que nao declara o guard
 * (inventario em tests/contract/controllers-guards.spec.ts). Este decorator e a marca para a migracao ao guard global
 * (https://docs.nestjs.com/security/authentication#enable-authentication-globally) e o RolesGuard o respeita.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
