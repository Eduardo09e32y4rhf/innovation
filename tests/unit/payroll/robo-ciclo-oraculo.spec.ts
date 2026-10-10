import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs do robô de ciclo completo (sem tipos)
import { escolherMesDeReferencia, feriadosNacionais, pascoa, resumoDoMes } from '../../../tools/robo-ciclo/lib/calendario.mjs';
// @ts-expect-error módulo .mjs do robô de ciclo completo (sem tipos)
import { minutosNoturnos, oraculoDia, somarDias } from '../../../tools/robo-ciclo/lib/oraculo-ponto.mjs';

const jornada = { entrada: '08:00', saidaAlmoco: '12:00', voltaAlmoco: '13:00', saida: '17:00', minutosDia: 480 };
const dia = (batidas: string[] | null, tipoDia: 'util' | 'descanso' = 'util', j = jornada) => oraculoDia({ batidas, tipoDia, jornada: j });

describe('calendário do robô de ciclo', () => {
  it('Páscoa conhecida: 2026-04-05 e 2025-04-20', () => {
    expect(pascoa(2026).toISOString().slice(0, 10)).toBe('2026-04-05');
    expect(pascoa(2025).toISOString().slice(0, 10)).toBe('2025-04-20');
  });

  it('feriados móveis de 2026: Carnaval 16-17/02, Sexta Santa 03/04, Corpus Christi 04/06', () => {
    const f = feriadosNacionais(2026);
    for (const d of ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04', '2026-09-07']) expect(f.has(d)).toBe(true);
  });

  it('agosto/2026: 21 dias úteis, 5 sábados, 5 domingos, nenhum feriado', () => {
    const r = resumoDoMes('2026-08');
    expect(r.uteis).toHaveLength(21);
    expect(r.sabados).toHaveLength(5);
    expect(r.domingos).toHaveLength(5);
    expect(r.feriadosEmSemana).toHaveLength(0);
    expect(r.payableWorkdays).toBe(21);
    expect(r.paidRestDays).toBe(5);
  });

  it('setembro/2026 tem o feriado de 7/9 (segunda): 21 úteis e 5 dias de descanso pagos', () => {
    const r = resumoDoMes('2026-09');
    expect(r.feriadosEmSemana).toHaveLength(1);
    expect(r.payableWorkdays).toBe(21);
    expect(r.paidRestDays).toBe(4 + 1);
  });

  it('em 10/10/2026 o mês de referência é agosto (setembro tem feriado)', () => {
    expect(escolherMesDeReferencia(new Date(Date.UTC(2026, 9, 10)))).toBe('2026-08');
  });

  it('em janeiro volta para dezembro do ano anterior ou antes (dezembro tem Natal em dia de semana ou não)', () => {
    const mes = escolherMesDeReferencia(new Date(Date.UTC(2027, 0, 15)));
    expect(mes < '2027-01').toBe(true);
    expect(resumoDoMes(mes).feriadosEmSemana).toHaveLength(0);
  });
});

describe('oráculo do ponto (um dia), conferido à mão', () => {
  it('dia normal 08-12 / 13-17: sem extra, atraso nem falta', () => {
    expect(dia(['08:00', '12:00', '13:00', '17:00'])).toMatchObject({ trabalhado: 480, he50: 0, atraso: 0, saidaAntecipada: 0, falta: 0, saldo: 0 });
  });

  it('saída às 19:00: 120 min de hora extra 50%', () => {
    expect(dia(['08:00', '12:00', '13:00', '19:00'])).toMatchObject({ trabalhado: 600, he50: 120, saldo: 120 });
  });

  it('entrada às 07:30 também vira 30 min de hora extra', () => {
    expect(dia(['07:30', '12:00', '13:00', '17:00'])).toMatchObject({ trabalhado: 510, he50: 30 });
  });

  it('entrada às 08:30: 30 min de atraso e saldo -30', () => {
    expect(dia(['08:30', '12:00', '13:00', '17:00'])).toMatchObject({ trabalhado: 450, atraso: 30, saldo: -30, falta: 0 });
  });

  it('saída às 16:30: 30 min de saída antecipada', () => {
    expect(dia(['08:00', '12:00', '13:00', '16:30'])).toMatchObject({ saidaAntecipada: 30, saldo: -30 });
  });

  it('08:03 está dentro da tolerância de 5 min: não conta atraso nem saldo', () => {
    expect(dia(['08:03', '12:00', '13:00', '17:00'])).toMatchObject({ atraso: 0, saldo: 0 });
  });

  it('08:06 passa da tolerância por batida (5 min): conta 6 min de atraso', () => {
    expect(dia(['08:06', '12:00', '13:00', '17:00'])).toMatchObject({ atraso: 6 });
  });

  it('duas batidas de 5 min (entrada e volta do almoço) somam 10: ainda dentro; 11 estoura', () => {
    expect(dia(['08:05', '12:00', '13:05', '17:00']).atraso).toBe(0);
    expect(dia(['08:05', '12:00', '13:06', '17:00']).atraso).toBe(11);
  });

  it('sem nenhuma batida em dia útil: falta de 480 min', () => {
    expect(dia(null)).toMatchObject({ falta: 480, saldo: -480 });
  });

  it('sábado (descanso) trabalhado 08-12: 240 min de hora extra 100%, sem desconto de pausa', () => {
    expect(dia(['08:00', '12:00'], 'descanso')).toMatchObject({ trabalhado: 240, he100: 240, he50: 0, falta: 0 });
  });

  it('descanso sem batida não gera falta', () => {
    expect(dia(null, 'descanso')).toMatchObject({ falta: 0, he100: 0 });
  });

  it('turno noturno 20:00-05:00 com pausa 00:00-01:00: 360 min noturnos reais viram 411 de hora ficta', () => {
    const noturna = { entrada: '20:00', saidaAlmoco: '00:00', voltaAlmoco: '01:00', saida: '05:00', minutosDia: 480, noturno: true };
    expect(minutosNoturnos(1200, 1440)).toBe(120);
    expect(dia(['20:00', '+00:00', '+01:00', '+05:00'], 'util', noturna)).toMatchObject({ trabalhado: 480, noturnoHoraFicta: 411, he50: 0, atraso: 0, saldo: 0, falta: 0 });
  });

  it('somarDias soma todos os campos que vão para a folha', () => {
    const t = somarDias([dia(['08:00', '12:00', '13:00', '19:00']), dia(['08:30', '12:00', '13:00', '17:00']), dia(null)]);
    expect(t).toEqual({ he50: 120, he100: 0, noturno: 0, atrasos: 30, saidasAntecipadas: 0, faltas: 480 });
  });
});
