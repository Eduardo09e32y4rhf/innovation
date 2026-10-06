/** Fuso padrao da aplicacao (o mesmo usado nas escalas). Configuracao ausente cai aqui. */
export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

/** Hora (0-23) no fuso informado; fuso invalido volta ao padrao. */
export function hourInZone(date: Date, timeZone: string = DEFAULT_TIME_ZONE): number {
  const read = (zone: string) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: zone }).format(date));
  try { return read(timeZone); } catch { return read(DEFAULT_TIME_ZONE); }
}

/** Faixas unicas para todas as telas: 05-11 bom dia, 12-17 boa tarde, 18-04 boa noite. */
export function greetingForHour(hour: number): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Primeiro nome do usuario autenticado (trata espacos extras e nomes compostos); vazio quando nao ha nome. */
export function firstNameOf(name?: string | null): string {
  const first = String(name ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first) return '';
  return first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1).toLocaleLowerCase('pt-BR');
}

/** "Bom dia, Ana!" ou apenas "Ola!" quando nao ha nome. */
export function greetingText(name: string | null | undefined, now: Date = new Date(), timeZone: string = DEFAULT_TIME_ZONE): string {
  const first = firstNameOf(name);
  return first ? `${greetingForHour(hourInZone(now, timeZone))}, ${first}!` : 'Olá!';
}