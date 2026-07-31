import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const contractInclude = {
  company: { select: { id: true, name: true, document: true } },
  plan: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ManualContractsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId?: string) {
    return this.prisma.manualContract.findMany({
      where: companyId ? { companyId } : undefined,
      include: contractInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.manualContract.findUnique({
      where: { id },
      include: contractInclude,
    });
  }

  history(id: string) {
    return this.prisma.auditLog.findMany({
      where: { entity: 'ManualContract', entityId: id },
      select: {
        id: true,
        action: true,
        userId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findCompany(id: string) {
    return this.prisma.company.findUnique({ where: { id }, select: { id: true } });
  }

  findPlan(id: string) {
    return this.prisma.platformPlan.findUnique({ where: { id }, select: { id: true } });
  }

  createWithActivation(data: any, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.manualContract.create({
        data: { ...data, status: data.status || 'DRAFT', createdBy: actorId },
        include: contractInclude,
      });

      if (contract.status === 'ACTIVE') {
        await this.syncOperationalState(tx, contract);
      }
      await tx.auditLog.create({
        data: {
          companyId: contract.companyId,
          userId: actorId,
          action: 'MANUAL_CONTRACT_CREATED',
          entity: 'ManualContract',
          entityId: contract.id,
          metadata: {
            status: contract.status,
            snapshot: this.snapshot(contract),
          },
        },
      });
      return contract;
    });
  }

  updateDetails(id: string, data: any, actorId: string, before: any) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.manualContract.update({
        where: { id },
        data,
        include: contractInclude,
      });
      const changedFields = Object.keys(data).filter((key) => {
        const previous = before[key] instanceof Date ? before[key].toISOString() : String(before[key] ?? '');
        const next = data[key] instanceof Date ? data[key].toISOString() : String(data[key] ?? '');
        return previous !== next;
      });

      await tx.auditLog.create({
        data: {
          companyId: contract.companyId,
          userId: actorId,
          action: 'MANUAL_CONTRACT_UPDATED',
          entity: 'ManualContract',
          entityId: contract.id,
          metadata: {
            status: contract.status,
            changedFields,
            before: this.snapshot(before),
            after: this.snapshot(contract),
          },
        },
      });
      return contract;
    });
  }

  async transition(
    id: string,
    expectedStatus: string,
    nextStatus: string,
    actorId: string,
    reason: string,
    endsAt?: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.manualContract.updateMany({
        where: { id, status: expectedStatus },
        data: {
          status: nextStatus,
          ...(endsAt ? { endsAt } : {}),
        },
      });
      if (result.count !== 1) return null;

      const contract = await tx.manualContract.findUniqueOrThrow({
        where: { id },
        include: contractInclude,
      });
      await this.syncOperationalState(tx, contract);
      await tx.auditLog.create({
        data: {
          companyId: contract.companyId,
          userId: actorId,
          action: 'MANUAL_CONTRACT_STATUS_CHANGED',
          entity: 'ManualContract',
          entityId: contract.id,
          metadata: {
            from: expectedStatus,
            to: nextStatus,
            reason,
            endsAt: contract.endsAt?.toISOString() || null,
            snapshot: this.snapshot(contract),
          },
        },
      });
      return contract;
    });
  }

  recordEvent(contract: any, actorId: string, action: string, metadata: Record<string, unknown>) {
    return this.prisma.auditLog.create({
      data: {
        companyId: contract.companyId,
        userId: actorId,
        action,
        entity: 'ManualContract',
        entityId: contract.id,
        metadata: metadata as any,
      },
    });
  }

  delete(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.manualContract.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          companyId: contract.companyId,
          userId: actorId,
          action: 'MANUAL_CONTRACT_DELETED',
          entity: 'ManualContract',
          entityId: contract.id,
          metadata: {
            status: contract.status,
            snapshot: this.snapshot(contract),
          },
        },
      });
      return contract;
    });
  }

  private async syncOperationalState(tx: any, contract: any) {
    if (contract.status === 'ACTIVE') {
      await tx.companySubscription.upsert({
        where: { companyId: contract.companyId },
        create: {
          companyId: contract.companyId,
          planId: contract.planId,
          status: 'MANUAL_CONTRACT',
          seatQuantity: contract.seatQuantity,
        },
        update: {
          planId: contract.planId,
          status: 'MANUAL_CONTRACT',
          seatQuantity: contract.seatQuantity,
        },
      });
      await tx.company.update({
        where: { id: contract.companyId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          billingStatus: 'ACTIVE',
          suspensionReason: null,
          platformPlanId: contract.planId,
          maxUsers: contract.seatQuantity,
        },
      });
      return;
    }

    if (contract.status === 'SUSPENDED') {
      await tx.companySubscription.updateMany({
        where: { companyId: contract.companyId, status: 'MANUAL_CONTRACT' },
        data: { status: 'SUSPENDED' },
      });
      return;
    }

    if (['ENDED', 'CANCELED', 'EXPIRED'].includes(contract.status)) {
      const otherActiveContracts = await tx.manualContract.count({
        where: {
          companyId: contract.companyId,
          id: { not: contract.id },
          status: { in: ['ACTIVE', 'TERMINATION_SCHEDULED'] },
        },
      });
      if (otherActiveContracts === 0) {
        await tx.companySubscription.updateMany({
          where: {
            companyId: contract.companyId,
            status: { in: ['MANUAL_CONTRACT', 'SUSPENDED'] },
          },
          data: { status: contract.status === 'CANCELED' ? 'CANCELED' : 'ENDED' },
        });
      }
    }
  }

  private snapshot(contract: any) {
    return {
      companyId: contract.companyId,
      planId: contract.planId ?? null,
      seatQuantity: contract.seatQuantity,
      agreedAmount: Number(contract.agreedAmount),
      startsAt: contract.startsAt instanceof Date ? contract.startsAt.toISOString() : contract.startsAt,
      endsAt: contract.endsAt instanceof Date ? contract.endsAt.toISOString() : contract.endsAt ?? null,
      paymentMethod: contract.paymentMethod,
      externalContractNumber: contract.externalContractNumber ?? null,
      notes: contract.notes,
      documentUrl: contract.documentUrl ?? null,
      status: contract.status,
    };
  }
}
