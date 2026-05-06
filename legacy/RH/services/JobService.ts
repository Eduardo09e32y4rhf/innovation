// RH/services/JobService.ts
import { PrismaClient, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class JobService {
  /**
   * Cria uma nova vaga no sistema.
   */
  static async createJob(data: { title: string; description: string; location?: string; salaryRange?: string }) {
    return await prisma.job.create({
      data: {
        ...data,
        status: 'OPEN',
      },
    });
  }

  /**
   * Lista todas as vagas abertas.
   */
  static async getOpenJobs() {
    return await prisma.job.findMany({
      where: { status: 'OPEN' },
      include: { _count: { select: { candidates: true } } },
    });
  }

  /**
   * Obtém detalhes de uma vaga específica.
   */
  static async getJobById(id: string) {
    return await prisma.job.findUnique({
      where: { id },
      include: { candidates: true },
    });
  }
}
