import { describe, expect, it } from 'vitest';
import { dunningConfigFromEnv, dunningStage, type DunningConfig, type DunningStage } from './dunning';
import { formatBRL, formatDate } from './finance-notification.service';

describe('data do vencimento nos avisos de cobrança (WhatsApp/e-mail)', () => {
  const venc = new Date('2026-10-10T00:00:00.000Z'); // vencimento é gravado como meia-noite UTC do dia
  const fusos = ['UTC', 'America/Sao_Paulo', 'America/Manaus', 'Asia/Tokyo', 'Pacific/Auckland'];

  it.each(fusos)('mostra 10/10/2026 com o servidor no fuso %s (antes mostrava 09/10 no horário de Brasília)', (tz) => {
    const anterior = process.env.TZ;
    process.env.TZ = tz;
    try { expect(formatDate(venc)).toBe('10/10/2026'); }
    finally { if (anterior === undefined) delete process.env.TZ; else process.env.TZ = anterior; }
  });

  it('sem data vira travessão e o valor sai em reais com vírgula', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatBRL(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50');
    expect(formatBRL(undefined)).toBe('—');
    expect(formatBRL(0).replace(/\s/g, ' ')).toBe('R$ 0,00');
  });
});

describe('régua de inadimplência: propriedades para qualquer configuração', () => {
  const ordem: DunningStage[] = ['NONE', 'REMINDER', 'WARNING', 'BLOCK', 'CANCEL'];
  const lixo = [undefined, '', ' ', 'abc', '0', '-3', '1', '2', '3', '5', '7.9', '0.4', '30', '100', 'NaN', 'Infinity'];

  it('com qualquer valor de ambiente: aviso < bloqueio < cancelamento, todos inteiros >= 1', () => {
    for (const w of lixo) for (const b of lixo) for (const c of lixo) {
      const cfg = dunningConfigFromEnv({ DUNNING_WARN_DAY: w, DUNNING_BLOCK_DAY: b, DUNNING_CANCEL_DAY: c } as never);
      const desc = JSON.stringify({ w, b, c, cfg });
      expect(Number.isInteger(cfg.warnDay) && Number.isInteger(cfg.blockDay) && Number.isInteger(cfg.cancelDay), desc).toBe(true);
      expect(cfg.warnDay, desc).toBeGreaterThanOrEqual(1);
      expect(cfg.warnDay, desc).toBeLessThan(cfg.blockDay);
      expect(cfg.blockDay, desc).toBeLessThan(cfg.cancelDay);
    }
  });

  it('o estágio só avança com os dias de atraso e passa por todos na ordem (lembrete → aviso → bloqueio → cancelamento)', () => {
    for (const cfg of [{ warnDay: 3, blockDay: 5, cancelDay: 30 }, { warnDay: 1, blockDay: 2, cancelDay: 3 }, dunningConfigFromEnv({ DUNNING_BLOCK_DAY: '1' } as never)] as DunningConfig[]) {
      let anterior = 0; const vistos = new Set<string>();
      for (let dias = -5; dias <= 90; dias++) {
        const estagio = dunningStage(dias, cfg);
        const posicao = ordem.indexOf(estagio);
        expect(posicao, `${JSON.stringify(cfg)} dia ${dias}`).toBeGreaterThanOrEqual(anterior);
        anterior = posicao; vistos.add(estagio);
      }
      // com aviso no dia 1 não existe fase de lembrete (o aviso já começa no primeiro dia de atraso)
      expect([...vistos]).toEqual(cfg.warnDay === 1 ? ordem.filter((e) => e !== 'REMINDER') : ordem);
    }
  });

  it('limites exatos: antes do vencimento nada; 1 dia = lembrete; aviso, bloqueio e cancelamento nos dias configurados', () => {
    const cfg = { warnDay: 3, blockDay: 5, cancelDay: 30 };
    expect(dunningStage(0, cfg)).toBe('NONE');
    expect(dunningStage(-2, cfg)).toBe('NONE');
    expect([1, 2, 3, 4, 5, 29, 30].map((d) => dunningStage(d, cfg))).toEqual(['REMINDER', 'REMINDER', 'WARNING', 'WARNING', 'BLOCK', 'BLOCK', 'CANCEL']);
  });

  it('bloqueio no dia 1 não pula lembrete e aviso (configuração absurda é corrigida)', () => {
    const cfg = dunningConfigFromEnv({ DUNNING_BLOCK_DAY: '1', DUNNING_WARN_DAY: '1' } as never);
    expect(dunningStage(1, cfg)).not.toBe('BLOCK');
  });
});
