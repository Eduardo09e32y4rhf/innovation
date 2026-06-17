import { Module } from '@nestjs/common';
import { EmployeesModule } from './employees/employees.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [EmployeesModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
