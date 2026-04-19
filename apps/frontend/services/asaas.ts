import axios from 'axios';

const ASAAS_API_URL = process.env.NEXT_PUBLIC_ASAAS_API_URL || 'https://api.asaas.com/v3';
const ASAAS_TOKEN = process.env.NEXT_PUBLIC_ASAAS_TOKEN;

const api = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'access_token': ASAAS_TOKEN,
    'Content-Type': 'application/json',
  },
});

export interface Customer {
  id: string;
  name: string;
  email: string;
}

export interface Subscription {
  id: string;
  customer: string;
  status: string;
  value: number;
  dueDate: string;
}

export class AsaasService {
  async createCustomer(data: { name: string; email: string; cpfCnpj: string }) {
    const response = await api.post('/customers', data);
    return response.data;
  }

  async getCustomer(id: string) {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  }

  async createSubscription(data: {
    customer: string;
    billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX';
    value: number;
    dueDate: string;
    description?: string;
  }) {
    const response = await api.post('/subscriptions', data);
    return response.data;
  }

  async getSubscription(id: string) {
    const response = await api.get(`/subscriptions/${id}`);
    return response.data;
  }

  async listSubscriptions(customerId?: string) {
    const params = customerId ? { customer: customerId } : {};
    const response = await api.get('/subscriptions', { params });
    return response.data;
  }
}

export const asaasService = new AsaasService();

export default asaasService;

