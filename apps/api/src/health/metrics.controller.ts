import { Controller, Get, Headers, NotFoundException, Res } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  // Exige "Authorization: Bearer $METRICS_TOKEN". Sem METRICS_TOKEN configurado o endpoint nao existe.
  @Get()
  async metrics(@Headers('authorization') auth: string | undefined, @Res({ passthrough: true }) res: any) {
    const token = process.env.METRICS_TOKEN;
    const given = (auth ?? '').replace(/^Bearer\s+/i, '');
    const ok = !!token && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token));
    if (!ok) throw new NotFoundException();
    res.header('Content-Type', register.contentType);
    return register.metrics();
  }
}