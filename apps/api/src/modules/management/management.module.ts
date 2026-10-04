import { Module } from '@nestjs/common';
import { ManagementEventsController } from './management-events.controller';
import { ManagementEventsService } from './management-events.service';
import { AsoController } from './aso.controller';
import { AsoService } from './aso.service';
import { DocumentsModule } from '../documents/documents.module';
import { ManagementDocumentsController } from './management-documents.controller';
import { ManagementDocumentsService } from './management-documents.service';
import { SstController } from './sst/sst.controller';
import { SstCron } from './sst/sst.cron';
import { SstService } from './sst/sst.service';

@Module({
  imports: [DocumentsModule],
  controllers: [ManagementEventsController, AsoController, ManagementDocumentsController, SstController],
  providers: [ManagementEventsService, AsoService, ManagementDocumentsService, SstService, SstCron],
  exports: [ManagementEventsService, AsoService],
})
export class ManagementModule {}
