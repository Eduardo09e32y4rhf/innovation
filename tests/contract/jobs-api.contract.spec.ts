import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const publicController = readFileSync(
  resolve('apps/api/src/modules/jobs/public-jobs.controller.ts'),
  'utf8',
);
const recruitmentController = readFileSync(
  resolve('apps/api/src/modules/jobs/recruitment.controller.ts'),
  'utf8',
);
const publicClient = readFileSync(
  resolve('apps/web/app/carreiras/_lib/public-jobs.ts'),
  'utf8',
);
const privateController = readFileSync(
  resolve('apps/api/src/modules/jobs/jobs.controller.ts'),
  'utf8',
);
const privateClient = readFileSync(
  resolve('apps/web/app/[tenant]/dashboard/jobs/jobs-api.ts'),
  'utf8',
);

describe('Jobs API contract', () => {
  it('keeps the public company listing route aligned', () => {
    expect(publicController).toContain("@Get('company/:companyKey')");
    expect(publicClient).toContain('/public/jobs/company/${encodeURIComponent(companyId)}');
  });

  it('keeps public detail and application routes aligned', () => {
    expect(publicController).toContain("@Get(':jobId')");
    expect(publicController).toContain("@Post(':jobId/apply')");
    expect(publicClient).toContain('/public/jobs/${encodeURIComponent(jobId)}');
  });

  it('keeps authenticated ATS routes aligned', () => {
    expect(recruitmentController).toContain("@Get(':jobId/applications')");
    expect(recruitmentController).toContain("@Patch('applications/:id/stage')");
    expect(recruitmentController).toContain("@Post('applications/bulk')");
    expect(recruitmentController).toContain("@Get('pipeline')");
    expect(privateController).toContain("@Post('applications/:id/hire')");
    expect(privateController).toContain("@Get('applications/:id/resume')");
    expect(privateClient).toContain('/jobs/applications/${enc(applicationId)}/hire');
    expect(privateClient).toContain('/jobs/applications/${enc(id)}/stage');
    expect(privateClient).toContain('/jobs/${enc(jobId)}/applications${query(filters)}');
  });

  it('registers static recruitment routes before the /jobs/:id controller', () => {
    const module = readFileSync(resolve('apps/api/src/modules/jobs/jobs.module.ts'), 'utf8');
    expect(module.indexOf('RecruitmentController, JobsController')).toBeGreaterThan(-1);
  });

  it('does not ship AI scoring in the public application flow', () => {
    const service = readFileSync(resolve('apps/api/src/modules/jobs/jobs.service.ts'), 'utf8');
    expect(service).not.toMatch(/aiScore|aiSummary|screen\(/);
  });
});
