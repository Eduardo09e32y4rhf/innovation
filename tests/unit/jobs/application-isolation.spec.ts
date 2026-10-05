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

    const stages = [
      { id: 'stage-applied', kind: 'APPLIED', name: 'Inscritos' },
      { id: 'stage-rejected', kind: 'REJECTED', name: 'Reprovado' },
    ];
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      job: { findFirst: vi.fn().mockResolvedValue({ pipelineId: 'pipeline-1' }) },
      hiringPipeline: { findFirst: vi.fn() },
      pipelineStage: { findMany: vi.fn().mockResolvedValue(stages) },
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
        consent: true,
        source: 'CAREERS_PORTAL',
      },
      {
        key: 'company-a/applications/application-2/resume.pdf',
        name: 'curriculo-vaga-2.pdf',
        type: 'application/pdf',
        size: 2048,
      },
      {
        answers: [{ questionId: 'q1', value: 'Sim' }],
        score: 15,
        knockedOut: false,
        knockoutReason: null,
        rejectOnKnockout: false,
      },
    );

    expect(candidateUpdate).toEqual({
      name: 'Nome Atual',
      phone: '11999999999',
      linkedinUrl: 'https://linkedin.example/new',
    });
    // O resultado pertence a cada candidatura: reaplicar nao reescreve o estado consolidado do candidato.
    expect(candidateUpdate).not.toHaveProperty('status');
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
      consentGiven: true,
      source: 'CAREERS_PORTAL',
      stageId: 'stage-applied',
      score: 15,
      knockedOut: false,
    }));
    expect(applicationCreate).not.toHaveProperty('aiScore');
    expect(applicationCreate).not.toHaveProperty('aiSummary');
    expect(applicationCreate?.consentAt).toBeInstanceOf(Date);
  });

  it('moves a knocked-out candidate straight to the rejected stage when the HR rule says REJECT', async () => {
    const stages = [
      { id: 'stage-applied', kind: 'APPLIED', name: 'Inscritos' },
      { id: 'stage-rejected', kind: 'REJECTED', name: 'Reprovado' },
    ];
    let applicationCreate: Record<string, any> | undefined;
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      job: { findFirst: vi.fn().mockResolvedValue({ pipelineId: 'pipeline-1' }) },
      hiringPipeline: { findFirst: vi.fn() },
      pipelineStage: { findMany: vi.fn().mockResolvedValue(stages) },
      candidate: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'candidate-9' }),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      application: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(async ({ data }) => { applicationCreate = data; return { id: 'a-9', ...data }; }),
      },
    };
    const repository = new JobsRepository({ $transaction: (operation: (client: typeof tx) => unknown) => operation(tx) } as never);

    await repository.apply('company-a', 'job-1', { name: 'X', email: 'x@example.test', phone: '11999999999', consent: true },
      { key: 'k', name: 'k.pdf', type: 'application/pdf', size: 1 },
      { answers: [{ questionId: 'q1', value: 'Não' }], score: 0, knockedOut: true, knockoutReason: 'Resposta fora do critério', rejectOnKnockout: true });

    expect(applicationCreate).toMatchObject({ status: 'REJECTED', stageId: 'stage-rejected', knockedOut: true, rejectionReason: 'Resposta fora do critério' });
    expect(tx.candidate.updateMany).toHaveBeenCalledWith({ where: { id: 'candidate-9', status: { not: 'HIRED' } }, data: { status: 'REJECTED' } });
  });

  it('uses company, candidate and job together when checking duplicate applications', async () => {
    const duplicate = { id: 'application-existing', companyId: 'company-a', jobId: 'job-1' };
    const findDuplicate = vi.fn().mockResolvedValue(duplicate);
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      job: { findFirst: vi.fn().mockResolvedValue({ pipelineId: 'pipeline-1' }) },
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
