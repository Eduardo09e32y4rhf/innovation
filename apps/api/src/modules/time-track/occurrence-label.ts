export interface OccurrenceInput {
  incidentType?: string | null;
  lateMinutes?: number | null;
  earlyLeaveMinutes?: number | null;
  absenceMinutes?: number | null;
  totalWorked?: number | null;
  entry?: Date | string | null;
  exit?: Date | string | null;
}

const plural = (minutes: number) => `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;

/** Texto automatico da ocorrencia do dia, conforme o que o sistema validou (atraso, saida antecipada ou falta). */
export function occurrenceLabel(day: OccurrenceInput | null | undefined): string {
  if (!day) return 'Sem ocorrência';
  const late = Math.max(0, day.lateMinutes ?? 0);
  const early = Math.max(0, day.earlyLeaveMinutes ?? 0);
  const absence = Math.max(0, day.absenceMinutes ?? 0);
  if (day.incidentType === 'falta' && !day.entry && !day.exit) return 'Falta integral';
  const parts: string[] = [];
  if (late > 0) parts.push(`atraso de ${plural(late)}`);
  if (early > 0) parts.push(`saída antecipada de ${plural(early)}`);
  if (parts.length === 0 && absence > 0) parts.push(`ausência de ${plural(absence)}`);
  return parts.length ? `Ocorrência: ${parts.join(' e ')}` : 'Sem ocorrência';
}
