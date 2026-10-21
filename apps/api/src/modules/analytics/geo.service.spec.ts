import { describe, expect, it } from 'vitest';
import { GeoService, normalizePlace, publicIp } from './geo.service';

describe('publicIp', () => {
  it('aceita IP publico e remove o prefixo IPv4-mapeado', () => {
    expect(publicIp('200.160.2.3')).toBe('200.160.2.3');
    expect(publicIp('::ffff:200.160.2.3')).toBe('200.160.2.3');
    expect(publicIp('2800:3f0:4001:80a::200e')).toBe('2800:3f0:4001:80a::200e');
  });

  it.each(['10.0.0.1', '172.20.1.1', '192.168.1.10', '127.0.0.1', '169.254.1.1', '100.64.0.1', '::1', 'fc00::1', 'fe80::1', 'abc', '', undefined])('ignora IP privado ou invalido: %j', (ip) => {
    expect(publicIp(ip as string | undefined)).toBeNull();
  });
});

describe('normalizePlace', () => {
  it('le o formato plano do pacote npm', () => {
    expect(normalizePlace({ country_code: 'BR', state1: 'Sao Paulo', city: 'Pinheiros' })).toEqual({ country: 'BR', region: 'Sao Paulo', city: 'Pinheiros' });
  });

  it('le o formato oficial (preferindo pt-BR)', () => {
    expect(normalizePlace({ country: { iso_code: 'BR' }, subdivisions: [{ names: { en: 'Sao Paulo', 'pt-BR': 'São Paulo' } }], city: { names: { en: 'Santos' } } })).toEqual({ country: 'BR', region: 'São Paulo', city: 'Santos' });
  });

  it('devolve vazio sem registro', () => {
    expect(normalizePlace(null)).toEqual({ country: null, region: null, city: null });
  });
});

describe('GeoService (base real do pacote npm)', () => {
  const geo = new GeoService();

  it('localiza IPv4 e IPv6 brasileiros e estrangeiros', async () => {
    expect(await geo.available()).toBe(true);
    expect((await geo.lookup('200.160.2.3')).country).toBe('BR');
    expect((await geo.lookup('2800:3f0:4001:80a::200e')).country).toBe('BR');
    expect((await geo.lookup('8.8.8.8')).country).toBe('US');
  });

  it('nao localiza rede local', async () => {
    expect(await geo.lookup('192.168.0.5')).toEqual({ country: null, region: null, city: null });
  });
});
