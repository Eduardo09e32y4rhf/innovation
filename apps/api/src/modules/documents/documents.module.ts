import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { SignedDocumentService } from './signed-document.service';
import { SupportModule } from '../support/support.module'; // exporta SupportStorageService

@Module({
  imports: [SupportModule],
  providers: [DocumentService, SignedDocumentService],
  exports: [DocumentService, SignedDocumentService],
})
export class DocumentsModule {}
