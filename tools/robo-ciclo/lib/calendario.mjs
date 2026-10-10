/**
 * Calendário próprio do robô (independente do sistema): feriados nacionais, dias úteis e descanso de um mês.
 * Serve para escolher um mês sem feriado e para calcular, por outro caminho, quantos dias úteis e de descanso a folha deve contar.
 */

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). Devolve Date em UTC. */
export function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const somar = (data, dias) => new Date(data.getTime() + dias * 86_400_000);
export const chave = (data) => data.toISOString().slice(0, 10);

/** Feriados nacionais fixos + Sexta-feira Santa + Corpus Christi + Carnaval (segunda e terça), como chaves AAAA-MM-DD. */
export function feriadosNacionais(ano) {
  const fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map((md) => `${ano}-${md}`);
  const p = pascoa(ano);
  const moveis = [somar(p, -48), somar(p, -47), somar(p, -2), somar(p, 60)].map(chave);
  return new Set([...fixos, ...moveis]);
}

/** Todos os dias (Date UTC à meia-noite) de um mês AAAA-MM. */
export function diasDoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  const total = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => new Date(Date.UTC(ano, m - 1, i + 1)));
}

/**
 * Classifica o mês para a folha de quem trabalha de segunda a sexta (descanso: sábado e domingo):
 * dias úteis (seg-sex sem feriado), sábados, domingos e feriados em dia útil.
 */
export function resumoDoMes(mes) {
  const [ano] = mes.split('-').map(Number);
  const feriados = feriadosNacionais(ano);
  const uteis = [], sabados = [], domingos = [], feriadosEmSemana = [];
  for (const dia of diasDoMes(mes)) {
    const dow = dia.getUTCDay();
    const feriado = feriados.has(chave(dia));
    if (dow === 0) domingos.push(dia);
    else if (dow === 6) sabados.push(dia);
    else if (feriado) feriadosEmSemana.push(dia);
    else uteis.push(dia);
  }
  // Regra do fechamento: DSR conta os domingos + os feriados do mês; dia útil pago exclui feriado.
  return { uteis, sabados, domingos, feriadosEmSemana, payableWorkdays: uteis.length, paidRestDays: domingos.length + feriadosEmSemana.length };
}

/** Mês mais recente, já terminado, sem nenhum feriado nacional em dia de semana (a folha fica sem ambiguidade). */
export function escolherMesDeReferencia(hoje = new Date(), maxVoltas = 14) {
  let ano = hoje.getUTCFullYear(), m = hoje.getUTCMonth(); // mês anterior ao atual (0-based -> m já é "mês anterior" em 1-based)
  for (let i = 0; i < maxVoltas; i++) {
    if (m === 0) { ano -= 1; m = 12; }
    const mes = `${ano}-${String(m).padStart(2, '0')}`;
    if (resumoDoMes(mes).feriadosEmSemana.length === 0) return mes;
    m -= 1;
  }
  throw new Error('Nenhum mês sem feriado encontrado nos últimos meses.');
}

export const ymd = chave;
