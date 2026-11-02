import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// RS-D-06: o texto que o candidato ve (web) precisa ser o mesmo cujo hash o servidor grava como prova.
const read = (path: string) => readFileSync(path, 'utf8');
const texts = (source: string) => Object.fromEntries([...source.slice(source.indexOf('CONSENT_TEXTS')).split('}')[0].matchAll(/^\s*(APPLICATION|TALENT_POOL|SENSITIVE_DATA): '((?:[^'\\]|\\.)*)',/gm)].map((m) => [m[1], m[2]]));

describe('RS-D-06: textos de consentimento web x API', () => {
  it('sao identicos para as tres finalidades', () => {
    const api = texts(read('apps/api/src/modules/jobs/recruitment-consent.ts'));
    const web = texts(read('apps/web/app/carreiras/_lib/consent-texts.ts'));
    expect(Object.keys(api).sort()).toEqual(['APPLICATION', 'SENSITIVE_DATA', 'TALENT_POOL']);
    expect(web).toEqual(api);
  });
});
