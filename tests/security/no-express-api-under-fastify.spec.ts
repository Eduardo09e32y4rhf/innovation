import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A API roda sob FastifyAdapter. APIs do Express nao existem la e viram 500 em runtime:
 * FileInterceptor/UploadedFile (multer), res.set(), res.sendFile/download, stream.pipe(reply) e
 * res.setHeader no reply do Fastify (so reply.raw tem setHeader).
 */
const root = join(__dirname, '../../apps/api/src');
const files: string[] = [];
(function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.ts$/.test(name) && !/\.spec\.ts$/.test(name)) files.push(full);
  }
})(root);

const FORBIDDEN: Array<[string, RegExp]> = [
  ['FileInterceptor/FilesInterceptor (multer, so Express)', /\bFilesInterceptor?\s*\(/],
  ['@UploadedFile(s) (multer)', /@UploadedFiles?\s*\(/],
  ['@nestjs/platform-express', /from\s+['"]@nestjs\/platform-express['"]/],
  ["tipos do 'express'", /from\s+['"]express['"]|import\(\s*['"]express['"]\s*\)/],
  ['res.set(', /\b(?:res|reply|response)\.set\s*\(/],
  ['res.sendFile/download/attachment', /\b(?:res|reply|response)\.(?:sendFile|download|attachment)\s*\(/],
  ['stream.pipe(res|reply|response)', /\.pipe\(\s*(?:res|reply|response)\s*\)/],
  ['reply.setHeader direto (use reply.header ou reply.raw)', /\b(?:res|reply|response)\.setHeader\s*\(/],
];

describe('API Fastify: sem APIs do Express', () => {
  it.each(FORBIDDEN)('nenhum arquivo usa %s', (_label, pattern) => {
    // no-cache.interceptor so chama setHeader quando header() nao existe (guarda de compatibilidade)
    const hits = files.filter((file) => !(file.endsWith('no-cache.interceptor.ts') && _label.startsWith('reply.setHeader'))).filter((file) => pattern.test(readFileSync(file, 'utf8'))).map((file) => relative(root, file));
    expect(hits).toEqual([]);
  });
});
