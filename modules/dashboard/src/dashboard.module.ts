import { DashboardDomainService } from './dashboard.service';

export function createDashboardModule() {
  return {
    name: 'dashboard',
    service: new DashboardDomainService(),
  };
}
