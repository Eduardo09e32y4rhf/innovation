import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull';
import type { Queue } from 'bull';
import { MailService } from './modules/mail/mail.service';
import { EmailWorkerModule } from './modules/queue/email-worker.module';

async function bootstrap() {
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) throw new Error('Configure Redis para iniciar o worker de e-mail.');
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_PASSWORD && !/^rediss?:\/\/[^@/]*:[^@]+@/.test(process.env.REDIS_URL ?? '')) {
    throw new Error('O Redis do worker exige autenticação em produção.');
  }
  if (!new MailService().isConfigured()) throw new Error('Configure um provedor de e-mail antes de iniciar o worker.');
  const app = await NestFactory.createApplicationContext(EmailWorkerModule);
  app.enableShutdownHooks();
  await app.get<Queue>(getQueueToken('email-send')).isReady();
}

bootstrap().catch(() => {
  // No credentials, payloads or recipient addresses in bootstrap diagnostics.
  console.error('Não foi possível iniciar o worker de e-mail. Confira Redis e o provedor configurado.');
  process.exit(1);
});
