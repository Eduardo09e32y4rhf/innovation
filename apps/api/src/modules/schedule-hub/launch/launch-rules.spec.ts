import { describe, expect, it } from 'vitest';
import { bankCheck, checkCertificateFile, expandDates, MAX_RANGE_DAYS } from './launch-rules';

describe('período do lançamento', () => {
  it('um dia só', () => expect(expandDates('2026-11-03', '2026-11-03')).toEqual(['2026-11-03']));
  it('vários dias, incluindo virada de mês', () => expect(expandDates('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']));
  it('fim antes do início é recusado', () => expect(() => expandDates('2026-11-05', '2026-11-04')).toThrow(/antes da inicial/));
  it('data inválida é recusada', () => { expect(() => expandDates('2026-13-40', '2026-13-41')).toThrow(); expect(() => expandDates('amanha', '2026-11-04')).toThrow(/AAAA-MM-DD/); });
  it(`mais de ${MAX_RANGE_DAYS} dias é recusado`, () => expect(() => expandDates('2026-01-01', '2026-06-01')).toThrow(/no máximo/));
  it('exatamente o limite passa', () => expect(expandDates('2026-01-01', '2026-03-03')).toHaveLength(MAX_RANGE_DAYS));
});

describe('folga pelo banco de horas', () => {
  it('saldo suficiente libera', () => expect(bankCheck(960, 480).ok).toBe(true));
  it('saldo exatamente igual libera', () => expect(bankCheck(480, 480).ok).toBe(true));
  it('saldo insuficiente recusa e diz quanto tem e quanto precisa', () => {
    const r = bankCheck(300, 480);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('tem 5h00');
    expect(r.message).toContain('precisa de 8h00');
  });
  it('saldo negativo conta como zero na mensagem', () => expect(bankCheck(-120, 480).message).toContain('tem 0h00'));
  it('sem dia de trabalho no período recusa', () => expect(bankCheck(5000, 0).ok).toBe(false));
});

describe('arquivo do atestado', () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]);
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4'), Buffer.alloc(200)]);
  it('foto JPG de verdade passa', () => expect(checkCertificateFile('atestado.jpg', 5000, jpg)).toBeNull());
  it('PDF de verdade passa', () => expect(checkCertificateFile('atestado.PDF', 5000, pdf)).toBeNull());
  it('extensão proibida é recusada', () => expect(checkCertificateFile('virus.exe', 5000, jpg)).toMatch(/foto/));
  it('arquivo com extensão falsa é recusado', () => expect(checkCertificateFile('atestado.png', 5000, jpg)).toMatch(/falsificado/));
  it('arquivo grande demais é recusado', () => expect(checkCertificateFile('a.jpg', 11 * 1024 * 1024, jpg)).toMatch(/10 MB/));
  it('arquivo vazio é recusado', () => expect(checkCertificateFile('a.jpg', 10, jpg)).toMatch(/vazio/));
});
