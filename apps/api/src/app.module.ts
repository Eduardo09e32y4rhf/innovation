import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { appConfig } from './config/app.config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { TimeTrackModule } from './modules/time-track/time-track.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { VacationsModule } from './modules/vacations/vacations.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ManagementModule } from './modules/management/management.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { CryptoModule } from './common/crypto/crypto.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    HolidaysModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [appConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    RedisModule,
    DatabaseModule,
    HealthModule,
    AuthModule,   // @Global() — JwtService disponivel em todos os modulos
    UsersModule,
    CompaniesModule,
    CommunicationModule,
    DashboardModule,
    PrivacyModule,
    EmployeesModule,
    TimeTrackModule,
    VacationsModule,
    PlatformModule,
    ManagementModule,
    NotificationsModule,
    CryptoModule,
    FinanceModule,
    ScheduleModule.forRoot(),
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AppModule {}
