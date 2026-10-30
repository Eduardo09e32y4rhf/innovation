import { describe, expect, it } from 'vitest';
import { explainCodeError, explainUploadError, isValidCode } from '../../../apps/web/app/carreiras/documentos/[token]/documents-client';

describe('codigo por e-mail no link de documentos (RS-D-17)', () => {
  it('so aceita 6 numeros', () => {
    expect(isValidCode('123456')).toBe(true);
    expect(isValidCode(' 123456 ')).toBe(true);
    expect(isValidCode('12345')).toBe(false);
    expect(isValidCode('12345a')).toBe(false);
    expect(isValidCode('')).toBe(false);
  });
  it('mensagens em portugues para cada falha', () => {
    expect(explainCodeError(404)).toMatch(/inválido ou expirou/);
    expect(explainCodeError(429)).toMatch(/Muitas tentativas/);
    expect(explainCodeError(503)).toMatch(/e-mail/);
    expect(explainCodeError(400, 'Codigo incorreto.')).toBe('Codigo incorreto.');
    expect(explainUploadError(403)).toMatch(/código enviado ao seu e-mail/);
  });
});
