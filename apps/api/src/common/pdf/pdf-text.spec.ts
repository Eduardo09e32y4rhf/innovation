import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPayslipPdf, buildTimeSheetPdf, type TimeSheetData } from '../../modules/time-track/time-sheet-pdf';
import { pdfSafeText } from './pdf-report';

const HAS_PDFTOTEXT = spawnSync('pdftotext', ['-v']).error === undefined;

/** Texto como o leitor de PDF enxerga (o que o colaborador lê), com espaços normalizados. */
function pdfText(buffer: Buffer, raw = false): string {
  const dir = mkdtempSync(join(tmpdir(), 'pdftext-'));
  try {
    const file = join(dir, 'doc.pdf');
    writeFileSync(file, buffer);
    const out = spawnSync('pdftotext', [raw ? '-raw' : '-layout', file, '-'], { encoding: 'utf8' });
    return out.stdout.replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const pagesOf = (buffer: Buffer) => (buffer.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

function sheet(over: Partial<TimeSheetData> = {}, tracks = 3): TimeSheetData {
  return {
    id: 'golden-1',
    status: 'APPROVED',
    periodStart: new Date('2026-09-01T00:00:00Z'),
    periodEnd: new Date('2026-09-30T00:00:00Z'),
    company: { name: 'Empresa Teste Ltda', document: '12345678000190', logoUrl: null },
    employee: { name: 'José da Conceição Ñandú', cpf: '52998224725', registration: null, position: null, department: null },
    tracks: Array.from({ length: tracks }, (_, i) => {
      const day = Date.UTC(2026, 8, 1 + (i % 28));
      return { date: new Date(day), entry: new Date(day + 11 * 3600e3), lunchStart: new Date(day + 15 * 3600e3), lunchReturn: new Date(day + 16 * 3600e3), exit: new Date(day + 20 * 3600e3), totalWorked: 480, dailyBalance: 0, incidentType: null };
    }),
    salaryBase: 5000, overtime50: 4, overtime50Value: 545.45, dsrValue: 120.5, absenceDiscount: 0, grossPay: 5665.95, inssDiscount: 543.67, irrfDiscount: 12.34,
    fgtsAmount: 453.28, netPay: 5109.94, hourlyRate: 22.7273, monthlyDivisor: 220, normalHours: 160, nightShift: 0, payableWorkdays: 22,
    ...over,
  };
}

describe('filtro de glifos do PDF (fonte Helvetica / WinAnsi)', () => {
  it('mantém acentos, ç, ñ, aspas e travessão do português', () => {
    const text = 'José da Conceição Ñandú — “Júnior” ½ € ª º';
    expect(pdfSafeText(text)).toBe(text);
  });

  it('troca por equivalente legível o que a fonte não desenha', () => {
    expect(pdfSafeText('Dvořák')).toBe('Dvorák');
    expect(pdfSafeText('Łukasz')).toBe('Lukasz');
    expect(pdfSafeText('Ğ ş Ă')).toBe('G s A');
    expect(pdfSafeText('idade ≥ 18 ✓')).toBe('idade >= 18 v');
  });

  it('o que não tem equivalente vira "?" e invisíveis somem, sem quebrar a linha', () => {
    expect(pdfSafeText('山田')).toBe('??');
    expect(pdfSafeText('ok😀')).toBe('ok?');
    expect(pdfSafeText('a​b\u0000c\nd')).toBe('abc\nd');
  });
});

describe.skipIf(!HAS_PDFTOTEXT)('holerite e espelho de ponto: texto extraído do PDF', () => {
  it('cada valor do holerite aparece igual ao do cálculo', async () => {
    const text = pdfText(await buildPayslipPdf(sheet()));
    for (const value of ['R$ 5.000,00', 'R$ 545,45', 'R$ 120,50', 'R$ 543,67', 'R$ 12,34', 'R$ 453,28', 'R$ 5.109,94', 'R$ 5.665,95', '4,00 h', '160,00 h', 'R$ 22,73']) {
      expect(text, `valor ${value}`).toContain(value);
    }
  });

  it('campos vazios nunca aparecem como undefined, null, NaN ou {{campo}}', async () => {
    const empty = sheet({ salaryBase: undefined, grossPay: null, netPay: undefined, hourlyRate: null, fgtsAmount: undefined, deductionsJson: null }, 0);
    const text = pdfText(await buildTimeSheetPdf({ ...empty, company: { name: null, document: null, logoUrl: null } }));
    expect(text).not.toMatch(/undefined|\bnull\b|NaN|\{\{|\}\}|\[object/i);
    expect(text).toContain('Nenhum registro de ponto no período');
  });

  it('nome com caracteres fora da fonte sai legível, não como lixo', async () => {
    const text = pdfText(await buildTimeSheetPdf(sheet({ employee: { name: 'Łukasz Dvořák Øyvind', cpf: '52998224725' } })));
    expect(text).toContain('Lukasz Dvorák Øyvind');
  });

  it('nome de 120 letras sem espaço quebra dentro do quadro e não perde nada', async () => {
    const name = `${'A'.repeat(120)} Souza`;
    const buffer = await buildTimeSheetPdf(sheet({ employee: { name, cpf: '52998224725' } }));
    const text = pdfText(buffer, true).replace(/\s+/g, '');
    expect(text).toContain(`${'A'.repeat(120)}Souza`);
    expect(pagesOf(buffer)).toBe(2);
  });

  it('mais de 200 linhas: todas aparecem, o cabeçalho da tabela repete e as páginas são numeradas', async () => {
    const buffer = await buildTimeSheetPdf(sheet({}, 210));
    const text = pdfText(buffer);
    const pages = pagesOf(buffer);
    expect(pages).toBeGreaterThanOrEqual(5);
    expect((text.match(/^ ?\d{2}\/\d{2} (seg|ter|qua|qui|sex|sáb|dom)/gm) ?? []).length).toBe(210);
    expect((text.match(/DATA DIA ENTRADA/g) ?? []).length).toBe(pages - 1);
    for (let page = 1; page <= pages; page += 1) expect(text).toContain(`Página ${page} de ${pages}`);
  });

  it('assinatura do colaborador e do RH ficam no fim do espelho', async () => {
    const text = pdfText(await buildTimeSheetPdf(sheet({}, 40)));
    expect(text.lastIndexOf('Assinatura do colaborador')).toBeGreaterThan(text.lastIndexOf('TOTAIS DO PERÍODO'));
    expect(text).toContain('Responsável RH / gestor');
  });

  it('o mesmo documento emitido de novo tem o mesmo hash', async () => {
    const generatedAt = new Date('2026-10-20T12:00:00Z');
    const first = await buildTimeSheetPdf(sheet(), generatedAt);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = await buildTimeSheetPdf(sheet(), generatedAt);
    const sha = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
    expect(sha(second)).toBe(sha(first));
  });
});
