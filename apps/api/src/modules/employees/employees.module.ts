import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesRepository } from './employees.repository';
import { EmployeesService } from './employees.service';
import { ManagementModule } from '../management/management.module';
import { EmployeesImportService } from './employees-import.service';
import { EmployeesImportController } from './employees-import.controller';
import { DocumentsModule } from '../documents/documents.module';
import { EmployeeDocumentsService } from './employee-documents.service';

@Module({
  imports: [ManagementModule, DocumentsModule],
  controllers: [EmployeesController, EmployeesImportController],
  providers: [EmployeesService, EmployeesRepository, EmployeesImportService, EmployeeDocumentsService],
})
export class EmployeesModule {}
