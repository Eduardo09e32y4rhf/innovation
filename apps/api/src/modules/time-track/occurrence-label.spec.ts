import { occurrenceLabel } from './occurrence-label';

describe('occurrenceLabel', () => {
  it('dia sem ocorrencia', () => {
    expect(occurrenceLabel(null)).toBe('Sem ocorrência');
    expect(occurrenceLabel({ incidentType: 'normal', lateMinutes: 0, earlyLeaveMinutes: 0 })).toBe('Sem ocorrência');
  });
  it('atraso e saida antecipada com os minutos', () => {
    expect(occurrenceLabel({ lateMinutes: 25 })).toBe('Ocorrência: atraso de 25 minutos');
    expect(occurrenceLabel({ lateMinutes: 1 })).toBe('Ocorrência: atraso de 1 minuto');
    expect(occurrenceLabel({ lateMinutes: 10, earlyLeaveMinutes: 30 })).toBe('Ocorrência: atraso de 10 minutos e saída antecipada de 30 minutos');
  });
  it('falta integral so quando nao houve marcacao', () => {
    expect(occurrenceLabel({ incidentType: 'falta', absenceMinutes: 480 })).toBe('Falta integral');
    expect(occurrenceLabel({ incidentType: 'falta', absenceMinutes: 480, entry: new Date() })).toBe('Ocorrência: ausência de 480 minutos');
  });
});
