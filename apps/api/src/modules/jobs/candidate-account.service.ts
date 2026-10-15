import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { CandidateAccount } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { JobsService } from './jobs.service';
import { JobsStorageService } from './jobs-storage.service';
import { candidatePasswordResetEmail } from './recruitment-mails';
import { PRIVACY_VERSION, STAGE_LABEL_FOR_CANDIDATE } from './recruitment-privacy';
import {
  DRIVER_LICENSE_CATEGORIES, funnelCount, generateLoginCode, hashPassword, hashSecret, isEmail, isValidCpf, LOGIN_CODE_MAX_ATTEMPTS, LOGIN_CODE_TTL_MINUTES, LOGIN_LOCK_MINUTES, LOGIN_MAX_FAILURES,
  normalizeEmail, onlyDigits, parseBirthDate, passwordProblem, profileChecklist, profileCompleteness, safeEqualHex, sanitizeEducation, sanitizeExperience, sanitizeSkills, SESSION_TTL_DAYS, verifyPassword,
} from './candidate-account.rules';
import type { CandidateApplyDto, CandidateUpdateProfileDto } from './dto/candidate-account.dto';

const MAX_RESUME_SIZE = 5 * 1024 * 1024;
/** Máximo de códigos por e-mail na janela de 10 minutos (evita virar disparador de e-mails). */
const MAX_CODES_PER_WINDOW = 3;
const FUNNEL_STATUSES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER'] as const;

type Account = CandidateAccount;
/** Hash descartável para igualar o tempo de resposta quando o e-mail não existe. */
const DUMMY_HASH = hashPassword('senha-descartavel-1');

@Injectable()
export class CandidateAccountService {
  private readonly logger = new Logger(CandidateAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly storage: JobsStorageService,
    private readonly jobs: JobsService,
  ) {}

  // ---------- cadastro, login e recuperação de senha ----------
  private async startSession(accountId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
    await this.prisma.candidateSession.create({ data: { accountId, tokenHash: hashSecret(token), expiresAt } });
    return { token, expiresAt };
  }

  /** Cria a conta (e-mail é o usuário) e já entra. Conta antiga sem senha recupera o acesso por "esqueci minha senha". */
  async register(rawEmail: string, password: string, name?: string) {
    const email = normalizeEmail(rawEmail);
    if (!isEmail(email)) throw new BadRequestException({ message: 'Informe um e-mail válido.', fields: { email: 'E-mail inválido' } });
    const problem = passwordProblem(password);
    if (problem) throw new BadRequestException({ message: problem, fields: { password: problem } });
    const existing = await this.prisma.candidateAccount.findUnique({ where: { email } });
    if (existing) throw new ConflictException({ message: 'Este e-mail já tem conta. Entre com sua senha ou use "Esqueci minha senha".', fields: { email: 'E-mail já cadastrado' } });
    const account = await this.prisma.candidateAccount.create({
      data: { email, name: name?.replace(/\s+/g, ' ').trim().slice(0, 180) || null, passwordHash: hashPassword(password), lastLoginAt: new Date() },
    });
    return this.startSession(account.id);
  }

