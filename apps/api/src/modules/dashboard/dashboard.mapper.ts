import type { DashboardSnapshot } from '../../../../../modules/dashboard/src/dashboard.types';

export function mapDashboardSummary(summary: DashboardSnapshot) {
  return {
    ...summary,
    service: 'innovation-api',
  };
}
