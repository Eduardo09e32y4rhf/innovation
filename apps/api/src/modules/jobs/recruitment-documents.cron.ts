import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { RecruitmentDocumentsService } from './recruitment-documents.service';

/** Rotinas diarias dos documentos da admissao (lembretes de link, alertas de vencimento, retencao). Horario de Brasilia. */
@Injectable()
export class RecruitmentDocumentsCron {
  private readonly logger = new Logger(RecruitmentDocumentsCron.name);

  constructor(private readonly documents: RecruitmentDocumentsService) {}

  @Cron('20 9 * * *', { timeZone: 'America/Sao_Paulo' })
  @CronLock('recruitment.documents-daily', 3600)
  async daily() {
    const reminders = await this.documents.sendLinkReminders();
    const expiry = await this.documents.alertExpiringDocuments();
    this.logger.log(`Documentos: ${reminders.reminded} lembrete(s) de link, ${expiry.alerted} alerta(s) de vencimento.`);
  }
}
