import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrivacyService } from '../../privacy/privacy.service';
// PrivacyService mantido no construtor para não alterar o módulo.

@Processor('pdf-generation')
export class PdfGenerationWorker {
  private readonly logger = new Logger(PdfGenerationWorker.name);

  constructor(private readonly privacyService: PrivacyService) {}

  @Process()
  async handlePdfGeneration(job: Job<any>) {
    // O termo agora é gerado no próprio aceite; jobs antigos ainda na fila são descartados.
    this.logger.warn(`Job legado de PDF ignorado (consentimento ${job.data?.consentId ?? 'desconhecido'}).`);
    return { skipped: true };
  }
}
