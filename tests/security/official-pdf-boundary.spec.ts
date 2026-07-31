import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '../..');

const officialFrontendPages = [
  'apps/web/app/[tenant]/dashboard/management/page.tsx',
  'apps/web/app/[tenant]/dashboard/vacations/page.tsx',
  'apps/web/app/[tenant]/dashboard/time-track/page.tsx',
  'apps/web/app/[tenant]/dashboard/employees/page.tsx',
  'apps/web/app/[tenant]/dashboard/platform/_components/company-manage-modal.tsx',
];

describe('Official documents boundary', () => {
  for (const relativePath of officialFrontendPages) {
    it(`${relativePath} does not generate official PDFs in the browser`, () => {
      const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
      expect(source).not.toMatch(/\bprintPdf\b/);
      expect(source).not.toMatch(/\bbuildPdfShell\b/);
      expect(source).not.toMatch(/(?:from|import\()\s*['"][^'"]*pdf-utils['"]/);
    });
  }

  it('allows the legacy helper to exist only as an unused utility', () => {
    const webRoot = path.join(projectRoot, 'apps/web/app');
    const stack = [webRoot];
    const consumers: string[] = [];

    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const absolute = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(absolute);
          continue;
        }
        if (!/\.(?:ts|tsx)$/.test(entry.name) || absolute.endsWith('pdf-utils.ts')) continue;
        const source = fs.readFileSync(absolute, 'utf8');
        if (/\bprintPdf\b|\bbuildPdfShell\b|pdf-utils/.test(source)) {
          consumers.push(path.relative(projectRoot, absolute));
        }
      }
    }

    expect(consumers).toEqual([]);
  });

  it('keeps the release gate enabled', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    expect(packageJson.scripts['release:core-rh']).toContain('check:official-pdfs');
  });
});
