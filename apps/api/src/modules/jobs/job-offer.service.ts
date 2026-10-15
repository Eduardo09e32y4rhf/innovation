import { BadRequestException, ForbiddenException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { formatInterviewDate } from './interview-rules';
import { RecruiterNotifierService } from './recruiter-notifier.service';
import { jobOfferEmail } from './recruitment-mails';
import { RecruitmentService } from './recruitment.service';
import { appBase, firstName, isPublicToken, newPublicToken } from './recruitment-tokens';

type Actor = { sub: string; role: string };

export const OFFER_FINAL = ['ACCEPTED', 'DECLINED', 'CANCELED'];
export const CONTRACT_TYPES = ['CLT', 'PJ', 'ESTAGIO', 'TEMPORARIO', 'APRENDIZ', 'AUTONOMO'];

/**
 * Quem aprova a proposta de quem: DEV e Administrador aprovam a propria; a do RH vai para o Administrador; a do
 * RH - R&S vai para RH ou Administrador. Ninguem aprova a propria proposta (exceto DEV/ADMIN, que ja sao a ultima palavra).
 */
export function offerApproval(creatorRole: string): { auto: boolean; approvers: string[] } {
  if (creatorRole === 'DEV' || creatorRole === 'ADMIN') return { auto: true, approvers: [] };
  if (creatorRole === 'RH') return { auto: false, approvers: ['ADMIN', 'DEV'] };
  return { auto: false, approvers: ['RH', 'ADMIN', 'DEV'] };
}

export function canApproveOffer(actor: Actor, offer: { createdById: string | null; createdRole?: string | null }, creatorRole: string): boolean {
  if (actor.sub === offer.createdById) return false;
  return offerApproval(creatorRole).approvers.includes(actor.role);
}

export interface OfferInput {
  positionTitle?: string; contractType: string; salary?: number | null; startDate?: string | null; workSchedule?: string | null;
  workMode?: string | null; benefits?: string[]; message?: string | null; validDays?: number;
}

export function normalizeOffer(input: OfferInput, fallbackTitle: string) {
  const contractType = String(input.contractType ?? '').toUpperCase();
  if (!CONTRACT_TYPES.includes(contractType)) throw new BadRequestException('Escolha o tipo de contrato.');
  const salary = input.salary === undefined || input.salary === null || (input.salary as unknown) === '' ? null : Number(input.salary);
  if (salary !== null && (!Number.isFinite(salary) || salary < 0 || salary > 10_000_000)) throw new BadRequestException('Salário inválido.');
  let startDate: Date | null = null;
  if (input.startDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) throw new BadRequestException('Data de início inválida.');
    startDate = new Date(`${input.startDate}T12:00:00.000Z`);
    if (Number.isNaN(startDate.getTime())) throw new BadRequestException('Data de início inválida.');
  }
  const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max) || null;
  return {
    positionTitle: text(input.positionTitle, 160) ?? fallbackTitle,
    contractType,
    salary: salary === null ? null : new Prisma.Decimal(salary.toFixed(2)),
    startDate,
    workSchedule: text(input.workSchedule, 200),
    workMode: text(input.workMode, 40),
    benefits: (input.benefits ?? []).map((item) => String(item).trim().slice(0, 120)).filter(Boolean).slice(0, 30),
    message: text(input.message, 3000),
    validDays: Math.min(Math.max(Math.round(input.validDays ?? 7), 1), 30),
  };
}

const CONTRACT_LABEL: Record<string, string> = { CLT: 'CLT', PJ: 'PJ', ESTAGIO: 'Estágio', TEMPORARIO: 'Temporário', APRENDIZ: 'Jovem aprendiz', AUTONOMO: 'Autônomo' };

