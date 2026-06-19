import { Injectable } from '@nestjs/common';
import { CompaniesRepository } from './companies.repository';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly repository: CompaniesRepository) {}

  me(companyId: string) {
    return this.repository.findMe(companyId);
  }

  updateMe(companyId: string, dto: UpdateCompanyDto) {
    return this.repository.updateMe(companyId, {
      ...dto,
      logoUrl: dto.logoUrl === null ? null : dto.logoUrl?.trim(),
    });
  }
}