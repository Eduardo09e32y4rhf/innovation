import Stripe from 'stripe';

// ✅ Exporta uma instância lazy-safe do Stripe
// A chave pode ficar vazia no build — só é chamada em runtime (dentro de funções)
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder',
  {
    // @ts-ignore
    apiVersion: null,
    appInfo: {
      name: 'Innovation.ia SaaS',
      version: '2.0.0',
      url: 'https://innovation.ia'
    }
  }
);
