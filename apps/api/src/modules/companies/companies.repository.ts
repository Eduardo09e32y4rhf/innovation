import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  updateMe(companyId: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({ where: { id: companyId }, data: dto });
  }

  getHolidays(companyId: string) {
    return this.prisma.holiday.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
    });
  }

  async updateHolidays(companyId: string, holidays: any[]) {
    await this.prisma.holiday.deleteMany({ where: { companyId } });
    if (holidays.length > 0) {
      await this.prisma.holiday.createMany({
        data: holidays.map((h: any) => ({
          companyId,
          name: h.name,
          date: new Date(h.date),
          type: h.type || 'NACIONAL',
        })),
      });
    }
    return this.getHolidays(companyId);
  }
}
