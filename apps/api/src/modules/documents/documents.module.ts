import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { SupportModule } from '../support/support.module'; // for SupportStorageService

@Module({
  imports: [SupportModule], // To inject SupportStorageService which is exported there? Wait, is it exported?
  providers: [DocumentService],
  exports: [DocumentService]
})
export class DocumentsModule {}
