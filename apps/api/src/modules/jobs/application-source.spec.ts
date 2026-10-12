import { describe, expect, it } from 'vitest';
import { normalizeSource } from './application-source';

describe('origem da candidatura', () => {
  it('reconhece canais conhecidos e apelidos', () => {
    expect(normalizeSource('linkedin')).toBe('LINKEDIN');
    expect(normalizeSource('WhatsApp')).toBe('WHATSAPP');
    expect(normalizeSource('indicação')).toBe('INDICACAO');
  });
  it('sem origem usa o portal; origem desconhecida vira OUTRO', () => {
    expect(normalizeSource(undefined)).toBe('CAREERS_PORTAL');
    expect(normalizeSource('')).toBe('CAREERS_PORTAL');
    expect(normalizeSource('<script>x</script>')).toBe('OUTRO');
  });
});