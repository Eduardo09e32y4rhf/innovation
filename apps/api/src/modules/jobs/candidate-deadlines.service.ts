import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { assessmentReminderCopy, deadlineReminderEmail } from './recruitment-mails';
import { appBase } from './recruitment-tokens';

const HOUR = 3_600_000;
const REMIND_WINDOW_HOURS = 48;
type Kind = 'OFFER' | 'ASSESSMENT' | 'SLOTS';
interface Row { id: string; token: string; expiresAt: Date; applicationId: string }

/** RS-C-08: grava EXPIRED no que o candidato deixou vencer e lembra uma única vez nas últimas 48 h antes do vencimento. */
@Injectable()
export class CandidateDeadlinesService {
  private readonly logger = new Logger(CandidateDeadlinesService.name);

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  async expireOverdue(now = new Date()) {
    const [offers, assessments, slots] = await Promise.all([
      this.prisma.jobOffer.updateMany({ where: { status: 'SENT', expiresAt: { lt: now } }, data: { status: 'EXPIRED' } }),
      this.prisma.assessmentInvite.updateMany({ where: { status: { in: ['SENT', 'STARTED'] }, expiresAt: { lt: now } }, data: { status: 'EXPIRED' } }),
      this.prisma.interviewSlotOffer.updateMany({ where: { status: 'PENDING', expiresAt: { lt: now } }, data: { status: 'EXPIRED' } }),
    ]);
    return { offers: offers.count, assessments: assessments.count, slots: slots.count };
  }

  async remindExpiring(now = new Date()) {
    const limit = new Date(now.getTime() + REMIND_WINDOW_HOURS * HOUR);
    const window = { gt: now, lte: limit };
    const select = { id: true, token: true, expiresAt: true, applicationId: true };
    const [offers, assessments, slots] = await Promise.all([
      this.prisma.jobOffer.findMany({ where: { status: 'SENT', reminderSentAt: null, expiresAt: window }, select, take: 200 }),
      this.prisma.assessmentInvite.findMany({ where: { status: { in: ['SENT', 'STARTED'] }, reminderSentAt: null, expiresAt: window }, select, take: 200 }),
      this.prisma.interviewSlotOffer.findMany({ where: { status: 'PENDING', reminderSentAt: null, expiresAt: window }, select, take: 200 }),
    ]);
    let reminded = 0;
    reminded += await this.send('OFFER', offers as Row[], now);
    reminded += await this.send('ASSESSMENT', assessments as Row[], now);
    reminded += await this.send('SLOTS', slots as Row[], now);
    return { reminded };
  }

  private async send(kind: Kind, rows: Row[], now: Date) {
    if (!rows.length || !appBase()) return 0;
    const apps = await this.prisma.application.findMany({
      where: { id: { in: rows.map((row) => row.applicationId) } },
      select: { id: true, anonymizedAt: true, status: true, candidate: { select: { name: true, email: true } }, job: { select: { title: true, company: { select: { name: true } } } } },
    });
    const byId = new Map(apps.map((app) => [app.id, app]));
    let count = 0;
    for (const row of rows) {
      const app = byId.get(row.applicationId);
      if (!app || app.anonymizedAt || !app.candidate.email || ['REJECTED', 'HIRED'].includes(app.status)) continue;
      try {
        const copy = assessmentReminderCopy(kind);
        const url = `${appBase()}/carreiras/${copy.path}/${row.token}`;
        const result = await this.mail.send(app.candidate.email, deadlineReminderEmail({ name: app.candidate.name, company: app.job.company.name, jobTitle: app.job.title, what: copy.what, cta: copy.cta, url, expires: row.expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) }));
        if (!result.sent) continue;
        await this.markReminded(kind, row.id, now);
        count += 1;
      } catch (error) {
        this.logger.warn(`Lembrete de prazo falhou (${kind} ${row.id}): ${error instanceof Error ? error.message : error}`);
      }
    }
    return count;
  }

  private markReminded(kind: Kind, id: string, now: Date) {
    const args = { where: { id }, data: { reminderSentAt: now } };
    return kind === 'OFFER' ? this.prisma.jobOffer.update(args) : kind === 'ASSESSMENT' ? this.prisma.assessmentInvite.update(args) : this.prisma.interviewSlotOffer.update(args);
  }
}
