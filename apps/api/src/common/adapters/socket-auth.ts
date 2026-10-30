import { JwtService } from '@nestjs/jwt';
import { assertAccessToken } from '../guards/access-token';

export interface SocketUser { sub: string; companyId: string; role?: string }

/** Token do handshake: `auth.token` (socket.io-client) ou `Authorization: Bearer`. Nunca da query (vaza em log de proxy). */
export function handshakeToken(handshake: any): string | undefined {
  const fromAuth = handshake?.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth) return fromAuth.startsWith('Bearer ') ? fromAuth.slice(7) : fromAuth;
  const header = handshake?.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}

/**
 * Middleware do socket.io: exige JWT de ACESSO valido no handshake e grava a identidade verificada em `socket.data.user`.
 * O companyId vem do token, nunca do cliente (query/auth), entao nao da para entrar na sala de outra empresa.
 */
export function socketAuthMiddleware(jwt: Pick<JwtService, 'verifyAsync'> = new JwtService(), secret: () => string | undefined = () => process.env.JWT_SECRET) {
  return async (socket: any, next: (err?: Error) => void) => {
    const fail = () => { const err: any = new Error('Não autorizado'); err.data = { code: 'UNAUTHORIZED' }; return next(err); };
    try {
      const token = handshakeToken(socket.handshake);
      const key = secret();
      if (!token || !key) return fail();
      const payload: any = await jwt.verifyAsync(token, { secret: key });
      assertAccessToken(payload);
      if (typeof payload.companyId !== 'string' || !payload.companyId) return fail();
      socket.data.user = { sub: payload.sub, companyId: payload.companyId, role: payload.role } satisfies SocketUser;
      return next();
    } catch {
      return fail();
    }
  };
}
