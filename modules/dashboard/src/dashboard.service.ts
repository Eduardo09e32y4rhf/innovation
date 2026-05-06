import { buildDashboardSnapshot } from './services/dashboard.service';
import type { DashboardEnvironment, DashboardSnapshot } from './types/dashboard.types';
import type { DashboardSummaryStatus } from './dashboard.types';

export class DashboardDomainService {
  getStatus(): DashboardSummaryStatus {
    return {
      status: 'ok',
      module: 'dashboard',
      mode: 'domain-package',
    };
  }

  getSummary(environment: DashboardEnvironment = 'development'): DashboardSnapshot {
    return buildDashboardSnapshot(environment);
  }
}

export * from './services/dashboard.service';
