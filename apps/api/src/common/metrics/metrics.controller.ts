import { Controller, Get, Headers, Res, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { register } from 'prom-client';
import type { FastifyReply } from 'fastify';

@Controller()
export class MetricsController extends PrometheusController {
  @Get()
  async index(@Res({ passthrough: true }) response: FastifyReply, @Headers('authorization') auth?: string): Promise<string> {
    const expected = process.env.METRICS_TOKEN;
    if (expected || process.env.NODE_ENV === 'production') {
      const given = Buffer.from(auth ?? '');
      const want = Buffer.from(`Bearer ${expected ?? ''}`);
      if (!expected || given.length !== want.length || !timingSafeEqual(given, want)) {
        throw new UnauthorizedException();
      }
    }
    response.header('Content-Type', register.contentType);
    return register.metrics();
  }
}
