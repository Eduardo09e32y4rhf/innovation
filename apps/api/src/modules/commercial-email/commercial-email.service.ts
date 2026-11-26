import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { EmailRecipientStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PlatformAuditService } from '../platform-audit/platform-audit.service';
import { CreateCampaignDto, CreateNoticeDto } from './dto/create-campaign.dto';

const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;
const TOKEN_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class CommercialEmailService {
  constructor(private readonly prisma: PrismaService, private readonly audit: PlatformAuditService, @InjectQueue('commercial-email') private readonly queue: Queue) {}

  private normalize(recipients: CreateCampaignDto['recipients']) {
    const unique = new Map<string, { email: string; name: string }>();
    for (const recipient of recipients) {
      const email = recipient.email.trim().toLowerCase();
      if (!unique.has(email)) unique.set(email, { email, name: recipient.name?.trim() || email.split('@')[0] });
    }
    return [...unique.values()];
  }

  async previewRecipients(recipients: CreateCampaignDto['recipients'], type: CreateCampaignDto['type'] = 'TRIAL_INVITE') {
    const unique = this.normalize(recipients);
    const locks = await this.prisma.trialInvite.findMany({ where: { email: { in: unique.map(x => x.email) } } });
    const byEmail = new Map(locks.map(lock => [lock.email, lock]));
    const now = Date.now();
    const evaluated = unique.map(item => {
      const lock = byEmail.get(item.email);
      const status = lock?.unsubscribedAt || lock?.bouncedAt ? EmailRecipientStatus.SKIPPED_UNSUBSCRIBED
        : type === 'TRIAL_INVITE' && lock?.activatedAt ? EmailRecipientStatus.SKIPPED_ALREADY_ACTIVATED
        : type === 'TRIAL_INVITE' && lock?.lastInviteSentAt && now - lock.lastInviteSentAt.getTime() < COOLDOWN_MS ? EmailRecipientStatus.SKIPPED_COOLDOWN
        : EmailRecipientStatus.QUEUED;
      return { ...item, status };
    });
    return { total: unique.length, totalValid: unique.length, readyToSend: evaluated.filter(x => x.status === EmailRecipientStatus.QUEUED).length, skipped: evaluated.filter(x => x.status !== EmailRecipientStatus.QUEUED).length, evaluated };
  }

  async createAndDispatchCampaign(actorId: string, dto: CreateCampaignDto, ip?: string) {
    const preview = await this.previewRecipients(dto.recipients, dto.type);
    if (!preview.totalValid) throw new BadRequestException('Informe ao menos um destinatário válido.');
    const campaign = await this.prisma.emailCampaign.create({ data: { createdById: actorId, subject: dto.subject.trim(), bodyText: dto.bodyText, type: dto.type ?? 'TRIAL_INVITE' } });
    const jobs: Array<{ name: string; data: { recipientId: string; rawToken?: string }; opts: { jobId: string; attempts: number; backoff: { type: 'exponential'; delay: number }; removeOnComplete: boolean } }> = [];
    for (const item of preview.evaluated) {
      const token = item.status === EmailRecipientStatus.QUEUED && dto.type !== 'INFO' ? randomBytes(32).toString('hex') : undefined;
      const recipient = await this.prisma.emailRecipient.create({ data: { campaignId: campaign.id, email: item.email, name: item.name, status: item.status, tokenHash: token ? createHash('sha256').update(token).digest('hex') : undefined, tokenExpiresAt: token ? new Date(Date.now() + TOKEN_MS) : undefined } });
      if (item.status === EmailRecipientStatus.QUEUED) jobs.push({ name: 'send-commercial-email', data: { recipientId: recipient.id, rawToken: token }, opts: { jobId: `commercial-${recipient.id}`, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true } });
    }
    if (jobs.length) await this.queue.addBulk(jobs);
    await this.audit.log({ actorId, action: 'COMMERCIAL_CAMPAIGN_DISPATCHED', entity: 'EmailCampaign', entityId: campaign.id, ip, after: { queuedCount: jobs.length, skippedCount: preview.skipped, subject: campaign.subject } });
    return { campaignId: campaign.id, queued: jobs.length, skipped: preview.skipped };
  }

  async campaignHistory(actorId: string) {
    const campaigns = await this.prisma.emailCampaign.findMany({ where: { createdById: actorId }, orderBy: { createdAt: 'desc' }, take: 100, include: { _count: { select: { recipients: true } } } });
    return campaigns.map(({ _count, ...campaign }) => ({ ...campaign, recipientCount: _count.recipients }));
  }

  async validateTrialToken(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const recipient = await this.prisma.emailRecipient.findUnique({ where: { tokenHash } });
    if (!recipient || !recipient.tokenExpiresAt || recipient.tokenExpiresAt < new Date() || recipient.status !== EmailRecipientStatus.SENT) throw new BadRequestException('Link de convite inválido ou expirado.');
    return { email: recipient.email, name: recipient.name };
  }

  async unsubscribeEmail(email: string) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) throw new BadRequestException('E-mail inválido.');
    await this.prisma.trialInvite.upsert({ where: { email: normalized }, update: { unsubscribedAt: new Date() }, create: { email: normalized, unsubscribedAt: new Date() } });
    return { unsubscribed: true };
  }

  async handleResendWebhook(payload: string, headers: { id?: string; timestamp?: string; signature?: string }) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret || !headers.id || !headers.timestamp || !headers.signature) throw new UnauthorizedException('Cabeçalhos ou segredo de webhook ausentes.');
    let event: any;
    try {
      const issuedAt = Number(headers.timestamp);
      if (!Number.isFinite(issuedAt) || Math.abs(Date.now() / 1000 - issuedAt) > 300) throw new Error('stale webhook');
      const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
      const expected = createHmac('sha256', key).update(`${headers.id}.${headers.timestamp}.${payload}`).digest();
      const valid = headers.signature.split(' ').some(part => {
        const [version, encoded] = part.split(',');
        if (version !== 'v1' || !encoded) return false;
        const actual = Buffer.from(encoded, 'base64');
        return actual.length === expected.length && timingSafeEqual(actual, expected);
      });
      if (!valid) throw new Error('bad signature');
      event = JSON.parse(payload);
    } catch { throw new UnauthorizedException('Assinatura de webhook Resend inválida.'); }
    if (event.type !== 'email.bounced' && event.type !== 'email.complained') return { received: true };
    const emailId = event.data?.email_id;
    if (emailId) await this.prisma.emailRecipient.updateMany({ where: { resendEmailId: emailId }, data: { status: EmailRecipientStatus.BOUNCED, error: event.type } });
    for (const value of event.data?.to ?? []) {
      const email = String(value).trim().toLowerCase(); if (!email) continue;
      const change = event.type === 'email.bounced' ? { bouncedAt: new Date() } : { unsubscribedAt: new Date() };
      await this.prisma.trialInvite.upsert({ where: { email }, update: change, create: { email, ...change } });
    }
    return { received: true };
  }

  createPlatformNotice(actorId: string, dto: CreateNoticeDto) { return this.prisma.platformNotice.create({ data: { title: dto.title, body: dto.body, type: dto.type ?? 'FEATURE', createdById: actorId } }); }
  async listNoticesForAdmin(userId: string) {
    const notices = await this.prisma.platformNotice.findMany({ orderBy: { publishedAt: 'desc' }, take: 20, include: { reads: { where: { userId } } } });
    return notices.map(n => ({ id: n.id, title: n.title, body: n.body, type: n.type, publishedAt: n.publishedAt, isRead: n.reads.length > 0, acceptedAt: n.reads[0]?.acceptedAt ?? null }));
  }
  async acknowledgeNotice(noticeId: string, userId: string, tenantId: string, ipAddress?: string) {
    const exists = await this.prisma.platformNotice.findUnique({ where: { id: noticeId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Comunicado não encontrado.');
    return this.prisma.platformNoticeRead.upsert({ where: { noticeId_userId: { noticeId, userId } }, update: { acceptedAt: new Date(), ipAddress }, create: { noticeId, userId, tenantId, ipAddress } });
  }
}
