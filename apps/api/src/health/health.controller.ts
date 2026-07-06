import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    const checks: Record<string, any> = {
      service: 'innovation-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    };

    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok' };
      dbOk = true;
    } catch {
      checks.database = { status: 'error', message: 'Database connection failed' };
    }

    let redisOk = false;
    try {
      redisOk = this.redis.getStatus(); // true only when connected
      checks.redis = { status: redisOk ? 'ok' : 'unavailable' };
    } catch {
      checks.redis = { status: 'error', message: 'Redis check failed' };
    }

    const isHealthy = dbOk && redisOk;

    // Return 503 so load balancers and monitoring systems detect degraded state
    if (!isHealthy) {
      // We cannot use @Res() here without breaking Fastify interceptors, so we throw
      // a manual HttpException to force 503
      const { HttpException } = await import('@nestjs/common');
      throw new HttpException(
        { status: 'error', ...checks },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { status: 'ok', ...checks };
  }
}