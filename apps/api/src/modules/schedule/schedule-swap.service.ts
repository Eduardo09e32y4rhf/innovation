import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { SwapRequestDto, ApproveSwapDto } from './dto/swap-request.dto';

const CAN_APPROVE = ['ADMIN', 'RH', 'GESTOR', 'DEV'];

@Injectable()
export class ScheduleSwapService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Criar solicitação de troca ──────────────────────────────────────────

  async createSwapRequest(companyId: string, actor: JwtUser, dto: SwapRequestDto) {
    const isManagerOrHr = CAN_APPROVE.includes(actor.role);
    let employee;

    if (isManagerOrHr && dto.employeeId) {
      employee = await this.prisma.employee.findFirst({
        where: { companyId, id: dto.employeeId },
      });
    } else {
      employee = await this.prisma.employee.findFirst({
        where: { companyId, userId: actor.sub },
      });
    }

    if (!employee) throw new NotFoundException('Funcionário não encontrado.');

    // Determina para quem notificar
    const notifiedUserId = await this.resolveApprover(companyId, actor, employee);

    return this.prisma.scheduleSwapRequest.create({
      data: {
        companyId,
        requesterId: employee.id,
        originalDate: new Date(dto.originalDate),
        targetDate: new Date(dto.targetDate),
        justification: dto.justification,
        notifiedUserId,
      },
    });
  }

  /**
   * Resolve quem deve aprovar:
   * - FUNCIONARIO → gestor direto (userId do manager)
   * - GESTOR → gestor do gestor
   * - RH → ADMIN da empresa
   */
  private async resolveApprover(companyId: string, actor: JwtUser, employee: any): Promise<string | null> {
    if (actor.role === 'FUNCIONARIO' || actor.role === 'GESTOR') {
      if (employee.managerId) {
        const manager = await this.prisma.employee.findFirst({
          where: { id: employee.managerId, companyId },
          include: { user: true },
        });
        return manager?.user?.id ?? null;
      }
      // Fallback: qualquer ADMIN ou RH da empresa
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

    return null; // ADMIN e DEV não precisam de aprovação
  }

  // ─── Listar solicitações ─────────────────────────────────────────────────

  async listSwapRequests(companyId: string, actor: JwtUser, status?: string) {
    // FUNCIONARIO só vê as próprias
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

    // GESTOR vê solicitações da sua equipe que estão pendentes para ele
    if (actor.role === 'GESTOR') {
      const self = await this.prisma.employee.findFirst({
        where: { companyId, userId: actor.sub },
      });
      if (!self) return [];

      const teamIds = await this.prisma.employee
        .findMany({ where: { companyId, managerId: self.id }, select: { id: true } })
        .then((r: any[]) => r.map((e: any) => e.id));

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

    // ADMIN, RH, DEV vêem tudo na empresa
    return this.prisma.scheduleSwapRequest.findMany({
      where: {
        companyId,
        ...(status ? { status: status as any } : {}),
      },
      include: { requester: { select: { id: true, name: true, department: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Aprovar/Rejeitar ────────────────────────────────────────────────────

  async approveOrReject(companyId: string, actor: JwtUser, id: string, dto: ApproveSwapDto) {
    if (!CAN_APPROVE.includes(actor.role)) {
      throw new ForbiddenException('Apenas Gestores, RH, Admin ou Dev podem aprovar trocas.');
    }

    const req = await this.prisma.scheduleSwapRequest.findFirst({
      where: { id, companyId },
    });
    if (!req) throw new NotFoundException('Solicitação não encontrada.');
    if (req.status !== 'PENDING') {
      throw new ForbiddenException('Esta solicitação já foi processada.');
    }

    return this.prisma.scheduleSwapRequest.update({
      where: { id },
      data: {
        status: dto.action,
        approvedByUserId: actor.sub,
        approvedAt: new Date(),
        rejectionReason: dto.action === 'REJECTED' ? dto.rejectionReason : null,
      },
    });
  }

  // ─── Cancelar (pelo próprio solicitante) ────────────────────────────────

  async cancelSwapRequest(companyId: string, actor: JwtUser, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, userId: actor.sub },
    });

    const req = await this.prisma.scheduleSwapRequest.findFirst({
      where: { id, companyId },
    });
    if (!req) throw new NotFoundException('Solicitação não encontrada.');

    const isOwner = employee && req.requesterId === employee.id;
    const isPrivileged = CAN_APPROVE.includes(actor.role);

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('Você não pode cancelar esta solicitação.');
    }
    if (req.status !== 'PENDING') {
      throw new ForbiddenException('Só é possível cancelar solicitações pendentes.');
    }

    return this.prisma.scheduleSwapRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
