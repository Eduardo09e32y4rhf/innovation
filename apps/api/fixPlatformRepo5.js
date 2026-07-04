const fs = require('fs');
const file = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/platform/platform.repository.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `      isActive: c.isActive,
      status: c.status,
      suspensionReason: c.suspensionReason,
      subscriptionStartedAt: c.subscriptionStartedAt,
      createdAt: c.createdAt,`;
const replace1 = `      isActive: c.isActive,
      status: c.status,
      suspensionReason: c.suspensionReason,
      subscriptionStartedAt: c.subscriptionStartedAt,
      plan: c.plan,
      billingStatus: c.billingStatus,
      trialEndsAt: c.trialEndsAt,
      createdAt: c.createdAt,`;

const target2 = `  createCompanyWithAdmin(params: {
    name: string;
    document?: string | null;
    maxUsers: number;
    maxEmployees: number;
    adminName: string;
    adminEmail: string;
    adminPasswordHash: string;
    commercialOwnerId?: string | null;
  }) {
    return this.prisma.$transaction(async (tx: any) => {
      const company = await tx.company.create({
        data: {
          name: params.name,
          document: params.document ?? null,
          maxUsers: params.maxUsers,
          maxEmployees: params.maxEmployees,
          commercialOwnerId: params.commercialOwnerId ?? null,
          status: 'ACTIVE',
          isActive: true,
        },
      });`;
const replace2 = `  createCompanyWithAdmin(params: {
    name: string;
    document?: string | null;
    maxUsers: number;
    maxEmployees: number;
    adminName: string;
    adminEmail: string;
    adminPasswordHash: string;
    commercialOwnerId?: string | null;
    plan?: 'FREE' | 'STARTER' | 'PRO';
    billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
    trialEndsAt?: Date;
  }) {
    return this.prisma.$transaction(async (tx: any) => {
      const company = await tx.company.create({
        data: {
          name: params.name,
          document: params.document ?? null,
          maxUsers: params.maxUsers,
          maxEmployees: params.maxEmployees,
          commercialOwnerId: params.commercialOwnerId ?? null,
          status: 'ACTIVE',
          isActive: true,
          plan: params.plan ?? 'FREE',
          billingStatus: params.billingStatus ?? 'TRIAL',
          trialEndsAt: params.trialEndsAt,
        },
      });`;

code = code.replace(target1, replace1).replace(target2, replace2);
fs.writeFileSync(file, code);
console.log('Fixed platform.repository.ts for real');
