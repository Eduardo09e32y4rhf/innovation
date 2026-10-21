import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { toSaoPauloDateKey } from '../../common/utils/date.utils';
import { PrismaService } from '../../database/prisma.service';
import { GeoService } from './geo.service';
import { parseUserAgent } from './user-agent';

const DAY_MS = 86_400_000;
const COLUMNS = new Set(['country', 'region', 'city', 'device', 'browser', 'referrer', 'path']);

export interface RecordVisitInput {
  ip: string | undefined;
  userAgent: string | undefined;
  path: string;
  referrer?: string;
}

export interface TopRow {
  views: number;
  visitors: number;
  [column: string]: string | number | null;
}

export function normalizePath(raw: string): string {
  const [pathOnly] = raw.split(/[?#]/);
  const path = (pathOnly || '/').slice(0, 200);
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
}

export function referrerHost(raw: string | undefined): string | null {
  const text = (raw ?? '').trim().slice(0, 120);
  if (!text) return null;
  try {
    const host = new URL(text.includes('://') ? text : `https://${text}`).host.toLowerCase();
    return host.slice(0, 120) || null;
  } catch {
    return null;
  }
}

/** Inicio do dia (00:00) em Sao Paulo. O Brasil nao tem horario de verao desde 2019, entao o offset e fixo. */
function startOfDay(now: Date): Date {
  return new Date(`${toSaoPauloDateKey(now)}T00:00:00-03:00`);
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService, private readonly geo: GeoService) {}

  /**
   * Hash que muda todo dia: serve so para contar visitantes unicos no mesmo dia.
   * O IP nunca e gravado; esta chave e apagada em 48h (ver AnalyticsScheduler).
   */
  private visitorKey(ip: string, userAgent: string, dayKey: string): string {
    const secret = process.env.ANALYTICS_SALT || process.env.JWT_SECRET || 'dev-only-salt';
    return createHmac('sha256', secret).update(`${dayKey}|${ip}|${userAgent}`).digest('hex').slice(0, 32);
  }

  /** Nunca lanca: a landing page nao pode quebrar por causa da estatistica. */
  async record(input: RecordVisitInput): Promise<boolean> {
    try {
      const agent = parseUserAgent(input.userAgent);
      if (agent.bot) return false;

      const now = new Date();
      const path = normalizePath(input.path);
      const key = this.visitorKey(String(input.ip ?? ''), String(input.userAgent ?? ''), toSaoPauloDateKey(now));

      const duplicate = await this.prisma.siteVisit.findFirst({
        where: { visitorKey: key, path, createdAt: { gte: new Date(now.getTime() - 30_000) } },
        select: { id: true },
      });
      if (duplicate) return false;

      const seenToday = await this.prisma.siteVisit.findFirst({
        where: { visitorKey: key, createdAt: { gte: startOfDay(now) } },
        select: { id: true },
      });
      const place = await this.geo.lookup(input.ip);

      await this.prisma.siteVisit.create({
        data: {
          path,
          referrer: referrerHost(input.referrer),
          country: place.country,
          region: place.region,
          city: place.city,
          device: agent.device,
          browser: agent.browser,
          firstOfDay: !seenToday,
          visitorKey: key,
        },
      });
      return true;
    } catch (error) {
      this.logger.warn(`Visita nao registrada: ${(error as Error).message}`);
      return false;
    }
  }

  private async top(columns: string[], since: Date, limit = 10): Promise<TopRow[]> {
    const safe = columns.filter((column) => COLUMNS.has(column));
    const list = Prisma.join(safe.map((column) => Prisma.raw(`"${column}"`)));
    return this.prisma.$queryRaw<TopRow[]>(Prisma.sql`
      SELECT ${list}, count(*)::int AS views, (count(*) FILTER (WHERE "firstOfDay"))::int AS visitors
      FROM "SiteVisit"
      WHERE "createdAt" >= ${since}
      GROUP BY ${list}
      ORDER BY views DESC
      LIMIT ${limit}`);
  }

  async summary(daysInput: number) {
    const days = Math.min(Math.max(Math.trunc(daysInput) || 30, 1), 365);
    const now = new Date();
    const today = startOfDay(now);
    const since = new Date(today.getTime() - (days - 1) * DAY_MS);

    const [views, visitors, todayViews, todayVisitors, perDay, countries, regions, cities, devices, browsers, referrers, paths, geoReady] = await Promise.all([
      this.prisma.siteVisit.count({ where: { createdAt: { gte: since } } }),
      this.prisma.siteVisit.count({ where: { createdAt: { gte: since }, firstOfDay: true } }),
      this.prisma.siteVisit.count({ where: { createdAt: { gte: today } } }),
      this.prisma.siteVisit.count({ where: { createdAt: { gte: today }, firstOfDay: true } }),
      this.prisma.$queryRaw<Array<{ day: string; views: number; visitors: number }>>(Prisma.sql`
        SELECT to_char(("createdAt" AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS day,
               count(*)::int AS views, (count(*) FILTER (WHERE "firstOfDay"))::int AS visitors
        FROM "SiteVisit" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`),
      this.top(['country'], since),
      this.top(['country', 'region'], since),
      this.top(['country', 'region', 'city'], since),
      this.top(['device'], since),
      this.top(['browser'], since),
      this.top(['referrer'], since),
      this.top(['path'], since),
      this.geo.available(),
    ]);

    const byDay = new Map(perDay.map((row) => [row.day, row]));
    const series = Array.from({ length: days }, (_, index) => {
      const day = toSaoPauloDateKey(new Date(since.getTime() + index * DAY_MS));
      const row = byDay.get(day);
      return { day, views: row?.views ?? 0, visitors: row?.visitors ?? 0 };
    });

    return {
      period: { days, from: series[0].day, to: series[series.length - 1].day },
      totals: { views, visitors, today: { views: todayViews, visitors: todayVisitors }, avgViewsPerDay: Math.round((views / days) * 10) / 10 },
      byDay: series,
      countries, regions, cities, devices, browsers, referrers, paths,
      geoReady,
    };
  }

  async recent(pageInput: number, limitInput: number) {
    const limit = Math.min(Math.max(Math.trunc(limitInput) || 50, 1), 100);
    const page = Math.max(Math.trunc(pageInput) || 1, 1);
    const [total, items] = await Promise.all([
      this.prisma.siteVisit.count(),
      this.prisma.siteVisit.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, createdAt: true, path: true, referrer: true, country: true, region: true, city: true, device: true, browser: true },
      }),
    ]);
    return { page, limit, total, items };
  }

  /** Apaga a chave de visitante antiga e os registros alem da retencao (padrao 400 dias). */
  async purge(now = new Date()) {
    const retentionDays = Math.max(Number(process.env.ANALYTICS_RETENTION_DAYS) || 400, 30);
    const keys = await this.prisma.siteVisit.updateMany({
      where: { visitorKey: { not: null }, createdAt: { lt: new Date(now.getTime() - 2 * DAY_MS) } },
      data: { visitorKey: null },
    });
    const removed = await this.prisma.siteVisit.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - retentionDays * DAY_MS) } } });
    return { keysCleared: keys.count, removed: removed.count };
  }
}
