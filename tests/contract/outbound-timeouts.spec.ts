import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '../../apps/api/src');
function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : caminho.endsWith('.ts') && !/\.(spec|test)\.ts$/.test(caminho) ? [caminho] : [];
  });
}

// Excecoes justificadas (caminho relativo a apps/api/src). Hoje: so o proprio helper.
const EXCECOES: Record<string, string> = {
  'common/http/outbound.ts': 'implementa o fetch com AbortSignal.timeout',
};

describe('chamadas HTTP de saida', () => {
  it('nenhum fetch( cru em apps/api/src: tudo passa por outboundFetch (timeout obrigatorio)', () => {
    const achados: string[] = [];
    for (const arquivo of arquivos(RAIZ)) {
      const rel = relative(RAIZ, arquivo).replace(/\\/g, '/');
      if (EXCECOES[rel]) continue;
      readFileSync(arquivo, 'utf8').split(/\r?\n/).forEach((linha, i) => {
        if (/(^|[^.\w])fetch\s*\(/.test(linha) || /\b(axios|undici|node-fetch)\b.*from|require\(['"](axios|undici|node-fetch)/.test(linha)) achados.push(`${rel}:${i + 1}`);
      });
    }
    expect(achados, `Use outboundFetch() em: ${achados.join(', ')}`).toEqual([]);
  });
});
