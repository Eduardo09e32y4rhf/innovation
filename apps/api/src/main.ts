import 'reflect-metadata';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NoCacheInterceptor } from './common/interceptors/no-cache.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
const LokiTransport = require('winston-loki');

async function bootstrap() {
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, trace }) => {
            return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
          }),
        ),
      }),
      new LokiTransport({
        host: process.env.LOKI_HOST || 'http://localhost:3100',
        labels: { app: 'innovation-api', env: process.env.NODE_ENV || 'development' },
        json: true,
        format: winston.format.json(),
        replaceTimestamp: true,
        onConnectionError: (err: any) => console.error(err),
      }),
    ],
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 10_485_760 }), // 10MB limit for base64 images
  );
  app.useLogger(logger);

  const reflector = app.get(Reflector);
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  await app.register(fastifyHelmet, {
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameSrc: ["'none'"],
            },
          }
        : false,
  });
  await app.register(fastifyCookie);

  app.enableCors({
    origin: allowedOrigins.length
      ? allowedOrigins
      : process.env.NODE_ENV !== 'production',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new NoCacheInterceptor(),
    new ClassSerializerInterceptor(reflector),
    new ResponseInterceptor(),
  );

  app.enableShutdownHooks();

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = Number(process.env.PORT ?? 3333);
  const host = process.env.HOST ?? '0.0.0.0';

  const config = new DocumentBuilder()
    .setTitle('Innovation RH Connect API')
    .setDescription('API documentation for Innovation RH Connect (Time tracking, Payroll, Privacy, etc).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen({ port, host });

  console.log(
    `[Bootstrap] API running on port ${port} | ENV: ${process.env.NODE_ENV || 'development'}`,
  );
  console.log(
    `[Bootstrap] Allowed origins: ${allowedOrigins.length
      ? allowedOrigins.join(', ')
      : process.env.NODE_ENV !== 'production'
        ? 'all (development)'
        : 'none configured'}`,
  );
}

void bootstrap();


