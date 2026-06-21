import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async summary(companyId: string, actor: JwtUser) {
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV') {
      return this.repository.summary(companyId);
    }
    if (actor.role === 'GESTOR') {
      return this.repository.summaryForManager(companyId, actor.sub);
    }
    return this.repository.summaryForEmployee(companyId, actor.sub);
  }
}
