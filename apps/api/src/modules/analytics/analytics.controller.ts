import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { RecordVisitDto } from './dto/record-visit.dto';

/** Publica: a landing page avisa que foi aberta. Sempre responde igual (nao revela se contou ou ignorou). */
@Controller('public/visits')
export class PublicVisitsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post()
  @HttpCode(202)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async record(@Body() dto: RecordVisitDto, @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    const agent = request.headers['user-agent'];
    await this.analytics.record({ ip: request.ip, userAgent: Array.isArray(agent) ? agent[0] : agent, path: dto.path, referrer: dto.referrer });
    return { ok: true };
  }
}

/** Somente DEV. */
@Controller('platform/visits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV')
export class PlatformVisitsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary(@Query('days') days?: string) {
    return this.analytics.summary(Number(days));
  }

  @Get('recent')
  recent(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.analytics.recent(Number(page), Number(limit));
  }
}
