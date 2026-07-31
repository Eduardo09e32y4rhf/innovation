import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Official PDF endpoints and authorization', () => {
  it('protects every official PDF controller with authentication and role guards', () => {
    for (const controllerPath of [
      'apps/api/src/modules/finance/finance.controller.ts',
      'apps/api/src/modules/manual-contracts/manual-contracts.controller.ts',
      'apps/api/src/modules/time-track/time-closing.controller.ts',
      'apps/api/src/modules/employees/employees.controller.ts',
      'apps/api/src/modules/vacations/vacations.controller.ts',
      'apps/api/src/modules/management/management-documents.controller.ts',
    ]) {
      const source = read(controllerPath);
      expect(source, controllerPath).toContain('JwtAuthGuard');
      expect(source, controllerPath).toContain('RolesGuard');
      expect(source, controllerPath).toMatch(/@UseGuards\(JwtAuthGuard,\s*RolesGuard\)/);
    }
  });

  it('keeps tenant context on employee, vacation, management and time-closing documents', () => {
    const employee = read('apps/api/src/modules/employees/employees.controller.ts');
    const vacation = read('apps/api/src/modules/vacations/vacations.controller.ts');
    const management = read('apps/api/src/modules/management/management-documents.controller.ts');
    const timeClosing = read('apps/api/src/modules/time-track/time-closing.controller.ts');

    expect(employee).toContain('@CurrentCompany() companyId: string');
    expect(employee).toContain('this.employeeDocuments.generate(companyId, actor, employeeId');
    expect(vacation).toContain('this.service.generateReceiptPdf(companyId, actor, id)');
    expect(management).toContain('createAsoReferralFromRecord(companyId, actor.sub, id)');
    expect(management).toContain('createLegalNoticeFromNotification(companyId, actor.sub, id)');
    expect(timeClosing).toContain('req.user.companyId');
    expect(timeClosing).toContain('this.service.streamCollectivePdf(');
    expect(timeClosing).toContain('this.service.streamPdf(req.user.companyId');
  });

  it('exposes backend PDF routes and document integrity metadata', () => {
    const finance = read('apps/api/src/modules/finance/finance.controller.ts');
    const contracts = read('apps/api/src/modules/manual-contracts/manual-contracts.controller.ts');
    const timeClosing = read('apps/api/src/modules/time-track/time-closing.controller.ts');
    const employee = read('apps/api/src/modules/employees/employees.controller.ts');
    const vacation = read('apps/api/src/modules/vacations/vacations.controller.ts');

    expect(finance).toContain("@Get('platform/statements/pdf')");
    expect(contracts).toContain("@Get(':id/pdf')");
    expect(timeClosing).toContain("@Get('collective/pdf')");
    expect(timeClosing).toContain("@Get(':id/pdf-stream')");
    expect(employee).toContain("@Get(':id/documents/point-sheet.pdf')");
    expect(employee).toContain("@Get(':id/documents/occurrences.pdf')");
    expect(employee).toContain("@Get(':id/documents/record.pdf')");
    expect(vacation).toContain("@Get(':id/receipt.pdf')");
    expect(employee).toContain("response.header('X-Document-Sha256'");
    expect(vacation).toContain("response.setHeader('X-Document-Sha256'");
  });
});