@Injectable()
export class JobOfferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly recruitment: RecruitmentService,
    private readonly notifier: RecruiterNotifierService,
  ) {}

  private async application(companyId: string, applicationId: string) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, include: { candidate: { select: { name: true, email: true } }, job: { select: { id: true, title: true, workMode: true, benefits: true, company: { select: { name: true } } } } } });
    if (!app) throw new NotFoundException('Candidatura não encontrada.');
    return app;
  }

  private async creatorRole(userId: string | null) {
    if (!userId) return 'RH';
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role ?? 'RH';
  }

  async list(companyId: string, actor: Actor, applicationId: string) {
    await this.application(companyId, applicationId);
    const offers = await this.prisma.jobOffer.findMany({ where: { companyId, applicationId }, orderBy: { createdAt: 'desc' }, take: 20 });
    const roles = new Map<string, string>();
    for (const offer of offers) if (offer.createdById && !roles.has(offer.createdById)) roles.set(offer.createdById, await this.creatorRole(offer.createdById));
    return offers.map(({ token: _token, ...offer }) => ({ ...offer, salary: offer.salary ? Number(offer.salary) : null, canApprove: offer.status === 'PENDING_APPROVAL' && canApproveOffer(actor, offer, roles.get(offer.createdById ?? '') ?? 'RH') }));
  }

  async create(companyId: string, actor: Actor, applicationId: string, input: OfferInput) {
    const app = await this.application(companyId, applicationId);
    if (['REJECTED', 'HIRED'].includes(app.status)) throw new BadRequestException('Este candidato não está mais no processo.');
    const data = normalizeOffer(input, app.job.title);
    const user = await this.prisma.user.findUnique({ where: { id: actor.sub }, select: { name: true, email: true } });
    const approval = offerApproval(actor.role);
    await this.prisma.jobOffer.updateMany({ where: { companyId, applicationId, status: { in: ['PENDING_APPROVAL', 'APPROVED'] } }, data: { status: 'CANCELED' } });
    const { validDays, ...fields } = data;
    const offer = await this.prisma.jobOffer.create({
      data: {
        companyId, applicationId, token: newPublicToken(), ...fields,
        expiresAt: new Date(Date.now() + validDays * 86_400_000),
        status: approval.auto ? 'APPROVED' : 'PENDING_APPROVAL',
        createdById: actor.sub, createdByName: user?.name || user?.email || null,
        ...(approval.auto ? { approvedById: actor.sub, approvedByName: user?.name || user?.email || null, approvedAt: new Date() } : {}),
      },
    });
    await this.prisma.applicationEvent.create({ data: { applicationId, userId: actor.sub, type: 'OFFER_CREATED', note: approval.auto ? 'Proposta criada e aprovada' : 'Proposta criada, aguardando aprovação' } });
    if (!approval.auto) {
      await this.notifier.notify({
        companyId, jobId: app.job.id, userIds: [],
        title: `Proposta para aprovar: ${app.candidate.name}`,
        lines: [`${user?.name ?? 'O RH'} preparou uma proposta para ${app.candidate.name} (vaga ${app.job.title})${data.salary ? `, salário ${Number(data.salary).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}.`, 'Abra a ficha do candidato, aba Proposta, para aprovar ou devolver.'],
        priority: 'HIGH', roles: approval.approvers.includes('RH') ? ['RH', 'ADMIN'] : ['ADMIN'], kind: 'OFFER_APPROVAL', cta: 'Revisar proposta',
      });
    }
    return { id: offer.id, status: offer.status };
  }

  private async offer(companyId: string, offerId: string) {
    const offer = await this.prisma.jobOffer.findFirst({ where: { id: offerId, companyId } });
    if (!offer) throw new NotFoundException('Proposta não encontrada.');
    return offer;
  }

  async approve(companyId: string, actor: Actor, offerId: string) {
    const offer = await this.offer(companyId, offerId);
    if (offer.status !== 'PENDING_APPROVAL') throw new BadRequestException('Esta proposta não está aguardando aprovação.');
    if (!canApproveOffer(actor, offer, await this.creatorRole(offer.createdById))) throw new ForbiddenException('Você não pode aprovar esta proposta.');
    const user = await this.prisma.user.findUnique({ where: { id: actor.sub }, select: { name: true, email: true } });
    await this.prisma.jobOffer.update({ where: { id: offer.id }, data: { status: 'APPROVED', approvedById: actor.sub, approvedByName: user?.name || user?.email || null, approvedAt: new Date(), rejectionNote: null } });
    await this.prisma.applicationEvent.create({ data: { applicationId: offer.applicationId, userId: actor.sub, type: 'OFFER_APPROVED', note: `Proposta aprovada por ${user?.name ?? 'aprovador'}` } });
    const app = await this.application(companyId, offer.applicationId);
    await this.notifier.notify({ companyId, jobId: app.job.id, userIds: [offer.createdById], title: `Proposta aprovada: ${app.candidate.name}`, lines: [`${user?.name ?? 'O aprovador'} aprovou a proposta de ${app.candidate.name}. Já pode enviar ao candidato.`], kind: 'OFFER_APPROVED', roles: [], cta: 'Enviar proposta' });
    return { id: offer.id, status: 'APPROVED' };
  }

  async reject(companyId: string, actor: Actor, offerId: string, note: string) {
    const offer = await this.offer(companyId, offerId);
    if (offer.status !== 'PENDING_APPROVAL') throw new BadRequestException('Esta proposta não está aguardando aprovação.');
    if (!canApproveOffer(actor, offer, await this.creatorRole(offer.createdById))) throw new ForbiddenException('Você não pode avaliar esta proposta.');
    const reason = String(note ?? '').trim().slice(0, 1000);
    if (!reason) throw new BadRequestException('Diga o que precisa mudar na proposta.');
    await this.prisma.jobOffer.update({ where: { id: offer.id }, data: { status: 'CANCELED', rejectionNote: reason } });
    await this.prisma.applicationEvent.create({ data: { applicationId: offer.applicationId, userId: actor.sub, type: 'OFFER_RETURNED', note: `Proposta devolvida: ${reason}` } });
    const app = await this.application(companyId, offer.applicationId);
    await this.notifier.notify({ companyId, jobId: app.job.id, userIds: [offer.createdById], title: `Proposta devolvida: ${app.candidate.name}`, lines: [`A proposta de ${app.candidate.name} voltou para ajuste.`, `Comentário: ${reason}`], kind: 'OFFER_RETURNED', roles: [], cta: 'Ajustar proposta' });
    return { id: offer.id, status: 'CANCELED' };
  }

  async send(companyId: string, actor: Actor, offerId: string) {
    const offer = await this.offer(companyId, offerId);
    if (offer.status !== 'APPROVED') throw new BadRequestException(offer.status === 'PENDING_APPROVAL' ? 'A proposta ainda precisa ser aprovada.' : 'Esta proposta não pode ser enviada.');
    const app = await this.application(companyId, offer.applicationId);
    if (!app.candidate.email) throw new BadRequestException('O candidato não tem e-mail.');
    const expiresAt = offer.expiresAt && offer.expiresAt.getTime() > Date.now() ? offer.expiresAt : new Date(Date.now() + 7 * 86_400_000);
    const result = await this.mail.send(app.candidate.email, jobOfferEmail({ name: app.candidate.name, company: app.job.company.name, positionTitle: offer.positionTitle, url: `${appBase()}/carreiras/proposta/${offer.token}`, expires: formatInterviewDate(expiresAt).long, message: offer.message }));
    if (!result.sent) throw new BadRequestException('O e-mail da proposta não saiu. Confira o envio de e-mails e tente de novo.');
    await this.prisma.jobOffer.update({ where: { id: offer.id }, data: { status: 'SENT', sentAt: new Date(), expiresAt } });
    await this.prisma.applicationEvent.create({ data: { applicationId: offer.applicationId, userId: actor.sub, type: 'OFFER_SENT', note: 'Proposta enviada ao candidato' } });
    await this.moveToOfferStage(companyId, actor.sub, offer.applicationId);
    return { id: offer.id, status: 'SENT' };
  }

  async cancel(companyId: string, actor: Actor, offerId: string) {
    const offer = await this.offer(companyId, offerId);
    if (OFFER_FINAL.includes(offer.status)) throw new BadRequestException('Esta proposta já foi encerrada.');
    await this.prisma.jobOffer.update({ where: { id: offer.id }, data: { status: 'CANCELED' } });
    await this.prisma.applicationEvent.create({ data: { applicationId: offer.applicationId, userId: actor.sub, type: 'OFFER_CANCELED', note: 'Proposta cancelada' } });
    return { id: offer.id, status: 'CANCELED' };
  }

  private async moveToOfferStage(companyId: string, userId: string, applicationId: string) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, companyId }, select: { status: true, stage: { select: { pipelineId: true } }, job: { select: { pipelineId: true } } } });
    if (!app || !['APPLIED', 'SCREENING', 'INTERVIEW'].includes(app.status)) return;
    const pipelineId = app.stage?.pipelineId ?? app.job.pipelineId ?? (await this.prisma.hiringPipeline.findFirst({ where: { companyId, isDefault: true }, select: { id: true } }))?.id;
    const stage = pipelineId ? await this.prisma.pipelineStage.findFirst({ where: { pipelineId, kind: 'OFFER' }, orderBy: { position: 'asc' } }) : null;
    if (stage) await this.recruitment.moveApplication(companyId, userId, applicationId, { stageId: stage.id, note: 'Proposta enviada' });
  }

  // ---------- pagina publica do candidato ----------
  private async byToken(token: string) {
    if (!isPublicToken(token)) throw new NotFoundException('Proposta não encontrada.');
    const offer = await this.prisma.jobOffer.findUnique({ where: { token } });
    if (!offer || !['SENT', 'ACCEPTED', 'DECLINED', 'CANCELED', 'EXPIRED'].includes(offer.status) || !offer.sentAt) throw new NotFoundException('Proposta não encontrada.');
    const app = await this.application(offer.companyId, offer.applicationId);
    if (app.anonymizedAt) throw new NotFoundException('Proposta não encontrada.');
    return { offer, app };
  }

  async publicOffer(token: string) {
    const { offer, app } = await this.byToken(token);
    if (!offer.viewedAt) await this.prisma.jobOffer.update({ where: { id: offer.id }, data: { viewedAt: new Date() } });
    const expired = offer.status === 'SENT' && offer.expiresAt !== null && offer.expiresAt.getTime() < Date.now();
    return {
      candidate: firstName(app.candidate.name), company: app.job.company.name, positionTitle: offer.positionTitle,
      contractType: CONTRACT_LABEL[offer.contractType] ?? offer.contractType, salary: offer.salary ? Number(offer.salary) : null,
      startDate: offer.startDate, workSchedule: offer.workSchedule, workMode: offer.workMode, benefits: offer.benefits, message: offer.message,
      expiresAt: offer.expiresAt, status: expired ? 'EXPIRED' : offer.status, respondedAt: offer.respondedAt,
    };
  }

  async respond(token: string, input: { accept: boolean; reason?: string }) {
    const { offer, app } = await this.byToken(token);
    if (offer.status !== 'SENT') throw new GoneException('Esta proposta já foi respondida ou cancelada.');
    if (offer.expiresAt && offer.expiresAt.getTime() < Date.now()) throw new GoneException('O prazo desta proposta terminou. Fale com a empresa.');
    if (['REJECTED', 'HIRED'].includes(app.status)) throw new GoneException('Este processo seletivo já foi encerrado.');
    const reason = String(input.reason ?? '').trim().slice(0, 1000) || null;
    const claimed = await this.prisma.jobOffer.updateMany({ where: { id: offer.id, status: 'SENT' }, data: { status: input.accept ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date(), declineReason: input.accept ? null : reason } });
    if (!claimed.count) throw new GoneException('Esta proposta já foi respondida.');
    await this.prisma.applicationEvent.create({ data: { applicationId: offer.applicationId, type: input.accept ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED', note: input.accept ? 'Candidato aceitou a proposta' : `Candidato recusou a proposta${reason ? `: ${reason}` : ''}` } });
    await this.notifier.notify({
      companyId: offer.companyId, jobId: app.job.id, userIds: [offer.createdById, offer.approvedById],
      title: input.accept ? `${app.candidate.name} aceitou a proposta!` : `${app.candidate.name} recusou a proposta`,
      lines: input.accept
        ? [`${app.candidate.name} aceitou a proposta para ${offer.positionTitle}.`, 'Próximo passo: na ficha do candidato, clique em Contratar para iniciar a admissão (documentos e ASO).']
        : [`${app.candidate.name} recusou a proposta para ${offer.positionTitle}.`, reason ? `Motivo: ${reason}` : 'Sem motivo informado.'],
      priority: 'HIGH', kind: input.accept ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED', cta: 'Abrir a vaga',
    });
    return this.publicOffer(token);
  }
}
