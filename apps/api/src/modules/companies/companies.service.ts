import { Injectable } from '@nestjs/common';
import { emptyToNull, normalizeDisplayName } from '../../common/utils/text-normalization';
import { CompaniesRepository } from './companies.repository';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly repository: CompaniesRepository) {}

  me(companyId: string) {
    return this.repository.findMe(companyId);
  }

  updateMe(companyId: string, dto: UpdateCompanyDto) {
    const data = {
      ...dto,
      ...(dto.name !== undefined ? { name: normalizeDisplayName(dto.name) } : {}),
      ...(dto.document !== undefined ? { document: emptyToNull(dto.document) } : {}),
      logoUrl: dto.logoUrl === null ? null : dto.logoUrl?.trim(),
    };
    return this.repository.updateMe(companyId, data as any);
  }
}
