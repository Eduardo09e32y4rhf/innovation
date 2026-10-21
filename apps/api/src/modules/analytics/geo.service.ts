import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { BlockList, isIP } from 'node:net';
import { dirname, join } from 'node:path';
import { open, type Reader } from 'maxmind';

export interface GeoPlace {
  country: string | null;
  region: string | null;
  city: string | null;
}

const EMPTY: GeoPlace = { country: null, region: null, city: null };

const PRIVATE = new BlockList();
for (const [net, bits] of [['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['127.0.0.0', 8], ['169.254.0.0', 16], ['100.64.0.0', 10], ['0.0.0.0', 8]] as const) PRIVATE.addSubnet(net, bits, 'ipv4');
for (const [net, bits] of [['fc00::', 7], ['fe80::', 10], ['::1', 128]] as const) PRIVATE.addSubnet(net, bits, 'ipv6');

function clean(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim().slice(0, 80) : '';
  return text || null;
}

/** Aceita o formato plano do pacote npm (country_code/state1/city) e o oficial DB-IP/MaxMind (country.iso_code/subdivisions/city.names). */
export function normalizePlace(record: any): GeoPlace {
  if (!record) return EMPTY;
  if (record.country_code) return { country: clean(record.country_code), region: clean(record.state1), city: clean(record.city) };
  const sub = record.subdivisions?.[0]?.names;
  const city = record.city?.names;
  return {
    country: clean(record.country?.iso_code),
    region: clean(sub?.['pt-BR'] ?? sub?.en),
    city: clean(city?.['pt-BR'] ?? city?.en),
  };
}

export function publicIp(raw: string | undefined): string | null {
  const ip = String(raw ?? '').replace(/^::ffff:/i, '').trim();
  if (!isIP(ip)) return null;
  return PRIVATE.check(ip, ip.includes(':') ? 'ipv6' : 'ipv4') ? null : ip;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private loading?: Promise<Array<{ family: 'v4' | 'v6' | 'both'; reader: Reader<any> }>>;

  /** GEOIP_DB_PATH aponta para um .mmdb unico (IPv4+IPv6); sem ele usa o pacote npm @ip-location-db/dbip-city-mmdb. */
  private paths(): string[] {
    if (process.env.GEOIP_DB_PATH) return [process.env.GEOIP_DB_PATH];
    try {
      const dir = dirname(require.resolve('@ip-location-db/dbip-city-mmdb/package.json'));
      return [join(dir, 'dbip-city-ipv4.mmdb'), join(dir, 'dbip-city-ipv6.mmdb')];
    } catch {
      return [];
    }
  }

  private readers() {
    this.loading ??= (async () => {
      const found = this.paths().filter((path) => existsSync(path));
      if (!found.length) this.logger.warn('Base de localizacao ausente: as visitas serao gravadas sem lugar.');
      return Promise.all(found.map(async (path) => ({
        family: (/ipv6/i.test(path) ? 'v6' : /ipv4/i.test(path) ? 'v4' : 'both') as 'v4' | 'v6' | 'both',
        reader: await open(path),
      })));
    })().catch((error) => {
      this.logger.warn(`Falha ao abrir a base de localizacao: ${(error as Error).message}`);
      return [];
    });
    return this.loading;
  }

  async available(): Promise<boolean> {
    return (await this.readers()).length > 0;
  }

  async lookup(rawIp: string | undefined): Promise<GeoPlace> {
    const ip = publicIp(rawIp);
    if (!ip) return EMPTY;
    const family = ip.includes(':') ? 'v6' : 'v4';
    for (const { family: readerFamily, reader } of await this.readers()) {
      if (readerFamily !== 'both' && readerFamily !== family) continue;
      try {
        const place = normalizePlace(reader.get(ip));
        if (place.country) return place;
      } catch {
        // Endereco que este leitor nao consegue ler: tenta o proximo.
      }
    }
    return EMPTY;
  }
}
