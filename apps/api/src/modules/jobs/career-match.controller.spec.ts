import { expect, it, vi } from 'vitest';
vi.mock('../../database/prisma.service', () => ({ PrismaService: class {} }));
vi.mock('./jobs.service', () => ({ JobsService: class {} }));
import { CareerMatchController } from './career-match.controller';

it('carrega critérios em lote sem consultar cada vaga novamente', async () => {
  const jobs = { allPublicJobs: vi.fn(async () => ({ jobs: Array.from({ length: 100 }, (_, index) => ({ id: `job-${index}`, title: 'Vendedor', requirements: [], workMode: 'REMOTE' })) })), publicJobById: vi.fn() };
  const prisma = { jobCriterion: { findMany: vi.fn(async () => []) } };
  const controller = new CareerMatchController(prisma as any, jobs as any);
  const result = await controller.list({ candidateAccount: { name: 'Ana', skills: ['Vendas'], profession: 'Vendedor', experience: [] } }, '1');
  expect(result.jobs).toHaveLength(100);
  expect(prisma.jobCriterion.findMany).toHaveBeenCalledTimes(1);
  expect(jobs.publicJobById).not.toHaveBeenCalled();
});
