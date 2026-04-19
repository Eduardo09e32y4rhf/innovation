import { api } from './api';
import { AuthService } from './auth';

export interface Plan {
  id: string;
  name: string;
  price: number;
  cycle: 'monthly' | 'yearly';
  features: string[];
  maxUsers: number;
  stripeId?: string;
  asaasId?: string;
}

export interface SubscriptionStatus {
  active: boolean;
  plan: Plan | null;
  endsAt: string | null;
  daysLeft?: number;
  overdue?: boolean;
}

export class SubscriptionsService {
  static async getPlans(): Promise<Plan[]> {
    const response = await api.get('/api/subscriptions/plans');
    return response.data as Plan[];
  }

  static async getStatus(): Promise<SubscriptionStatus> {
    const response = await api.get('/api/subscriptions/status');
    return response.data as SubscriptionStatus;
  }

  static async createCheckout(planId: string, cycle: 'monthly' | 'yearly'): Promise<string> {
    const response = await api.post('/api/subscriptions/checkout', { planId, cycle });
    return response.data.checkoutUrl;
  }

  static async upgradePlan(planId: string): Promise<void> {
    await api.post('/api/subscriptions/upgrade', { planId });
  }

  static async checkSubscription(): Promise<boolean> {
    if (!AuthService.isAuthenticated()) return false;
    const status = await this.getStatus();
    return status.active && !status.overdue;
  }
}

export default SubscriptionsService;

