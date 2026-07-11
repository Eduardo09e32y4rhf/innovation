import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrivacyService } from '../../privacy/privacy.service';

@Processor('pdf-generation')
export class PdfGenerationWorker {
  private readonly logger = new Logger(PdfGenerationWorker.name);

  constructor(private readonly privacyService: PrivacyService) {}

  @Process()
  async handlePdfGeneration(job: Job<any>) {
    try {
      this.logger.log(`Generating PDF for user ${job.data.userEmail}`);
      const pdf = await this.privacyService.generatePDFBase64(job.data.pdfData);
      
      // Save to db using the consentId
      if (job.data.consentId) {
        await this.privacyService.updatePdfBase64(job.data.consentId, pdf);
      }
      
      this.logger.log(`PDF Generated for consent ${job.data.consentId}`);
      return { success: true, pdfSize: pdf.length };
    } catch (error) {
      this.logger.error(`PDF Generation failed for user ${job.data.userEmail}`, error);
      throw error;
    }
  }
}
