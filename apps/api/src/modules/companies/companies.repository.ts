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

  async updateHolidays(companyId: string, holidays: { name: string; date: string; scope?: 'NATIONAL' | 'STATE' | 'MUNICIPAL' }[]) {
    await this.prisma.$transaction([
      this.prisma.holiday.deleteMany({ where: { companyId } }),
      this.prisma.holiday.createMany({
        data: holidays.map((h) => ({
          companyId,
          name: h.name.trim(),
          date: new Date(h.date),
          scope: h.scope ?? 'NATIONAL',
        })),
      }),
    ]);
    return this.getHolidays(companyId);
  }
}
