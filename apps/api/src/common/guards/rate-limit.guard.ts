import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  /** Window in seconds */
  window: number;
  /** Max requests in window */
  max: number;
  /** Key prefix */
  prefix?: string;
}

/**
 * Decorator to set rate limit on a route or controller.
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const key = this.buildKey(request, options);

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, options.window);
    }

    if (current > options.max) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Muitas tentativas. Tente novamente em 1 minuto.',
          error: 'Too Many Requests',
          retryAfter: options.window,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private buildKey(request: any, options: RateLimitOptions): string {
    const prefix = options.prefix || 'ratelimit';
    const userId = request.user?.sub || this.extractLoginIdentity(request) || 'anon';
    const route = request.route?.path || 'unknown';
    const ip = this.extractRequestIp(request);
    return `ratelimit:${prefix}:${userId}:${route}:${ip}`;
  }

  private extractLoginIdentity(request: any): string | null {
    const body = request.body ?? {};
    const email = String(body.email ?? body.username ?? '').trim().toLowerCase();
    if (email) return `email:${email}`;

    const document = String(body.document ?? body.cpf ?? '').replace(/\D/g, '');
    if (document) return `document:${document}`;

    return null;
  }

  private extractRequestIp(request: any): string {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const realIp = request.headers?.['x-real-ip'];
    const cfIp = request.headers?.['cf-connecting-ip'];
    return (
      cfIp ||
      realIp ||
      (Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor?.split(',')[0]?.trim()) ||
      request.ip ||
      request.connection?.remoteAddress ||
      'unknown'
    );
  }
}
