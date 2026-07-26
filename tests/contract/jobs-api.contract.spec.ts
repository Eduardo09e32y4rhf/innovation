import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const publicController = readFileSync(
  resolve('apps/api/src/modules/jobs/public-jobs.controller.ts'),
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
    expect(privateController).toContain("@Get(':id/applications')");
    expect(privateController).toContain("@Patch('applications/:id/status')");
    expect(privateController).toContain("@Post('applications/:id/hire')");
    expect(privateController).toContain("@Get('applications/:id/resume')");
    expect(privateClient).toContain('/jobs/applications/${encodeURIComponent(applicationId)}/hire');
  });
});
