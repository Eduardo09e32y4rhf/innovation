import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { formatInterviewDate, googleCalendarUrl, interviewerLabel, mapsUrl, normalizeInterview } from './interview-rules';
import { candidateInterviewCanceledEmail, candidateInterviewEmail } from './recruitment-mails';

const now = new Date('2026-10-15T12:00:00Z');
const future = '2026-10-16T17:30:00.000Z'; // 14:30 em Brasilia

describe('normalizeInterview', () => {
  it('online exige link https e descarta endereco', () => {
    const result = normalizeInterview({ scheduledAt: future, mode: 'ONLINE', meetingUrl: 'meet.google.com/abc-defg-hij', location: 'Rua X' }, now);
    expect(result.mode).toBe('ONLINE');
    expect(result.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
    expect(result.location).toBeNull();
    expect(result.notifyCandidate).toBe(true);
    expect(result.durationMinutes).toBe(60);
    expect(() => normalizeInterview({ scheduledAt: future, mode: 'ONLINE' }, now)).toThrow(BadRequestException);
    expect(() => normalizeInterview({ scheduledAt: future, mode: 'ONLINE', meetingUrl: 'http://zoom.us/j/1' }, now)).toThrow(/https/);
    expect(() => normalizeInterview({ scheduledAt: future, mode: 'ONLINE', meetingUrl: 'javascript:alert(1)' }, now)).toThrow(BadRequestException);
  });

  it('presencial exige endereco e descarta link', () => {
    const result = normalizeInterview({ scheduledAt: future, mode: 'PRESENCIAL', location: '  Av. Paulista, 1000  ', meetingUrl: 'https://zoom.us/j/1', interviewerRole: 'GESTOR' }, now);
    expect(result.location).toBe('Av. Paulista, 1000');
    expect(result.meetingUrl).toBeNull();
    expect(result.kind).toBe('Entrevista com o gestor');
    expect(() => normalizeInterview({ scheduledAt: future, mode: 'PRESENCIAL', location: '   ' }, now)).toThrow(/endereço/);
  });

  it('nao envia convite para horario que ja passou, mas deixa registrar sem aviso', () => {
    const past = '2026-10-14T12:00:00.000Z';
    expect(() => normalizeInterview({ scheduledAt: past, mode: 'ONLINE', meetingUrl: 'https://meet.google.com/x' }, now)).toThrow(/já passou/);
    expect(normalizeInterview({ scheduledAt: past, mode: 'ONLINE', meetingUrl: 'https://meet.google.com/x', notifyCandidate: false }, now).notifyCandidate).toBe(false);
  });

  it('entrevista antiga (sem formato) continua aceita e nunca dispara e-mail', () => {
    const result = normalizeInterview({ scheduledAt: future, kind: 'Entrevista', location: 'Sala 2' }, now);
    expect(result.mode).toBeNull();
    expect(result.notifyCandidate).toBe(false);
    expect(result.location).toBe('Sala 2');
  });

  it('valida formato, duracao e com quem', () => {
    expect(() => normalizeInterview({ scheduledAt: future, mode: 'VIDEO' }, now)).toThrow(BadRequestException);
    expect(() => normalizeInterview({ scheduledAt: future, mode: 'ONLINE', meetingUrl: 'https://meet.google.com/x', durationMinutes: 5 }, now)).toThrow(/Duração/);
    expect(() => normalizeInterview({ scheduledAt: future, mode: 'ONLINE', meetingUrl: 'https://meet.google.com/x', interviewerRole: 'CEO' }, now)).toThrow(BadRequestException);
    expect(() => normalizeInterview({ scheduledAt: 'amanha' }, now)).toThrow(BadRequestException);
  });
});

describe('textos do convite', () => {
  it('data no horario de Brasilia, mesmo com o servidor em UTC', () => {
    const when = formatInterviewDate(new Date(future));
    expect(when.short).toBe('16/10 às 14:30');
    expect(when.long).toContain('16 de outubro de 2026 às 14:30');
  });

  it('link do Google Agenda com inicio, fim e fuso', () => {
    const url = new URL(googleCalendarUrl({ title: 'Entrevista', start: new Date(future), minutes: 45, details: 'x', location: 'Sala 1' }));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261016T173000Z/20261016T181500Z');
    expect(url.searchParams.get('ctz')).toBe('America/Sao_Paulo');
    expect(url.searchParams.get('location')).toBe('Sala 1');
  });

  it('quem entrevista', () => {
    expect(interviewerLabel('GESTOR', 'Ana')).toBe('Ana (o gestor da área)');
    expect(interviewerLabel('RH', null)).toBe('a equipe de RH');
    expect(interviewerLabel(null, null)).toBe('a equipe da empresa');
  });

  it('e-mail online tem botao da reuniao e escapa o recado', () => {
    const mail = candidateInterviewEmail({ name: 'João', company: 'ACME', jobTitle: 'Analista', when: formatInterviewDate(new Date(future)), durationMinutes: 60, mode: 'ONLINE', meetingUrl: 'https://meet.google.com/abc', meetingProvider: 'Google Meet', interviewer: 'a equipe de RH', message: '<script>x</script>', calendarUrl: 'https://calendar.google.com/x' });
    expect(mail.subject).toBe('Entrevista agendada: Analista · 16/10 às 14:30');
    expect(mail.html).toContain('Entrar na reunião');
    expect(mail.html).toContain('https://meet.google.com/abc');
    expect(mail.html).not.toContain('<script>');
    expect(mail.text).toContain('Link: https://meet.google.com/abc');
  });

  it('e-mail presencial tem endereco e mapa; cancelamento avisa a data', () => {
    const mail = candidateInterviewEmail({ name: 'Ana', company: 'ACME', jobTitle: 'Vendedor', when: formatInterviewDate(new Date(future)), durationMinutes: 30, mode: 'PRESENCIAL', location: 'Rua A, 10', mapsUrl: mapsUrl('Rua A, 10'), interviewer: 'Carlos (o gestor da área)', calendarUrl: 'https://calendar.google.com/x' });
    expect(mail.html).toContain('Rua A, 10');
    expect(mail.html).toContain('Como chegar');
    expect(mail.html).toContain('google.com/maps');
    const cancel = candidateInterviewCanceledEmail({ name: 'Ana', company: 'ACME', jobTitle: 'Vendedor', when: formatInterviewDate(new Date(future)) });
    expect(cancel.subject).toContain('cancelada');
    expect(cancel.text).toContain('16 de outubro');
  });
});
