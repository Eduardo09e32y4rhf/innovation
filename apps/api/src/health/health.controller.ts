import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, any> = {
      service: 'innovation-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok' };
    } catch {
      checks.database = { status: 'error', message: 'Database connection failed' };
    }

    try {
      const redisOk = this.redis.getStatus();
      checks.redis = { status: redisOk ? 'ok' : 'unavailable' };
    } catch {
      checks.redis = { status: 'error', message: 'Redis check failed' };
    }

    const isHealthy = checks.database?.status === 'ok';
    return { status: isHealthy ? 'ok' : 'error', ...checks };
  }
}