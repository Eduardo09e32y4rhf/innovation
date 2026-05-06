import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { appConfig } from './config/app.config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig], validate: validateEnv }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    CommunicationModule,
    RecruitmentModule,
    FinanceModule,
    DashboardModule,
    AiModule,
  ],
})
export class AppModule {}
