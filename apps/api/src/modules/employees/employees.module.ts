import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesRepository } from './employees.repository';
import { EmployeesService } from './employees.service';
import { ManagementModule } from '../management/management.module';
import { EmployeesImportService } from './employees-import.service';
import { EmployeesImportController } from './employees-import.controller';

@Module({
  imports: [ManagementModule],
  controllers: [EmployeesController, EmployeesImportController],
  providers: [EmployeesService, EmployeesRepository, EmployeesImportService],
})
export class EmployeesModule {}
