export { AuthService } from './auth';
export * from './auth';
export { default as JobsService } from './jobs';
export * from './jobs';
export { default as SubscriptionsService } from './subscriptions';
export * from './subscriptions';
export * from './asaas';

// Export all core services from lib/api but prioritize the ones above
export {
    api,
    apiFetch,
    getApiBaseUrl,
    buildApiUrl,
    isAuthenticated,
    logout,
    DashboardService,
    NotificationService,
    FinanceService,
    CompanyService,
    PaymentService,
    ProjectService,
    RHService,
    SupportService,
    ATSService,
    DasMeiService,
    AttendanceService,
    SystemConfigService
} from '../lib/api';

import { api } from '../lib/api';
export default api;
