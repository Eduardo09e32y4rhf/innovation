import { Injectable } from '@nestjs/common';
import { emptyToNull, normalizeDisplayName } from '../../common/utils/text-normalization';
import { CompaniesRepository } from './companies.repository';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { GeocodingService } from './geocoding.service';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly repository: CompaniesRepository,
    private readonly geocodingService: GeocodingService
  ) {}

  me(companyId: string) {
    return this.repository.findMe(companyId);
  }

  async updateMe(companyId: string, dto: UpdateCompanyDto) {
    const data: any = {
      ...dto,
      ...(dto.name !== undefined ? { name: normalizeDisplayName(dto.name) } : {}),
      ...(dto.document !== undefined ? { document: emptyToNull(dto.document) } : {}),
      logoUrl: dto.logoUrl === null ? null : dto.logoUrl?.trim(),
    };

    if (dto.street || dto.streetNumber || dto.neighborhood || dto.city || dto.state || dto.zipCode) {
      const fullAddress = [
        dto.street,
        dto.streetNumber,
        dto.neighborhood,
        dto.city,
        dto.state,
        dto.zipCode,
        'Brasil'
      ].filter(Boolean).join(', ');

      data.address = fullAddress;
      const coords = await this.geocodingService.findCoordinates(fullAddress);
      
      if (coords) {
        data.latitude = coords.latitude;
        data.longitude = coords.longitude;
      }
    }

    return this.repository.updateMe(companyId, data);
  }

  getHolidays(companyId: string) {
    return this.repository.getHolidays(companyId);
  }

  updateHolidays(companyId: string, holidays: any[]) {
    return this.repository.updateHolidays(companyId, holidays);
  }
}
