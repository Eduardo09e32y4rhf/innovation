import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async insights(companyId: string, actor: JwtUser) {
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') {
      return this.repository.insights(companyId);
    }
    if (actor.role === 'GESTOR') {
      return this.repository.insightsForManager(companyId, actor.sub);
    }
    return this.repository.insightsForEmployee(companyId, actor.sub);
  }

  async summary(companyId: string, actor: JwtUser) {
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') {
      return this.repository.summary(companyId);
    }
    if (actor.role === 'GESTOR') {
      return this.repository.summaryForManager(companyId, actor.sub);
    }
    return this.repository.summaryForEmployee(companyId, actor.sub);
  }
}
