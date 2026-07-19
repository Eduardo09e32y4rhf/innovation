import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { $Enums } from '@prisma/client';
const HolidayScope = $Enums.HolidayScope;
type HolidayScope = $Enums.HolidayScope;

@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async syncNationalHolidays(year: number) {
    const cacheKey = `holidays:national:${year}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.log(`[HolidaysService] Holidays for ${year} found in cache`);
      return JSON.parse(cached);
    }

    try {
      this.logger.log(`[HolidaysService] Fetching national holidays for ${year} from BrasilAPI...`);
      const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
      if (!res.ok) throw new Error('API Error');
      const data = (await res.json()) as any[];
      
      // A better approach is to find existing global national holidays for that year, delete them, and recreate.
      await this.prisma.$transaction(async (tx) => {
        const startDate = new Date(`${year}-01-01T00:00:00Z`);
        const endDate = new Date(`${year}-12-31T23:59:59Z`);
        
        await tx.holiday.deleteMany({
          where: {
            companyId: null,
            scope: HolidayScope.NATIONAL,
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        });

        await (tx as any).holiday.createMany({
          data: data.map((h: any) => ({
            date: new Date(h.date),
            name: h.name,
            scope: HolidayScope.NATIONAL,
            companyId: null,
            source: 'brasilapi',
          }))
        });
      });

      // Cache for 30 days
      await this.redis.set(cacheKey, JSON.stringify(data), 60 * 60 * 24 * 30);
      
      this.logger.log(`[HolidaysService] Successfully synced national holidays for ${year}`);
      return data;
    } catch (error: any) {
      this.logger.error(`[HolidaysService] Failed to sync national holidays for ${year}`, error.message);
      throw error;
    }
  }

  async getHolidays(companyId: string, startDate: Date, endDate: Date) {
    return this.prisma.holiday.findMany({
      where: {
        OR: [
          { companyId: null, scope: HolidayScope.NATIONAL },
          { companyId: companyId }
        ],
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });
  }

  async isWorkday(date: Date, companyId: string, employeeWorkScheduleId: string) {
    const holidays = await this.getHolidays(companyId, date, date);
    if (holidays.length > 0) {
      return false; // É feriado
    }

    const schedule = await this.prisma.workScheduleRule.findUnique({
      where: { id: employeeWorkScheduleId }
    });

    if (!schedule) return true;

    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    if (schedule.restDaysOfWeek && schedule.restDaysOfWeek.includes(dayOfWeek)) {
      return false; // É dia de descanso
    }

    return true; // É dia útil
  }
}
