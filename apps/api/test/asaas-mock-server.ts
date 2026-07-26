import * as express from 'express';
import { randomUUID } from 'crypto';

/**
 * Mock Server do Asaas para testes (Fase 6)
 * Simula a API do Asaas e permite acionar webhooks para testar a conciliação do sistema.
 */

const app = express();
app.use(express.json());

const customers = new Map<string, any>();
const subscriptions = new Map<string, any>();
const payments = new Map<string, any>();

// Autenticação mock
app.use((req, res, next) => {
  const token = req.headers['access_token'];
  if (!token || token !== process.env.ASAAS_API_KEY) {
    if (process.env.NODE_ENV !== 'test') {
      return res.status(401).json({ errors: [{ code: 'invalid_token', description: 'Token inválido' }] });
    }
  }
  next();
});

// Criar Customer
app.post('/api/v3/customers', (req, res) => {
  const customer = {
    object: 'customer',
    id: `cus_${randomUUID().substring(0, 12)}`,
    dateCreated: new Date().toISOString(),
    name: req.body.name,
    email: req.body.email,
    cpfCnpj: req.body.cpfCnpj,
  };
  customers.set(customer.id, customer);
  res.json(customer);
});

// Criar Assinatura
app.post('/api/v3/subscriptions', (req, res) => {
  const sub = {
    object: 'subscription',
    id: `sub_${randomUUID().substring(0, 12)}`,
    dateCreated: new Date().toISOString(),
    customer: req.body.customer,
    value: req.body.value,
    nextDueDate: req.body.nextDueDate,
    cycle: req.body.cycle,
    status: 'ACTIVE',
  };
  subscriptions.set(sub.id, sub);
  res.json(sub);
});

// Criar Cobrança Avulsa
app.post('/api/v3/payments', (req, res) => {
  const pay = {
    object: 'payment',
    id: `pay_${randomUUID().substring(0, 12)}`,
    dateCreated: new Date().toISOString(),
    customer: req.body.customer,
    value: req.body.value,
    dueDate: req.body.dueDate,
    status: 'PENDING',
    invoiceUrl: `https://sandbox.asaas.com/i/${randomUUID().substring(0, 8)}`,
  };
  payments.set(pay.id, pay);
  res.json(pay);
});

// Endpoint de controle para testes (Injetar eventos de webhook)
app.post('/mock/trigger-webhook', async (req, res) => {
  const { event, paymentId, targetUrl, token } = req.body;
  const payment = payments.get(paymentId) || { id: paymentId, customer: 'cus_test', value: 99.9, status: 'RECEIVED' };
  
  if (event === 'PAYMENT_RECEIVED') payment.status = 'RECEIVED';
  if (event === 'PAYMENT_OVERDUE') payment.status = 'OVERDUE';

  const payload = {
    event,
    payment,
  };

  try {
    const fetch = require('node-fetch');
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-access-token': token,
      },
      body: JSON.stringify(payload)
    });
    res.json({ success: true, status: response.status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Iniciar servidor se rodado diretamente
if (require.main === module) {
  const port = process.env.ASAAS_MOCK_PORT || 4000;
  app.listen(port, () => {
    console.log(`Mock Asaas rodando na porta ${port}`);
  });
}

export default app;
