export { default as AuthService } from './auth';
export * from './auth';
// Keep other API exports for backend calls
export * from '../lib/api';
import { api } from '../lib/api';
export default api;
