import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Core closure contracts', () => {
  it('keeps MRR derived from recurring sources without fixed monetary fallbacks', () => {
    const source = read('apps/api/src/modules/finance/platform-finance.service.ts');

    expect(source).not.toMatch(/\b249[.,](?:90|99)\b/);
    expect(source).not.toMatch(/\b49[.,]90\b/);
    expect(source).toContain("status: issues.length === 0 ? 'COMPLETE' : 'PARTIAL'");
    expect(source).toContain('sourceCounts = { subscriptions: 0, contracts: 0, plans: 0 }');
    expect(source).toContain("code: 'MISSING_PRICING'");
    expect(source).toContain("code: 'MULTIPLE_RECURRING_SOURCES'");
  });

  it('keeps the complete manual-contract lifecycle, history and guarded endpoints', () => {
    const statuses = read('apps/api/src/modules/manual-contracts/manual-contract-status.ts');
    const controller = read('apps/api/src/modules/manual-contracts/manual-contracts.controller.ts');
    const service = read('apps/api/src/modules/manual-contracts/manual-contracts.service.ts');

    for (const status of [
      'DRAFT',
      'IN_REVIEW',
      'PENDING_ACCEPTANCE',
      'ACTIVE',
      'SUSPENDED',
      'TERMINATION_SCHEDULED',
      'ENDED',
      'CANCELED',
      'EXPIRED',
    ]) {
      expect(statuses).toContain(`'${status}'`);
    }
    expect(statuses).toContain('IMMUTABLE_CONTRACT_STATUSES');
    expect(controller).toContain('@UseGuards(JwtAuthGuard, RolesGuard)');
    expect(controller).toContain("@Roles('DEV', 'COMERCIAL')");
    expect(controller).toContain("@Get(':id/history')");
    expect(controller).toContain("@Get(':id/transitions')");
    expect(controller).toContain("@Patch(':id/status')");
    expect(controller).toContain("@Get(':id/pdf')");
    expect(service).toContain('IMMUTABLE_CONTRACT_STATUSES.has(current.status)');
    expect(service).toContain('billingSetupPending');
  });

  it('keeps application-specific evidence and consent on Application', () => {
    const schema = read('apps/api/prisma/schema.prisma');
    const repository = read('apps/api/src/modules/jobs/jobs.repository.ts');
    const dto = read('apps/api/src/modules/jobs/dto/apply-job.dto.ts');

    const applicationModel = schema.match(/model Application \{[\s\S]*?\n\}/)?.[0] ?? '';
    for (const field of [
      'coverLetter',
      'resumeUrl',
      'resumeName',
      'resumeType',
      'resumeSize',
      'aiScore',
      'aiSummary',
      'consentGiven',
      'consentAt',
    ]) {
      expect(applicationModel).toContain(field);
    }
    expect(dto).toContain('@Equals(true');
    expect(repository).toContain('consentGiven: Boolean(data.consent)');
    expect(repository).toContain('consentAt: data.consent ? new Date() : null');
    expect(repository).toContain('where: { companyId, candidateId: candidate.id, jobId }');
  });

  it('keeps password reset routed through tenant-aware service parameters', () => {
    const controller = read('apps/api/src/modules/users/users.controller.ts');
    const service = read('apps/api/src/modules/users/users.service.ts');
    const repository = read('apps/api/src/modules/users/users.repository.ts');

    expect(controller).toContain('@CurrentCompany() companyId: string');
    expect(controller).toContain('this.service.resetPassword(companyId, actor, id, dto)');
    expect(service).toContain('findByIdWithPassword(id, companyId)');
    expect(service).toContain('this.repository.update(id, data, companyId)');
    expect(service).toContain('return this.get(companyId, actor, id)');
    expect(repository).toContain('where: { id, ...(companyId ? { companyId } : {}) }');
  });
});
