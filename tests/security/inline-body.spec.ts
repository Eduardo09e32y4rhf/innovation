import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// @Body() tipado como any/inline/Record/Partial<Classe> escapa do whitelist/forbidNonWhitelisted do
// ValidationPipe: campos extras (companyId, role, status...) chegam ao servico. Use uma classe com class-validator.
const ROOT = join(__dirname, '../../apps/api/src');

// Webhooks sao autenticados por assinatura/token do provedor e o payload e do provedor, nao nosso.
const ALLOWED = new Set([
  'modules/finance/asaas-webhook.controller.ts',
  'modules/finance/mercadopago-webhook.controller.ts',
]);

function controllers(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return controllers(full);
    return name.endsWith('.controller.ts') ? [full] : [];
  });
}

describe('@Body() sem DTO validado', () => {
  it('nenhum controller recebe corpo como any, tipo inline, Record ou Partial<Classe>', () => {
    const offenders: string[] = [];
    for (const file of controllers(ROOT)) {
      const rel = relative(ROOT, file);
      if (ALLOWED.has(rel)) continue;
      const src = readFileSync(file, 'utf8');
      const localTypes = new Set([...src.matchAll(/^(?:export\s+)?(?:interface|type)\s+(\w+)/gm)].map((m) => m[1]));
      for (const m of src.matchAll(/@Body\(\s*\)\s*\w+\??\s*:\s*([^,)]+(?:<[^>]*>)?)/g)) {
        const type = m[1].trim();
        const bad = /^(any|unknown|object|Object)$/.test(type) || type.startsWith('{') || /^(Record|Partial|Pick|Omit)</.test(type) || localTypes.has(type);
        if (bad) offenders.push(`${rel}:${src.slice(0, m.index).split('\n').length} @Body() ${type}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
