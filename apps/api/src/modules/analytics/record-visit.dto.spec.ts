import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RecordVisitDto } from './dto/record-visit.dto';

async function errorsFor(input: object) {
  return validate(plainToInstance(RecordVisitDto, input), { whitelist: true, forbidNonWhitelisted: true });
}

describe('RecordVisitDto', () => {
  it('aceita visita com consentimento', async () => {
    expect(await errorsFor({ path: '/', consent: true })).toHaveLength(0);
    expect(await errorsFor({ path: '/planos', consent: true, referrer: 'www.google.com' })).toHaveLength(0);
  });

  it.each([{ path: '/' }, { path: '/', consent: false }, { path: '/', consent: 'true' }])('recusa sem consentimento valido: %j', async (input) => {
    expect((await errorsFor(input)).length).toBeGreaterThan(0);
  });

  it('recusa caminho invalido e campos extras (como IP)', async () => {
    expect((await errorsFor({ path: 'javascript:alert(1)', consent: true })).length).toBeGreaterThan(0);
    expect((await errorsFor({ path: '/', consent: true, ip: '1.1.1.1' })).length).toBeGreaterThan(0);
  });
});