  async login(rawEmail: string, password: string) {
    const email = normalizeEmail(rawEmail);
    const fail = new UnauthorizedException('E-mail ou senha incorretos.');
    const account = isEmail(email) ? await this.prisma.candidateAccount.findUnique({ where: { email } }) : null;
    if (!account?.passwordHash) {
      // Mesmo custo de uma conta real: não dá para descobrir quais e-mails existem pelo tempo da resposta.
      verifyPassword(password, DUMMY_HASH);
      throw fail;
    }
    if (account.lockedUntil && account.lockedUntil > new Date()) throw new HttpException('Muitas tentativas. Aguarde alguns minutos ou use "Esqueci minha senha".', HttpStatus.TOO_MANY_REQUESTS);
    if (!verifyPassword(password, account.passwordHash)) {
      const failures = account.failedLoginCount + 1;
      await this.prisma.candidateAccount.update({
        where: { id: account.id },
        data: failures >= LOGIN_MAX_FAILURES ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000) } : { failedLoginCount: failures },
      });
      throw fail;
    }
    await this.prisma.candidateAccount.update({ where: { id: account.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
    return this.startSession(account.id);
  }

  /** Resposta sempre igual: não revela se o e-mail tem conta. O código vai por e-mail (SMS fica para uma segunda fase). */
  async requestPasswordReset(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    if (!isEmail(email)) return { sent: true };
    const account = await this.prisma.candidateAccount.findUnique({ where: { email }, select: { id: true } });
    if (!account) return { sent: true };
    const since = new Date(Date.now() - LOGIN_CODE_TTL_MINUTES * 60_000);
    const recent = await this.prisma.candidateLoginCode.count({ where: { email, createdAt: { gte: since } } });
    if (recent >= MAX_CODES_PER_WINDOW) return { sent: true };
    const code = generateLoginCode();
    await this.prisma.candidateLoginCode.create({ data: { email, purpose: 'RESET', codeHash: hashSecret(`${email}:${code}`), expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MINUTES * 60_000) } });
    try {
      await this.mail.send(email, candidatePasswordResetEmail({ code, minutes: LOGIN_CODE_TTL_MINUTES }));
    } catch (error) {
      this.logger.error(`Falha ao enviar código de recuperação do candidato: ${error instanceof Error ? error.message : error}`);
    }
    return { sent: true };
  }

  async resetPassword(rawEmail: string, code: string, password: string) {
    const email = normalizeEmail(rawEmail);
    const invalid = new BadRequestException('Código inválido ou expirado. Peça um novo código.');
    if (!isEmail(email) || !/^\d{6}$/.test(code)) throw invalid;
    const problem = passwordProblem(password);
    if (problem) throw new BadRequestException({ message: problem, fields: { password: problem } });
    const row = await this.prisma.candidateLoginCode.findFirst({ where: { email, purpose: 'RESET', usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!row || row.attempts >= LOGIN_CODE_MAX_ATTEMPTS) throw invalid;
    if (!safeEqualHex(row.codeHash, hashSecret(`${email}:${code}`))) {
      await this.prisma.candidateLoginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      throw invalid;
    }
    await this.prisma.candidateLoginCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    const account = await this.prisma.candidateAccount.update({
      where: { email },
      data: { passwordHash: hashPassword(password), failedLoginCount: 0, lockedUntil: null, verifiedAt: new Date(), lastLoginAt: new Date() },
    });
    // Trocou a senha: derruba as sessões abertas em qualquer aparelho.
    await this.prisma.candidateSession.deleteMany({ where: { accountId: account.id } });
    return this.startSession(account.id);
  }

  async findAccountBySession(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const session = await this.prisma.candidateSession.findUnique({ where: { tokenHash: hashSecret(token) }, include: { account: true } });
    if (!session || session.expiresAt < new Date()) return null;
    return session.account;
  }

  async logout(token: string) {
    if (/^[a-f0-9]{64}$/.test(token)) await this.prisma.candidateSession.deleteMany({ where: { tokenHash: hashSecret(token) } });
    return { ok: true };
  }

  // ---------- perfil mínimo ----------
  profile(account: Account) {
    return {
      email: account.email,
      name: account.name, cpf: account.cpf, phone: account.phone,
      cep: account.cep, street: account.street, streetNumber: account.streetNumber, addressComplement: account.addressComplement,
      neighborhood: account.neighborhood, city: account.city, state: account.state,
      birthDate: account.birthDate ? account.birthDate.toISOString().slice(0, 10) : null,
      profession: account.profession, skills: sanitizeSkills(account.skills),
      about: account.about, experience: sanitizeExperience(account.experience),
      hasDriverLicense: account.hasDriverLicense, driverLicenseCategory: account.driverLicenseCategory,
      talentPoolConsent: Boolean(account.talentPoolConsentAt),
      education: sanitizeEducation(account.education),
      resume: account.resumeKey ? { name: account.resumeName, type: account.resumeType, size: account.resumeSize } : null,
      consent: Boolean(account.consentAt),
      admissionShareConsent: account.admissionShareConsent,
      completeness: profileCompleteness(account),
      checklist: profileChecklist(account),
    };
  }

  async updateProfile(account: Account, dto: CandidateUpdateProfileDto) {
    const data: Record<string, unknown> = {};
    const text = (value: string | undefined, max: number) => value?.replace(/\s+/g, ' ').trim().slice(0, max) || null;
    if (dto.name !== undefined) data.name = text(dto.name, 180);
    if (dto.cpf !== undefined) {
      const digits = onlyDigits(dto.cpf);
      if (digits && !isValidCpf(digits)) throw new BadRequestException({ message: 'CPF inválido. Confira os 11 dígitos.', fields: { cpf: 'CPF inválido' } });
      data.cpf = digits || null;
    }
    if (dto.phone !== undefined) data.phone = text(dto.phone, 40);
    if (dto.cep !== undefined) data.cep = onlyDigits(dto.cep).slice(0, 8) || null;
    if (dto.street !== undefined) data.street = text(dto.street, 160);
    if (dto.streetNumber !== undefined) data.streetNumber = text(dto.streetNumber, 20);
    if (dto.addressComplement !== undefined) data.addressComplement = text(dto.addressComplement, 160);
    if (dto.neighborhood !== undefined) data.neighborhood = text(dto.neighborhood, 160);
    if (dto.city !== undefined) data.city = text(dto.city, 160);
    if (dto.state !== undefined) data.state = text(dto.state, 2)?.toUpperCase() ?? null;
    if (dto.education !== undefined) data.education = sanitizeEducation(dto.education);
    if (dto.birthDate !== undefined) {
      const birth = parseBirthDate(dto.birthDate);
      if (birth === undefined) throw new BadRequestException({ message: 'Data de nascimento inválida.', fields: { birthDate: 'Data inválida' } });
      data.birthDate = birth;
    }
    if (dto.profession !== undefined) data.profession = text(dto.profession, 120);
    if (dto.skills !== undefined) data.skills = sanitizeSkills(dto.skills);
    if (dto.about !== undefined) data.about = dto.about.trim().slice(0, 1200) || null;
    if (dto.experience !== undefined) data.experience = sanitizeExperience(dto.experience);
    if (dto.hasDriverLicense !== undefined) {
      data.hasDriverLicense = dto.hasDriverLicense;
      if (!dto.hasDriverLicense) data.driverLicenseCategory = null;
    }
    if (dto.driverLicenseCategory !== undefined && dto.hasDriverLicense !== false) {
      const category = String(dto.driverLicenseCategory ?? '').trim().toUpperCase();
      if (category && !(DRIVER_LICENSE_CATEGORIES as readonly string[]).includes(category)) throw new BadRequestException({ message: 'Categoria de habilitação inválida.', fields: { driverLicenseCategory: 'Categoria inválida' } });
      data.driverLicenseCategory = category || null;
    }
    if (dto.talentPoolConsent !== undefined) {
      if (dto.talentPoolConsent && !account.talentPoolConsentAt) data.talentPoolConsentAt = new Date();
      if (!dto.talentPoolConsent) data.talentPoolConsentAt = null;
    }
    if (dto.consent === true && !account.consentAt) { data.consentAt = new Date(); data.consentVersion = PRIVACY_VERSION; }
    if (dto.admissionShareConsent !== undefined) data.admissionShareConsent = dto.admissionShareConsent;
    const updated = await this.prisma.candidateAccount.update({ where: { id: account.id }, data });
    return this.profile(updated);
  }

  async saveResume(account: Account, file?: { buffer: Buffer; filename: string }) {
    if (!file?.buffer?.length) throw new BadRequestException('Envie seu currículo em PDF ou DOCX.');
    if (file.buffer.length > MAX_RESUME_SIZE) throw new BadRequestException('O currículo deve ter no máximo 5 MB.');
    const format = detectResume(file.buffer, file.filename);
    if (!format) throw new BadRequestException('Currículo inválido. Envie um arquivo PDF ou DOCX verdadeiro.');
    const key = `candidates/${account.id}/${randomUUID()}.${format.extension}`;
    await this.storage.save(key, file.buffer);
    const previous = account.resumeKey;
    const updated = await this.prisma.candidateAccount.update({
      where: { id: account.id },
      data: { resumeKey: key, resumeName: safeFileName(file.filename, format.extension), resumeType: format.mime, resumeSize: file.buffer.length },
    });
    if (previous) await this.storage.remove(previous);
    return this.profile(updated);
  }

  /** Direito de apagar (LGPD): remove a conta, as sessões e o currículo guardado. As candidaturas já enviadas seguem as regras de retenção de cada empresa. */
  async deleteAccount(account: Account) {
    if (account.resumeKey) await this.storage.remove(account.resumeKey);
    await this.prisma.candidateLoginCode.deleteMany({ where: { email: account.email } });
    await this.prisma.candidateAccount.delete({ where: { id: account.id } });
    return { deleted: true };
  }

  // ---------- minhas candidaturas ----------
  async applications(account: Account) {
    const apps = await this.prisma.application.findMany({
      where: { anonymizedAt: null, candidate: { email: { equals: account.email, mode: 'insensitive' } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        job: { select: { id: true, title: true, confidential: true, company: { select: { name: true } } } },
        stage: { select: { name: true } },
        events: { where: { type: { in: ['APPLIED', 'STAGE_CHANGED', 'REJECTED'] } }, orderBy: { createdAt: 'asc' }, select: { type: true, toStage: true, createdAt: true } },
        // So a entrevista que o candidato ja recebeu por e-mail (agendamento interno nao aparece).
        interviews: { where: { notifiedAt: { not: null }, scheduledAt: { gte: new Date(Date.now() - 3 * 3_600_000) } }, orderBy: { scheduledAt: 'asc' }, take: 1, select: { scheduledAt: true, mode: true, location: true, meetingUrl: true, durationMinutes: true } },
      },
    });
    const jobIds = [...new Set(apps.map((app) => app.jobId))];
    const grouped = jobIds.length
      ? await this.prisma.application.groupBy({ by: ['jobId', 'status'], where: { jobId: { in: jobIds }, anonymizedAt: null }, _count: { _all: true } })
      : [];
    const counts = new Map<string, number>();
    for (const row of grouped) counts.set(`${row.jobId}:${row.status}`, row._count._all);

    return {
      applications: apps.map((app) => ({
        id: app.id,
        jobId: app.jobId,
        job: app.job.title,
        company: app.job.company.name,
        appliedAt: app.createdAt,
        status: app.status,
        statusLabel: STAGE_LABEL_FOR_CANDIDATE[app.status] ?? app.status,
        stage: app.stage?.name ?? null,
        closed: app.status === 'REJECTED' || app.status === 'HIRED',
        interview: app.status === 'REJECTED' || app.status === 'HIRED' ? null : (app.interviews?.[0] ?? null),
        timeline: app.events.map((event) => ({ at: event.createdAt, label: event.type === 'APPLIED' ? 'Candidatura recebida' : event.type === 'REJECTED' ? 'Processo encerrado para esta vaga' : `Etapa: ${event.toStage ?? ''}` })),
        // Só totais por etapa; abaixo de 5 vira "menos de 5". Vaga confidencial não mostra o funil.
        funnel: app.job.confidential ? null : FUNNEL_STATUSES.map((status) => ({ status, stage: STAGE_LABEL_FOR_CANDIDATE[status] ?? status, ...funnelCount(counts.get(`${app.jobId}:${status}`) ?? 0) })),
      })),
      appliedJobIds: jobIds,
    };
  }

  // ---------- convites do banco de talentos ----------
  async invites(account: Account) {
    const rows = await this.prisma.candidateInvite.findMany({ where: { accountId: account.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    const jobs = rows.length ? await this.prisma.job.findMany({ where: { id: { in: rows.map((row) => row.jobId) } }, select: { id: true, title: true, status: true, companyId: true, company: { select: { name: true } } } }) : [];
    const byId = new Map<string, { title: string; status: string; company: { name: string } }>(jobs.map((job) => [job.id, job]));
    return rows.map((row) => {
      const job = byId.get(row.jobId);
      return { id: row.id, status: row.status, message: row.message, createdAt: row.createdAt, jobId: row.jobId, companyId: row.companyId, job: job?.title ?? 'Vaga', company: job?.company.name ?? 'Empresa', open: job?.status === 'OPEN' };
    });
  }

  async declineInvite(account: Account, inviteId: string) {
    const result = await this.prisma.candidateInvite.updateMany({ where: { id: inviteId, accountId: account.id, status: 'SENT' }, data: { status: 'DECLINED' } });
    if (!result.count) throw new NotFoundException('Convite não encontrado.');
    return { ok: true };
  }

  // ---------- candidatura reaproveitando o perfil ----------
  /** O candidato escolheu "sim, reutilizar": envia nome, e-mail, telefone e o currículo salvo; as respostas às perguntas da vaga vêm do formulário. */
  async applyWithProfile(account: Account, jobId: string, dto: CandidateApplyDto) {
    if (!dto.consent) throw new BadRequestException({ message: 'Consentimento obrigatório para enviar a candidatura.', fields: { consent: 'Obrigatório' } });
    const missing = profileChecklist(account).filter((item) => ['name', 'phone', 'resume'].includes(item.key) && !item.done).map((item) => item.label);
    if (missing.length) throw new BadRequestException({ message: `Complete seu perfil antes de reutilizar os dados: faltam ${missing.join(', ')}.`, fields: { profile: missing.join(', ') } });
    let buffer: Buffer;
    try {
      buffer = await this.storage.read(account.resumeKey as string);
    } catch {
      throw new NotFoundException('Não encontramos o currículo salvo no seu perfil. Anexe-o novamente.');
    }
    const result = await this.jobs.apply(
      jobId,
      {
        name: account.name as string,
        email: account.email,
        phone: account.phone as string,
        consent: true,
        ...(dto.coverLetter?.trim() ? { coverLetter: dto.coverLetter.trim() } : {}),
        answers: JSON.stringify(dto.answers ?? {}),
      },
      { buffer, filename: account.resumeName || 'curriculo.pdf', mimetype: account.resumeType || undefined },
    );
    // Se veio de um convite do RH, o convite passa a "candidatou".
    await this.prisma.candidateInvite.updateMany({ where: { accountId: account.id, jobId, status: 'SENT' }, data: { status: 'APPLIED' } }).catch(() => undefined);
    return result;
  }

  requireAccount(account: Account | null | undefined): Account {
    if (!account) throw new UnauthorizedException('Entre na Área do candidato para continuar.');
    return account;
  }
}

function detectResume(buffer: Buffer, filename: string): { extension: 'pdf' | 'docx'; mime: string } | null {
  const name = String(filename ?? '').toLowerCase();
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-' && name.endsWith('.pdf')) return { extension: 'pdf', mime: 'application/pdf' };
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04 && name.endsWith('.docx')) {
    return { extension: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }
  return null;
}

function safeFileName(filename: string, extension: string) {
  const base = String(filename ?? 'curriculo').replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '').trim().slice(0, 80) || 'curriculo';
  return `${base}.${extension}`;
}
