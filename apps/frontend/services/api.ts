export { default as AuthService } from './auth';
export * from './auth';
export { default as JobsService } from './jobs';
export * from './jobs';
export { default as SubscriptionsService } from './subscriptions';
export * from './subscriptions';
export * from './asaas';
// Keep other API exports for backend calls
export * from '../lib/api';
import { api } from '../lib/api';
export default api;
