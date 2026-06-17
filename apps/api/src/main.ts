import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  await app.listen(process.env.API_PORT || process.env.PORT || 3333);
  console.log(`API listening on ${await app.getUrl()}`);
}
bootstrap();
