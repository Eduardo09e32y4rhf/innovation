import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import type { JwtUser } from '../../common/types/auth.types';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async insights(companyId: string, actor: JwtUser) {
    const cacheKey = `dashboard:insights:${companyId}:${actor.role}:${actor.sub}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    let result;
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') {
      result = await this.repository.insights(companyId);
    } else if (actor.role === 'GESTOR') {
      result = await this.repository.insightsForManager(companyId, actor.sub);
    } else {
      result = await this.repository.insightsForEmployee(companyId, actor.sub);
    }

    await this.cacheManager.set(cacheKey, result, 60000); // 60s cache
    return result;
  }

  async summary(companyId: string, actor: JwtUser) {
    const cacheKey = `dashboard:summary:${companyId}:${actor.role}:${actor.sub}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    let result;
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') {
      result = await this.repository.summary(companyId);
    } else if (actor.role === 'GESTOR') {
      result = await this.repository.summaryForManager(companyId, actor.sub);
    } else {
      result = await this.repository.summaryForEmployee(companyId, actor.sub);
    }

    await this.cacheManager.set(cacheKey, result, 60000); // 60s cache
    return result;
  }
}
