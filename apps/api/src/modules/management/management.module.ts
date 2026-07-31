import { Module } from '@nestjs/common';
import { ManagementEventsController } from './management-events.controller';
import { ManagementEventsService } from './management-events.service';
import { AsoController } from './aso.controller';
import { AsoService } from './aso.service';
import { DocumentsModule } from '../documents/documents.module';
import { ManagementDocumentsController } from './management-documents.controller';
import { ManagementDocumentsService } from './management-documents.service';

@Module({
  imports: [DocumentsModule],
  controllers: [ManagementEventsController, AsoController, ManagementDocumentsController],
  providers: [ManagementEventsService, AsoService, ManagementDocumentsService],
  exports: [ManagementEventsService, AsoService],
})
export class ManagementModule {}
