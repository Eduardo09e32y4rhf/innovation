import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ManualContractsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.manualContract.findMany({
      include: { company: { select: { id: true, name: true, document: true } }, plan: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.manualContract.findUnique({ where: { id } });
  }

  findCompany(id: string) {
    return this.prisma.company.findUnique({ where: { id }, select: { id: true } });
  }

  findPlan(id: string) {
    return this.prisma.platformPlan.findUnique({ where: { id }, select: { id: true } });
  }

  createWithActivation(data: any, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.manualContract.create({ data: { ...data, createdBy: actorId } });
      await tx.companySubscription.upsert({
        where: { companyId: data.companyId },
        create: { companyId: data.companyId, planId: data.planId, status: 'MANUAL_CONTRACT', seatQuantity: data.seatQuantity },
        update: { planId: data.planId, status: 'MANUAL_CONTRACT', seatQuantity: data.seatQuantity },
      });
      await tx.company.update({
        where: { id: data.companyId },
        data: { status: 'ACTIVE', isActive: true, billingStatus: 'ACTIVE', suspensionReason: null, platformPlanId: data.planId, maxUsers: data.seatQuantity },
      });
      await tx.auditLog.create({
        data: { companyId: data.companyId, userId: actorId, action: 'MANUAL_CONTRACT_CREATED', entity: 'ManualContract', entityId: contract.id, metadata: { notes: data.notes, agreedAmount: data.agreedAmount, seatQuantity: data.seatQuantity } },
      });
      return contract;
    });
  }

  update(id: string, data: any, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.manualContract.update({ where: { id }, data });
      if (contract.status === 'ACTIVE') {
        await tx.companySubscription.upsert({
          where: { companyId: contract.companyId },
          create: { companyId: contract.companyId, planId: contract.planId, status: 'MANUAL_CONTRACT', seatQuantity: contract.seatQuantity },
          update: { planId: contract.planId, status: 'MANUAL_CONTRACT', seatQuantity: contract.seatQuantity },
        });
      }
      await tx.auditLog.create({
        data: { companyId: contract.companyId, userId: actorId, action: 'MANUAL_CONTRACT_UPDATED', entity: 'ManualContract', entityId: contract.id, metadata: { status: contract.status } },
      });
      return contract;
    });
  }
}
