import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Fase 3 — Testes de Segurança: Proibição de Dados Demonstrativos em Produção
 *
 * Este teste percorre TODOS os arquivos .tsx e .ts do frontend de produção
 * e falha se encontrar qualquer string de dados fictícios conhecidos.
 *
 * Regra: Nenhum dado fictício deve existir em código de produção.
 * Em caso de falha da API, exibir ErrorState real e lista vazia.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const PRODUCTION_DIRS = [
  path.join(PROJECT_ROOT, 'apps/web/app'),
  path.join(PROJECT_ROOT, 'apps/api/src'),
];

// Strings proibidas em código de produção (dados demonstrativos conhecidos)
const FORBIDDEN_DEMO_PATTERNS = [
  'Acme Consultoria',
  'TechSolutions Brasil',
  'Stark Industries',
  'Dados demonstrativos',
  'Dados de demonstração',
  'demonstrativos se offline',
  'demonstração visuais',
  'tkt-c1',
  'tkt-c2',
  'tkt-1',
  'SUP-2026-0001',
  'carla@acme.com',
  'marcos@techsolutions.com',
  "'id': 'tkt-",
  '"id": "tkt-',
  // IDs de usuários hardcoded
  "'authorUserId': 'dev-1'",
  '"authorUserId": "dev-1"',
  "'id': 'c1'",
  "'id': 'c2'",
];

// Arquivos e diretórios que NÃO devem ser verificados (testes, seeds, scripts de infra)
const EXCLUDED_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  '__tests__',
  '.spec.ts',
  '.spec.tsx',
  '.test.ts',
  '.test.tsx',
  'scripts/test/',
  'tests/',
  'tests-e2e/',
  'seed',
  '.gitkeep',
  'baseline-',
];

function isExcluded(filePath: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => filePath.includes(pattern));
}

function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (isExcluded(fullPath)) continue;
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Security: Proibição de Dados Demonstrativos em Produção', () => {
  const productionFiles = PRODUCTION_DIRS.flatMap(dir =>
    collectFiles(dir, ['.tsx', '.ts'])
  );

  it('deve encontrar arquivos de produção para verificar', () => {
    expect(productionFiles.length).toBeGreaterThan(10);
  });

  for (const forbidden of FORBIDDEN_DEMO_PATTERNS) {
    it(`não deve conter dados fictícios: "${forbidden}"`, () => {
      const violations: string[] = [];

      for (const file of productionFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes(forbidden)) {
          const relPath = path.relative(PROJECT_ROOT, file);
          const lineNum = content
            .split('\n')
            .findIndex(line => line.includes(forbidden)) + 1;
          violations.push(`${relPath}:${lineNum}`);
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `Dado fictício proibido encontrado em ${violations.length} arquivo(s) de produção:\n` +
          violations.map(v => `  → ${v}`).join('\n') +
          `\n\nDado proibido: "${forbidden}"\n` +
          `Solução: substituir por ErrorState real com lista vazia ([]) em caso de falha da API.`
        );
      }

      expect(violations).toHaveLength(0);
    });
  }
});
