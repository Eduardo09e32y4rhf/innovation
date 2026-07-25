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
    
    return request(app.getHttpServer())
      .post('/finance/webhook/asaas')
      .set('asaas-access-token', process.env.ASAAS_WEBHOOK_TOKEN!)
      .send(payload)
      .expect(200)
      .expect((res) => {
        expect(res.body.received).toBe(true);
        expect(res.body.queued).toBe(true);
      });
  });

  it('/finance/webhook/asaas (POST) - Idempotency (Duplicate webhook)', async () => {
    const payload = {
      event: 'PAYMENT_RECEIVED',
      id: 'evt_idempotency_123',
      payment: {
        id: 'pay_123',
        customer: 'cus_123',
        value: 100.0,
      }
    };
    
    // First call
    await request(app.getHttpServer())
      .post('/finance/webhook/asaas')
      .set('asaas-access-token', process.env.ASAAS_WEBHOOK_TOKEN!)
      .send(payload)
      .expect(200);

    // Second call (Duplicate)
    return request(app.getHttpServer())
      .post('/finance/webhook/asaas')
      .set('asaas-access-token', process.env.ASAAS_WEBHOOK_TOKEN!)
      .send(payload)
      .expect(200)
      .expect((res) => {
        expect(res.body.received).toBe(true);
        expect(res.body.duplicate).toBe(true); // Should recognize it's a duplicate
      });
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
    
    return request(app.getHttpServer())
      .post('/finance/webhook/asaas')
      .set('asaas-access-token', process.env.ASAAS_WEBHOOK_TOKEN!)
      .send(payload)
      .expect(200)
      .expect((res) => {
        expect(res.body.received).toBe(true);
      });
  });

  it('/finance/webhook/asaas (POST) - Invalid Signature', async () => {
    const payload = { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_123' } };
    
    return request(app.getHttpServer())
      .post('/finance/webhook/asaas')
      .set('asaas-access-token', 'invalid-token')
      .send(payload)
      .expect(403);
  });
});
