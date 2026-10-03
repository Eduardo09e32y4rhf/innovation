import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { JwtUser } from '../../../common/types/auth.types';
import { GeofenceDto, PunchPolicyDto } from './policy.dto';

export const DEFAULT_PUNCH_POLICY = {
  requireLocation: true,
  fencePolicy: 'FLAG' as 'BLOCK' | 'FLAG' | 'OFF',
  maxAccuracyMeters: 150,
  minIntervalSeconds: 60,
  maxPunchesPerDay: 4,
  earlyWindowMinutes: 120,
  lateWindowMinutes: 360,
  adjustmentDeadlineDays: 5,
  requireJustificationOutside: true,
  maxSpeedKmh: 250,
};

export type PunchPolicy = typeof DEFAULT_PUNCH_POLICY;

@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(companyId: string): Promise<PunchPolicy & { configured: boolean }> {
    const saved = await this.prisma.timePunchPolicy.findUnique({ where: { companyId } });
    if (!saved) return { ...DEFAULT_PUNCH_POLICY, configured: false };
    const { id, companyId: _c, updatedByUserId, updatedAt, ...values } = saved;
    return { ...(values as unknown as PunchPolicy), fencePolicy: values.fencePolicy as PunchPolicy['fencePolicy'], configured: true };
  }

  async savePolicy(actor: JwtUser, dto: PunchPolicyDto) {
    const data = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
    await this.prisma.timePunchPolicy.upsert({
      where: { companyId: actor.companyId },
      create: { companyId: actor.companyId, ...data, updatedByUserId: actor.sub },
      update: { ...data, updatedByUserId: actor.sub },
    });
    await this.prisma.auditLog.create({
      data: { companyId: actor.companyId, userId: actor.sub, action: 'PUNCH_POLICY_UPDATED', entity: 'TimePunchPolicy', metadata: data as any },
    });
    return this.getPolicy(actor.companyId);
  }

  listGeofences(companyId: string) {
    return this.prisma.geofence.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  }

  async createGeofence(actor: JwtUser, dto: GeofenceDto) {
    const fence = await this.prisma.geofence.create({
      data: { companyId: actor.companyId, name: dto.name.trim(), latitude: dto.latitude, longitude: dto.longitude, radiusMeters: dto.radiusMeters ?? 150, active: dto.active ?? true },
    });
    await this.prisma.auditLog.create({ data: { companyId: actor.companyId, userId: actor.sub, action: 'GEOFENCE_CREATED', entity: 'Geofence', entityId: fence.id } });
    return fence;
  }

  async updateGeofence(actor: JwtUser, id: string, dto: GeofenceDto) {
    const result = await this.prisma.geofence.updateMany({
      where: { id, companyId: actor.companyId },
      data: { name: dto.name.trim(), latitude: dto.latitude, longitude: dto.longitude, radiusMeters: dto.radiusMeters ?? 150, active: dto.active ?? true },
    });
    if (!result.count) throw new NotFoundException('Cerca nao encontrada.');
    await this.prisma.auditLog.create({ data: { companyId: actor.companyId, userId: actor.sub, action: 'GEOFENCE_UPDATED', entity: 'Geofence', entityId: id } });
    return this.prisma.geofence.findFirst({ where: { id, companyId: actor.companyId } });
  }

  async deleteGeofence(actor: JwtUser, id: string) {
    const result = await this.prisma.geofence.deleteMany({ where: { id, companyId: actor.companyId } });
    if (!result.count) throw new NotFoundException('Cerca nao encontrada.');
    await this.prisma.auditLog.create({ data: { companyId: actor.companyId, userId: actor.sub, action: 'GEOFENCE_DELETED', entity: 'Geofence', entityId: id } });
    return { deleted: true };
  }
}
