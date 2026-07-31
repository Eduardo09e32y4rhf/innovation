import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { ApproveSwapDto, SwapRequestDto } from './dto/swap-request.dto';

const CAN_APPROVE = ['ADMIN', 'RH', 'GESTOR', 'DEV'];

@Injectable()
export class ScheduleSwapService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertDatesAreOpen(
    client: any,
    companyId: string,
    employeeId: string,
    dates: Date[],
  ) {
    const start = new Date(Math.min(...dates.map((date) => date.getTime())));
    const end = new Date(Math.max(...dates.map((date) => date.getTime())));
    const closing = await client.timeClosing.findFirst({
      where: {
        companyId,
        employeeId,
        status: { not: 'DRAFT' },
        periodStart: { lte: end },
        periodEnd: { gte: start },
      },
      select: { id: true, status: true, periodStart: true, periodEnd: true },
    });
    if (closing) {
      throw new BadRequestException(
        'A troca intercepta um periodo de ponto em revisao, aprovado ou fechado. Reabra o periodo antes de alterar a escala.',
      );
    }
  }

  async createSwapRequest(companyId: string, actor: JwtUser, dto: SwapRequestDto) {
    const isManagerOrHr = CAN_APPROVE.includes(actor.role);
    const employee =
      isManagerOrHr && dto.employeeId
        ? await this.prisma.employee.findFirst({ where: { companyId, id: dto.employeeId } })
        : await this.prisma.employee.findFirst({ where: { companyId, userId: actor.sub } });

    if (!employee) throw new NotFoundException('Funcionario nao encontrado.');

    const originalDate = new Date(dto.originalDate);
    const targetDate = new Date(dto.targetDate);
    await this.assertDatesAreOpen(this.prisma, companyId, employee.id, [originalDate, targetDate]);
    const notifiedUserId = await this.resolveApprover(companyId, actor, employee);

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.scheduleSwapRequest.create({
        data: {
          companyId,
          requesterId: employee.id,
          originalDate,
          targetDate,
          justification: dto.justification,
          notifiedUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.sub,
          action: 'SCHEDULE_SWAP_REQUESTED',
          entity: 'ScheduleSwapRequest',
          entityId: request.id,
          metadata: {
            employeeId: employee.id,
            originalDate: dto.originalDate.slice(0, 10),
            targetDate: dto.targetDate.slice(0, 10),
            justification: dto.justification ?? null,
            notifiedUserId,
          },
        },
      });
      return request;
    });
  }

  private async resolveApprover(
    companyId: string,
    actor: JwtUser,
    employee: any,
  ): Promise<string | null> {
    if (actor.role === 'FUNCIONARIO' || actor.role === 'GESTOR') {
      if (employee.managerId) {
        const manager = await this.prisma.employee.findFirst({
          where: { id: employee.managerId, companyId },
          include: { user: true },
        });
        return manager?.user?.id ?? null;
      }
      const admin = await this.prisma.user.findFirst({
        where: { companyId, role: { in: ['ADMIN', 'RH'] }, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      return admin?.id ?? null;
    }
    if (actor.role === 'RH') {
      const admin = await this.prisma.user.findFirst({
        where: { companyId, role: 'ADMIN', isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      return admin?.id ?? null;
    }
    return null;
  }

  async listSwapRequests(companyId: string, actor: JwtUser, status?: string) {
    if (actor.role === 'FUNCIONARIO') {
      const employee = await this.prisma.employee.findFirst({
        where: { companyId, userId: actor.sub },
      });
      if (!employee) return [];
      return this.prisma.scheduleSwapRequest.findMany({
        where: {
          companyId,
          requesterId: employee.id,
          ...(status ? { status: status as any } : {}),
        },
        include: { requester: { select: { id: true, name: true, department: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (actor.role === 'GESTOR') {
      const self = await this.prisma.employee.findFirst({
        where: { companyId, userId: actor.sub },
      });
      if (!self) return [];
      const teamIds = await this.prisma.employee
        .findMany({ where: { companyId, managerId: self.id }, select: { id: true } })
        .then((records) => records.map((employee) => employee.id));
      return this.prisma.scheduleSwapRequest.findMany({
        where: {
          companyId,
          requesterId: { in: teamIds },
          ...(status ? { status: status as any } : {}),
        },
        include: { requester: { select: { id: true, name: true, department: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.scheduleSwapRequest.findMany({
      where: {
        companyId,
        ...(status ? { status: status as any } : {}),
      },
      include: { requester: { select: { id: true, name: true, department: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveOrReject(companyId: string, actor: JwtUser, id: string, dto: ApproveSwapDto) {
    if (!CAN_APPROVE.includes(actor.role)) {
      throw new ForbiddenException('Apenas Gestores, RH, Admin ou Dev podem aprovar trocas.');
    }
    const request = await this.prisma.scheduleSwapRequest.findFirst({
      where: { id, companyId },
    });
    if (!request) throw new NotFoundException('Solicitacao nao encontrada.');
    if (request.status !== 'PENDING') {
      throw new ForbiddenException('Esta solicitacao ja foi processada.');
    }
    if (dto.action === 'REJECTED' && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('Informe o motivo da rejeicao.');
    }
    if (dto.action === 'APPROVED') {
      await this.assertDatesAreOpen(this.prisma, companyId, request.requesterId, [
        request.originalDate,
        request.targetDate,
      ]);
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.scheduleSwapRequest.updateMany({
        where: { id, companyId, status: 'PENDING' },
        data: {
          status: dto.action,
          approvedByUserId: actor.sub,
          approvedAt: new Date(),
          rejectionReason: dto.action === 'REJECTED' ? dto.rejectionReason?.trim() : null,
        },
      });
      if (result.count !== 1) {
        throw new BadRequestException('A solicitacao foi processada por outro usuario.');
      }
      const updated = await tx.scheduleSwapRequest.findUniqueOrThrow({ where: { id } });
      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.sub,
          action: dto.action === 'APPROVED' ? 'SCHEDULE_SWAP_APPROVED' : 'SCHEDULE_SWAP_REJECTED',
          entity: 'ScheduleSwapRequest',
          entityId: id,
          metadata: {
            employeeId: request.requesterId,
            from: 'PENDING',
            to: dto.action,
            rejectionReason: dto.action === 'REJECTED' ? dto.rejectionReason?.trim() : null,
          },
        },
      });
      return updated;
    });
  }

  async cancelSwapRequest(companyId: string, actor: JwtUser, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, userId: actor.sub },
    });
    const request = await this.prisma.scheduleSwapRequest.findFirst({
      where: { id, companyId },
    });
    if (!request) throw new NotFoundException('Solicitacao nao encontrada.');

    const isOwner = employee && request.requesterId === employee.id;
    if (!isOwner && !CAN_APPROVE.includes(actor.role)) {
      throw new ForbiddenException('Voce nao pode cancelar esta solicitacao.');
    }
    if (request.status !== 'PENDING') {
      throw new ForbiddenException('So e possivel cancelar solicitacoes pendentes.');
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.scheduleSwapRequest.updateMany({
        where: { id, companyId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (result.count !== 1) {
        throw new BadRequestException('A solicitacao foi processada por outro usuario.');
      }
      const updated = await tx.scheduleSwapRequest.findUniqueOrThrow({ where: { id } });
      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.sub,
          action: 'SCHEDULE_SWAP_CANCELLED',
          entity: 'ScheduleSwapRequest',
          entityId: id,
          metadata: {
            employeeId: request.requesterId,
            from: 'PENDING',
            to: 'CANCELLED',
          },
        },
      });
      return updated;
    });
  }
}
