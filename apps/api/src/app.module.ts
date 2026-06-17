import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { appConfig } from './config/app.config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { TimeTrackModule } from './modules/time-track/time-track.module';
import { VacationsModule } from './modules/vacations/vacations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'], load: [appConfig], validate: validateEnv }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    CommunicationModule,
    DashboardModule,
    PrivacyModule,
    EmployeesModule,
    TimeTrackModule,
    VacationsModule,
  ],
})
export class AppModule {}
