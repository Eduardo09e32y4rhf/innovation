const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

export function saoPauloDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function saoPauloMonthKey(date = new Date()): string {
  return saoPauloDateKey(date).slice(0, 7);
}
