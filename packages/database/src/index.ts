export interface DatabaseHealth {
  connected: boolean;
}

export function getDatabaseHealth(): DatabaseHealth {
  return { connected: false };
}

export { prisma } from './prisma';
export { PrismaClient } from '@prisma/client';
