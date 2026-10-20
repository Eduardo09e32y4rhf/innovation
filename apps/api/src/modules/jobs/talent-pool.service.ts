import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { PrismaService } from '../../database/prisma.service';
import { monthsAgo, TALENT_CONSENT_MONTHS } from './recruitment-privacy';
import { MailService } from '../mail/mail.service';
import { JobsStorageService } from './jobs-storage.service';
import { candidateInviteEmail } from './recruitment-mails';
import { highestEducation, sanitizeEducation, sanitizeExperience, sanitizeSkills, talentCard, DRIVER_LICENSE_CATEGORIES, EDUCATION_LEVELS } from './candidate-account.rules';

const appBase = () => (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
/** Limite diário de convites por empresa: o banco de talentos não pode virar disparador de mensagens. */
export const MAX_INVITES_PER_DAY = 50;
const SEARCH_WINDOW = 500;
const PAGE_SIZE = 30;

export type TalentFilters = { q?: string; city?: string; state?: string; education?: string; license?: string; category?: string; page?: number };

const fold = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/** Banco de talentos (reaproveitamento): candidatos de qualquer empresa que aceitaram aparecer para o RH. */
@Injectable()
export class TalentPoolService {
  private readonly logger = new Logger(TalentPoolService.name);

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService, private readonly storage: JobsStorageService) {}

  async search(companyId: string, userId: string, filters: TalentFilters) {
    const where: Record<string, unknown> = { talentPoolConsentAt: { gte: monthsAgo(TALENT_CONSENT_MONTHS) }, name: { not: null } };
    const city = filters.city?.trim();
    if (city) where.city = { contains: city, mode: 'insensitive' };
    const state = filters.state?.trim().toUpperCase();
    if (state) where.state = state;
    if (filters.license === 'sim') where.hasDriverLicense = true;
    if (filters.license === 'nao') where.hasDriverLicense = false;
    const category = filters.category?.trim().toUpperCase();
    if (category && (DRIVER_LICENSE_CATEGORIES as readonly string[]).includes(category)) { where.hasDriverLicense = true; where.driverLicenseCategory = category; }

    const rows = await this.prisma.candidateAccount.findMany({ where: where as never, orderBy: { updatedAt: 'desc' }, take: SEARCH_WINDOW });
    const q = fold(filters.q).trim();
    const education = (EDUCATION_LEVELS as readonly string[]).includes(String(filters.education)) ? String(filters.education) : '';
    const matched = rows.filter((row) => {
      if (education && !sanitizeEducation(row.education).some((item) => item.level === education)) return false;
      if (!q) return true;
      const haystack = fold([row.name, row.profession, row.city, row.neighborhood, ...sanitizeSkills(row.skills), ...sanitizeEducation(row.education).map((item) => `${item.course} ${item.school} ${item.level}`), ...sanitizeExperience(row.experience).map((item) => `${item.role} ${item.company}`)].join(' '));
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });

    const page = Math.max(1, Math.floor(Number(filters.page) || 1));
    const slice = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Quem já se candidatou a esta empresa fica marcado (o e-mail é usado só aqui, dentro do servidor, e nunca sai).
    const emails = slice.map((row) => row.email);
    const applied = emails.length ? await this.prisma.candidate.findMany({ where: { companyId, email: { in: emails, mode: 'insensitive' } }, select: { email: true } }) : [];
    const appliedSet = new Set(applied.map((item) => String(item.email).toLowerCase()));
    const invites = slice.length ? await this.prisma.candidateInvite.findMany({ where: { companyId, accountId: { in: slice.map((row) => row.id) } }, select: { accountId: true, jobId: true, status: true } }) : [];

    return {
      total: matched.length,
      page,
      pageSize: PAGE_SIZE,
      truncated: rows.length >= SEARCH_WINDOW,
      items: slice.map((row) => ({
        ...talentCard(row),
        alreadyApplied: appliedSet.has(row.email.toLowerCase()),
        invites: invites.filter((invite) => invite.accountId === row.id).map((invite) => ({ jobId: invite.jobId, status: invite.status })),
      })),
    };
  }

  /** Todo dia às 04:15 tira do banco de talentos quem passou do prazo do consentimento (o cadastro do candidato continua dele). */
  @Cron('15 4 * * *')
  @CronLock('talent.consent-expiry', 3600)
  async expireConsents() {
    const { count } = await this.prisma.candidateAccount.updateMany({
      where: { talentPoolConsentAt: { lt: monthsAgo(TALENT_CONSENT_MONTHS) } },
      data: { talentPoolConsentAt: null },
    });
    if (count) this.logger.log(`Banco de talentos: ${count} consentimento(s) vencido(s) encerrado(s).`);
    return count;
  }

  private async consentedAccount(id: string) {
    const account = await this.prisma.candidateAccount.findFirst({ where: { id, talentPoolConsentAt: { gte: monthsAgo(TALENT_CONSENT_MONTHS) } } });
    if (!account) throw new NotFoundException('Candidato não encontrado ou fora do banco de talentos.');
    return account;
  }

  async resume(companyId: string, userId: string, id: string) {
    const account = await this.consentedAccount(id);
    if (!account.resumeKey) throw new NotFoundException('Este candidato não tem currículo salvo.');
    let buffer: Buffer;
    try { buffer = await this.storage.read(account.resumeKey); } catch { throw new NotFoundException('Currículo indisponível.'); }
    await this.prisma.candidateProfileView.create({ data: { accountId: account.id, companyId, userId, kind: 'RESUME' } });
    return { buffer, type: account.resumeType || 'application/pdf', name: account.resumeName || 'curriculo.pdf' };
  }

  /** Chama o candidato para uma vaga. O e-mail do candidato nunca é mostrado ao RH: o convite sai pela plataforma. */
  async invite(companyId: string, userId: string, id: string, input: { jobId: string; message?: string }) {
    const account = await this.consentedAccount(id);
    const job = await this.prisma.job.findFirst({ where: { id: input.jobId, companyId, status: 'OPEN', isInternal: false }, select: { id: true, title: true, company: { select: { name: true } } } });
    if (!job) throw new BadRequestException('Escolha uma vaga aberta da sua empresa.');
    const today = await this.prisma.candidateInvite.count({ where: { companyId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
    if (today >= MAX_INVITES_PER_DAY) throw new BadRequestException(`Limite de ${MAX_INVITES_PER_DAY} convites por dia atingido. Tente novamente amanhã.`);
    const already = await this.prisma.candidateInvite.findUnique({ where: { accountId_jobId: { accountId: account.id, jobId: job.id } } });
    if (already) throw new ConflictException('Este candidato já foi convidado para esta vaga.');
    const message = input.message?.trim().slice(0, 600) || null;
    const invite = await this.prisma.candidateInvite.create({ data: { accountId: account.id, companyId, jobId: job.id, invitedBy: userId, message } });
    await this.prisma.candidateProfileView.create({ data: { accountId: account.id, companyId, userId, kind: 'INVITE' } });
    let emailSent = true;
    try {
      await this.mail.send(account.email, candidateInviteEmail({ name: account.name || 'candidato', company: job.company.name, jobTitle: job.title, message, jobUrl: `${appBase()}/carreiras/${companyId}/${job.id}`, accountUrl: `${appBase()}/carreiras/conta` }));
    } catch (error) {
      emailSent = false;
      this.logger.error(`Falha ao enviar convite: ${error instanceof Error ? error.message : error}`);
    }
    return { id: invite.id, emailSent };
  }
}

/** Lista para o DEV (Usuários > Candidatos): logins e dados de perfil. Nunca devolve senha, CPF, telefone nem endereço completo. */
@Injectable()
export class CandidateAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: { q?: string; page?: number }) {
    const q = input.q?.trim();
    const where = q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { profession: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }] } : {};
    const page = Math.max(1, Math.floor(Number(input.page) || 1));
    const [total, rows] = await Promise.all([
      this.prisma.candidateAccount.count({ where: where as never }),
      this.prisma.candidateAccount.findMany({ where: where as never, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 25, take: 25 }),
    ]);
    const emails = rows.map((row) => row.email);
    const applications = emails.length ? await this.prisma.candidate.findMany({ where: { email: { in: emails, mode: 'insensitive' } }, select: { email: true, _count: { select: { applications: true } } } }) : [];
    const countByEmail = new Map<string, number>();
    for (const item of applications) {
      const key = (item.email ?? '').toLowerCase();
      if (key) countByEmail.set(key, (countByEmail.get(key) ?? 0) + item._count.applications);
    }
    return {
      total, page, pageSize: 25,
      items: rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        profession: row.profession,
        city: row.city, state: row.state,
        highestEducation: highestEducation(sanitizeEducation(row.education)),
        hasDriverLicense: row.hasDriverLicense, driverLicenseCategory: row.hasDriverLicense ? row.driverLicenseCategory : null,
        hasResume: Boolean(row.resumeKey), hasPassword: Boolean(row.passwordHash),
        talentPool: Boolean(row.talentPoolConsentAt),
        applications: countByEmail.get(row.email.toLowerCase()) ?? 0,
        createdAt: row.createdAt, lastLoginAt: row.lastLoginAt,
        locked: Boolean(row.lockedUntil && row.lockedUntil > new Date()),
      })),
    };
  }
}
