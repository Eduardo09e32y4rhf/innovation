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

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );
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


