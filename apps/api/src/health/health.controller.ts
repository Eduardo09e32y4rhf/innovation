import { Controller, Get, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../common/redis/redis.service';

const DB_CHECK_TIMEOUT_MS = 2000;

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness: o processo responde. Nao toca em banco nem Redis, para o orquestrador nao reiniciar a API por queda de dependencia. */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok', uptime: process.uptime() };
  }

  /** Readiness: so o banco e obrigatorio. 503 tira a instancia do balanceador sem reinicia-la. */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready() {
    const db = await this.checkDatabase();
    const body = { status: db ? 'ok' : 'error', database: { status: db ? 'ok' : 'error' }, redis: { status: this.redis.getStatus() ? 'ok' : 'degraded (optional)' } };
    if (!db) throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    const checks: Record<string, any> = {
      service: 'innovation-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    };

    const dbOk = await this.checkDatabase();
    checks.database = dbOk ? { status: 'ok' } : { status: 'error', message: 'Database connection failed' };
    checks.redis = { status: this.redis.getStatus() ? 'ok' : 'degraded (optional)' };

    // Only the database is required for the API to function
    if (!dbOk) throw new HttpException({ status: 'error', ...checks }, HttpStatus.SERVICE_UNAVAILABLE);
    return { status: 'ok', ...checks };
  }

  /** SELECT 1 com prazo: um banco pendurado nao pode pendurar o health check junto. */
  private async checkDatabase(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('db timeout')), DB_CHECK_TIMEOUT_MS); }),
      ]);
      return true;
    } catch {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
