import { UnauthorizedException } from '@nestjs/common';

/** Tokens de recuperação, confirmação e MFA nunca autorizam acesso à API. */
export function assertAccessToken(payload: { purpose?: unknown; sub?: unknown }): void {
  if (payload?.purpose !== 'access' || typeof payload.sub !== 'string' || !payload.sub) {
    throw new UnauthorizedException('Token de acesso inválido');
  }
}
