import { toSafeMoney } from '../utils/money';

export const mockPlans = [
  { id: 'starter', code: 'starter', name: 'Starter', price: toSafeMoney(99), features: ['500 chamadas IA/mês', '1 usuário', 'Suporte por email'], active: true },
  { id: 'professional', code: 'professional', name: 'Professional', price: toSafeMoney(149), features: ['1000 chamadas IA/mês', '5 usuários', 'WhatsApp Bot'], active: true },
  { id: 'enterprise', code: 'enterprise', name: 'Enterprise', price: toSafeMoney(499), features: ['Ilimitado', 'Usuários ilimitados', 'SLA garantido'], active: true },
];
