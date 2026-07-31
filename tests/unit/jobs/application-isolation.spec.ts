import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { ApplyJobDto } from '../../../apps/api/src/modules/jobs/dto/apply-job.dto';
import { JobsRepository } from '../../../apps/api/src/modules/jobs/jobs.repository';

describe('Public application isolation', () => {
  it('requires explicit consent', async () => {
    const withoutConsent = plainToInstance(ApplyJobDto, {
      name: 'Pessoa Candidata',
      email: 'candidate@example.test',
      phone: '11999999999',
    });
    const refusedConsent = plainToInstance(ApplyJobDto, {
      name: 'Pessoa Candidata',
      email: 'candidate@example.test',
      phone: '11999999999',
      consent: false,
    });
    const acceptedConsent = plainToInstance(ApplyJobDto, {
      name: 'Pessoa Candidata',
      email: 'candidate@example.test',
      phone: '11999999999',
      consent: true,
    });

    expect(await validate(withoutConsent)).not.toHaveLength(0);
    expect(await validate(refusedConsent)).not.toHaveLength(0);
    expect(await validate(acceptedConsent)).toHaveLength(0);
  });

  it('stores resume, screening and consent on Application without overwriting Candidate history', async () => {
    const candidate = {
      id: 'candidate-1',
      companyId: 'company-a',
      name: 'Nome Anterior',
      email: 'candidate@example.test',
      phone: '11000000000',
      linkedinUrl: 'https://linkedin.example/old',
      status: 'SCREENING',
    };
    let candidateUpdate: Record<string, unknown> | undefined;
    let applicationCreate: Record<string, unknown> | undefined;

    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      candidate: {
        findFirst: vi.fn().mockResolvedValue(candidate),
        update: vi.fn().mockImplementation(async ({ data }) => {
          candidateUpdate = data;
          return { ...candidate, ...data };
        }),
      },
      application: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }) => {
          applicationCreate = data;
          return { id: 'application-2', ...data };
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation((operation) => operation(tx)),
    };
    const repository = new JobsRepository(prisma as never);

    await repository.apply(
      'company-a',
      'job-2',
      {
        name: 'Nome Atual',
        email: 'candidate@example.test',
        phone: '11999999999',
        linkedinUrl: 'https://linkedin.example/new',
        coverLetter: 'Carta exclusiva da vaga 2',
        aiScore: 88,
        aiSummary: 'Triagem exclusiva da vaga 2',
        consent: true,
        source: 'CAREERS_PORTAL',
      },
      {
        key: 'company-a/applications/application-2/resume.pdf',
        name: 'curriculo-vaga-2.pdf',
        type: 'application/pdf',
        size: 2048,
      },
    );

    expect(candidateUpdate).toEqual({
      name: 'Nome Atual',
      phone: '11999999999',
      linkedinUrl: 'https://linkedin.example/new',
      status: 'NEW',
    });
    expect(candidateUpdate).not.toHaveProperty('coverLetter');
    expect(candidateUpdate).not.toHaveProperty('resumeUrl');
    expect(candidateUpdate).not.toHaveProperty('aiScore');
    expect(candidateUpdate).not.toHaveProperty('aiSummary');
    expect(candidateUpdate).not.toHaveProperty('consentGiven');

    expect(applicationCreate).toEqual(expect.objectContaining({
      companyId: 'company-a',
      candidateId: candidate.id,
      jobId: 'job-2',
      coverLetter: 'Carta exclusiva da vaga 2',
      resumeUrl: 'company-a/applications/application-2/resume.pdf',
      resumeName: 'curriculo-vaga-2.pdf',
      aiScore: 88,
      aiSummary: 'Triagem exclusiva da vaga 2',
      consentGiven: true,
      source: 'CAREERS_PORTAL',
    }));
    expect(applicationCreate?.consentAt).toBeInstanceOf(Date);
  });

  it('uses company, candidate and job together when checking duplicate applications', async () => {
    const duplicate = { id: 'application-existing', companyId: 'company-a', jobId: 'job-1' };
    const findDuplicate = vi.fn().mockResolvedValue(duplicate);
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      candidate: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'candidate-1',
          companyId: 'company-a',
          email: 'candidate@example.test',
        }),
      },
      application: {
        findFirst: findDuplicate,
        create: vi.fn(),
      },
    };
    const repository = new JobsRepository({
      $transaction: (operation: (client: typeof tx) => unknown) => operation(tx),
    } as never);

    const result = await repository.apply(
      'company-a',
      'job-1',
      { email: 'candidate@example.test' },
      { key: 'unused', name: 'unused.pdf', type: 'application/pdf', size: 1 },
    );

    expect(findDuplicate).toHaveBeenCalledWith({
      where: {
        companyId: 'company-a',
        candidateId: 'candidate-1',
        jobId: 'job-1',
      },
    });
    expect(result).toEqual({ duplicate: true, application: duplicate });
    expect(tx.application.create).not.toHaveBeenCalled();
  });
});
