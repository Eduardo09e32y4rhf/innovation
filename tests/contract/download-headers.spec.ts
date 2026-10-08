import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contentDisposition, safeFileName } from '../../apps/api/src/common/pdf/pdf-response';

const RAIZ = join(__dirname, '../../apps/api/src');
function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : caminho.endsWith('.ts') && !caminho.endsWith('.spec.ts') ? [caminho] : [];
  });
}

describe('cabeçalho Content-Disposition dos downloads', () => {
  it('nenhum endpoint monta filename= na mão: tudo passa por contentDisposition() (acento, espaço e aspas)', () => {
    // Defeitos reais: filename="${encodeURIComponent(nome)}" salvava "Ficha%20Joao.pdf" no computador do usuário,
    // e filename="${nome}" cru deixava aspas/quebra de linha do nome entrarem no cabeçalho.
    const proibidos = [/filename="\$\{/, /filename="'\s*\+/, /filename=\\"\$\{/];
    const achados: string[] = [];
    for (const arquivo of arquivos(RAIZ)) {
      if (arquivo.endsWith(join('common', 'pdf', 'pdf-response.ts'))) continue;
      readFileSync(arquivo, 'utf8').split(/\r?\n/).forEach((linha, i) => {
        if (/Content-Disposition/i.test(linha) && proibidos.some((re) => re.test(linha))) achados.push(`${relative(RAIZ, arquivo)}:${i + 1}`);
      });
    }
    expect(achados, `Use contentDisposition(nome) em: ${achados.join(', ')}`).toEqual([]);
  });

  it('contentDisposition: ASCII seguro + UTF-8 para acentos, sem quebra de cabeçalho', () => {
    const h = contentDisposition('Ficha do João "Zé"\r\nSet-Cookie: x=1.pdf');
    expect(h).not.toMatch(/[\r\n]/);
    expect(h).toMatch(/^attachment; filename="[\x20-\x7e]*"; filename\*=UTF-8''/);
    expect(h).toContain(encodeURIComponent('Ficha do João'));
    expect(contentDisposition('relatório.pdf')).toContain("filename*=UTF-8''relat%C3%B3rio.pdf");
    expect(contentDisposition('')).toContain('documento.pdf');
  });

  it('safeFileName remove acento, barra e caracteres perigosos', () => {
    expect(safeFileName('../../etc/passwd')).toBe('etc-passwd');
    expect(safeFileName('João & Maria / 2026')).toBe('Joao-Maria-2026');
    expect(safeFileName('', 'mes')).toBe('mes');
  });
});
