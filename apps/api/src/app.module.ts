import { PerformanceModule } from './modules/performance/performance.module';
import { Module } from '@nestjs/common';
import { PartnersModule } from './modules/partners/partners.module';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LookupModule } from './modules/lookup/lookup.module';
import { WelcomeModule } from './modules/welcome/welcome.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
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
import { QueueModule } from './modules/queue/queue.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { CryptoModule } from './common/crypto/crypto.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EscalaModule } from './modules/schedule/escala.module';
import { ScheduleHubModule } from './modules/schedule-hub/schedule-hub.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PlatformHubModule } from './modules/platform-hub/platform-hub.module';
import { redisConnection } from './common/redis/redis-config';
import { MailModule } from './modules/mail/mail.module';
import { PlatformAuditModule } from './modules/platform-audit/platform-audit.module';
import { TenantGuard } from './common/guards/tenant.guard';
import { SubscriptionActiveGuard } from './common/guards/subscription.guard';
import { MfaEnrollmentGuard } from './common/guards/mfa-enrollment.guard';
import { ManualContractsModule } from './modules/manual-contracts/manual-contracts.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { DocumentsModule } from './modules/documents/documents.module';

import { PrometheusModule } from '@willsoto/nestjs-prometheus';

import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';

import { SupportModule } from './modules/support/support.module';
import { AiModule } from './modules/ai/ai.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { CommercialSalesModule } from './modules/commercial-sales/commercial-sales.module';
import { CeoOnboardingModule } from './modules/ceo-onboarding/ceo-onboarding.module';

@Module({
  imports: [
    PerformanceModule,
    PartnersModule,
    PrometheusModule.register(),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({ ...redisConnection(), ttl: 60000, // 60 seconds default
        }),
      }),
    }),
    QueueModule,
    HolidaysModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [appConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    RedisModule,
    DatabaseModule,
    HealthModule,
    AuthModule,   // @Global() Ò¢â�a¬â�� JwtService disponivel em todos os modulos
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
    ProposalsModule,
    NotificationsModule,
    CryptoModule,
    FinanceModule,
    EscalaModule,
    ScheduleHubModule,
    AccountingModule,
    PlatformHubModule,
    PlatformAuditModule,
    MailModule,
    ManualContractsModule,
    CouponsModule,
    SupportModule,
    AiModule,
    JobsModule,
    DocumentsModule,
    OnboardingModule,
    CommercialSalesModule,
    CeoOnboardingModule,
    PayrollModule,
    LookupModule,
    WelcomeModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_GUARD, useClass: MfaEnrollmentGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: SubscriptionActiveGuard },
  ],
})
export class AppModule {}
