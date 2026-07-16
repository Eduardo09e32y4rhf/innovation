import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import * as crypto from 'crypto';

describe('Asaas Webhook (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Need to set env variables before initializing AppModule
    process.env.ASAAS_WEBHOOK_TOKEN = 'test-token';
    process.env.NODE_ENV = 'test';
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/finance/webhook/asaas (POST) - PAYMENT_RECEIVED', async () => {
    const payload = {
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_123',
        customer: 'cus_123',
        value: 100.0,
      }
    };
    
    const signature = crypto
      .createHmac('sha256', process.env.ASAAS_WEBHOOK_TOKEN!)
      .update(JSON.stringify(payload))
      .digest('hex');

    return request(app.getHttpServer())
      .post('/finance/webhook/asaas')
      .set('asaas-signature', signature)
      .send(payload)
      .expect(200)
      .expect({ received: true });
  });

  it('/finance/webhook/asaas (POST) - PAYMENT_OVERDUE', async () => {
    const payload = {
      event: 'PAYMENT_OVERDUE',
      payment: {
        id: 'pay_456',
        customer: 'cus_123',
        value: 100.0,
      }
    };
    
    const signature = crypto
      .createHmac('sha256', process.env.ASAAS_WEBHOOK_TOKEN!)
      .update(JSON.stringify(payload))
      .digest('hex');

    return request(app.getHttpServer())
      .post('/finance/webhook/asaas')
      .set('asaas-signature', signature)
      .send(payload)
      .expect(200)
      .expect({ received: true });
  });

  it('/finance/webhook/asaas (POST) - Invalid Signature', async () => {
    const payload = { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_123' } };
    
    return request(app.getHttpServer())
      .post('/finance/webhook/asaas')
      .set('asaas-signature', 'invalid-signature')
      .send(payload)
      .expect(403);
  });
});
