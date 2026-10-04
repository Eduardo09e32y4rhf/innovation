import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const controllersRoot = path.resolve(__dirname, '../../apps/api/src');

function controllerFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return controllerFiles(fullPath);
    return entry.name.endsWith('.controller.ts') ? [fullPath] : [];
  });
}

describe('route role-policy contract', () => {
  it('requires every authenticated controller to declare RolesGuard and a role policy', () => {
    const violations = controllerFiles(controllersRoot).flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes('@UseGuards(JwtAuthGuard')) return [];
      const missing: string[] = [];
      if (!source.includes('RolesGuard')) missing.push('RolesGuard');
      if (!source.includes('@Roles(')) missing.push('@Roles(...)');
      return missing.length ? [`${path.relative(controllersRoot, file)}: ${missing.join(', ')}`] : [];
    });

    expect(violations, `Rotas autenticadas sem matriz de perfil:\n${violations.join('\n')}`).toEqual([]);
  });

  it('keeps tenant input from overriding the authenticated company outside DEV', () => {
    const source = fs.readFileSync(
      path.join(controllersRoot, 'modules/support/support.service.ts'),
      'utf8',
    );
    expect(source).toContain("if (query?.companyId && actor.role === 'DEV')");
  });
});
