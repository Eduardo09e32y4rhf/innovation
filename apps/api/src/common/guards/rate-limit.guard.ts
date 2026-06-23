import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
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
export const RateLimit = (options: RateLimitOptions) =>
  Reflect.defineMetadata(RATE_LIMIT_KEY, options, Reflect.getOwnPropertyDescriptor?.bind(Reflect) as any);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true; // no rate limit configured for this route

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
          message: 'Muitas requisições. Tente novamente em instantes.',
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
    const userId = request.user?.sub || 'anon';
    const route = request.route?.path || 'unknown';
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    return `ratelimit:${prefix}:${userId}:${route}:${ip}`;
  }
}