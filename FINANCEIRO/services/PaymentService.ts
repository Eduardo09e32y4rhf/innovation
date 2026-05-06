// FINANCEIRO/services/PaymentService.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export class PaymentService {
  /**
   * Cria uma sessão de Checkout do Stripe para assinaturas.
   */
  static async createCheckoutSession(priceId: string, customerId?: string) {
    return await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/finance/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/finance/pricing`,
      customer: customerId,
    });
  }

  /**
   * Registra o uso de IA para cobrança baseada em consumo (Metering).
   */
  static async reportUsage(subscriptionItemId: string, quantity: number = 1) {
    return await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    });
  }

  /**
   * Gera uma URL de Portal do Cliente para gerenciar cartões e faturas.
   */
  static async createPortalSession(customerId: string) {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/finance/billing`,
    });
  }
}
