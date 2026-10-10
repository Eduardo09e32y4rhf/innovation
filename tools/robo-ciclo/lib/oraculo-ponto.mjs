/**
 * ORÁCULO DO PONTO (um dia). Escrito só a partir das regras do produto (jornada, tolerância da CLT art. 58 §1º, hora extra,
 * adicional noturno com hora de 52min30s), sem importar nada do sistema. O robô lança batidas conhecidas e compara
 * o que o sistema calculou com o que sai daqui.
 *
 * Horários em minutos desde 00:00 do dia da batida (podem passar de 1440 quando viram a madrugada).
 */
export const hhmm = (texto) => { const [h, m] = texto.split(':').map(Number); return h * 60 + (m || 0); };

const TOLERANCIA_POR_BATIDA = 5;   // CLT art. 58 §1º: até 5 min por marcação…
const TOLERANCIA_DIA = 10;         // …e até 10 min no dia
const HORA_NOTURNA = 60 / 52.5;    // cada minuto noturno vale 60/52,5 minutos de hora noturna

/** Aplica a tolerância: desvios todos <= 5 e somando <= 10 não contam. */
function contar(desvios) {
  const lista = desvios.filter((v) => v > 0);
  if (!lista.length) return 0;
  const dentro = lista.every((v) => v <= TOLERANCIA_POR_BATIDA) && lista.reduce((s, v) => s + v, 0) <= TOLERANCIA_DIA;
  return dentro ? 0 : lista.reduce((s, v) => s + v, 0);
}

/** Minutos noturnos reais dentro de [inicio, fim) (minutos desde 00:00 do dia 1), noite = 22:00-05:00. */
export function minutosNoturnos(inicio, fim) {
  let total = 0;
  for (let t = inicio; t < fim; t++) {
    const m = ((t % 1440) + 1440) % 1440;
    if (m >= 22 * 60 || m < 5 * 60) total++;
  }
  return total;
}

/**
 * @param {object} d
 * @param {string[]|null} d.batidas  ['08:00','12:00','13:00','17:00'] (4 batidas) ou ['08:00','12:00'] (2) ou null/[] para sem batida. Use '+HH:MM' para o dia seguinte.
 * @param {'util'|'descanso'} d.tipoDia
 * @param {{entrada:string,saidaAlmoco:string,voltaAlmoco:string,saida:string,minutosDia:number,noturno?:boolean}} d.jornada
 */
export function oraculoDia({ batidas, tipoDia, jornada }) {
  const out = { trabalhado: 0, he50: 0, he100: 0, noturnoHoraFicta: 0, atraso: 0, saidaAntecipada: 0, falta: 0, saldo: 0 };
  const convert = (t) => (t.startsWith('+') ? hhmm(t.slice(1)) + 1440 : hhmm(t));
  const marcas = (batidas ?? []).map(convert).sort((a, b) => a - b);
  const esperado = tipoDia === 'descanso' ? 0 : jornada.minutosDia;

  if (marcas.length < 2) {
    if (tipoDia === 'descanso') return out;
    out.falta = esperado; out.saldo = -esperado; return out;
  }
  const entrada = marcas[0], saida = marcas[marcas.length - 1];
  const intervalos = marcas.length >= 4 ? [[entrada, marcas[1]], [marcas[2], saida]] : [[entrada, saida]];
  const bruto = intervalos.reduce((s, [a, b]) => s + (b - a), 0);
  // Sem marcação de almoço, desconta a pausa da jornada (só se a jornada passa de 6h).
  const pausaPadrao = hhmm(jornada.voltaAlmoco) - hhmm(jornada.saidaAlmoco);
  out.trabalhado = marcas.length >= 4 ? bruto : Math.max(0, bruto - (esperado > 360 ? pausaPadrao : 0));

  if (jornada.noturno) out.noturnoHoraFicta = Math.round(intervalos.reduce((s, [a, b]) => s + minutosNoturnos(a, b), 0) * HORA_NOTURNA);

  if (tipoDia === 'descanso') { out.he100 = out.trabalhado; out.saldo = out.trabalhado; return out; }

  const eEntrada = hhmm(jornada.entrada), eSaida = hhmm(jornada.saida) + (hhmm(jornada.saida) <= hhmm(jornada.entrada) ? 1440 : 0);
  const eAlmocoIni = hhmm(jornada.saidaAlmoco) + (hhmm(jornada.saidaAlmoco) < eEntrada ? 1440 : 0);
  const eAlmocoFim = hhmm(jornada.voltaAlmoco) + (hhmm(jornada.voltaAlmoco) < eEntrada ? 1440 : 0);
  const atrasos = [Math.max(0, entrada - eEntrada), marcas.length >= 4 ? Math.max(0, marcas[2] - eAlmocoFim) : 0];
  const antecipadas = [Math.max(0, eSaida - saida), marcas.length >= 4 ? Math.max(0, eAlmocoIni - marcas[1]) : 0];
  const extras = [Math.max(0, eEntrada - entrada), Math.max(0, saida - eSaida)];

  out.atraso = contar(atrasos);
  out.saidaAntecipada = contar(antecipadas);
  out.he50 = contar(extras);
  let saldo = out.trabalhado - esperado;
  if (saldo < 0 && contar([...atrasos, ...antecipadas]) === 0) saldo = 0;
  if (saldo > 0 && contar(extras) === 0) saldo = 0;
  out.saldo = saldo;
  return out;
}

/** Soma os dias de um funcionário nos totais que alimentam a folha. */
export function somarDias(dias) {
  const t = { he50: 0, he100: 0, noturno: 0, atrasos: 0, saidasAntecipadas: 0, faltas: 0 };
  for (const d of dias) { t.he50 += d.he50; t.he100 += d.he100; t.noturno += d.noturnoHoraFicta; t.atrasos += d.atraso; t.saidasAntecipadas += d.saidaAntecipada; t.faltas += d.falta; }
  return t;
}
