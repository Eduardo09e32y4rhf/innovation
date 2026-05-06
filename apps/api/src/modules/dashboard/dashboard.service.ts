import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  summary(companyId: string) {
    return this.repository.summary(companyId);
  }
}
