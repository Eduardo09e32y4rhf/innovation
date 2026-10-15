import { describe, expect, it } from 'vitest';
import { InvalidMeetingLinkError, meetingProvider, normalizeMeetingUrl } from './meeting-link';

describe('links de reuniao', () => {
  it('aceita https e completa o protocolo', () => {
    expect(normalizeMeetingUrl('https://teams.microsoft.com/l/meetup-join/abc')).toBe('https://teams.microsoft.com/l/meetup-join/abc');
    expect(normalizeMeetingUrl('zoom.us/j/123?pwd=x')).toBe('https://zoom.us/j/123?pwd=x');
    expect(normalizeMeetingUrl('  ')).toBeNull();
    expect(normalizeMeetingUrl(null)).toBeNull();
  });
  it('recusa http, javascript, data e lixo', () => {
    for (const bad of ['http://meet.google.com/x', 'javascript:alert(1)', 'data:text/html,x', 'https://localhost/x', 'ftp://x.com']) {
      expect(() => normalizeMeetingUrl(bad)).toThrow(InvalidMeetingLinkError);
    }
  });
  it('reconhece o provedor', () => {
    expect(meetingProvider('https://teams.microsoft.com/l/x')).toBe('Microsoft Teams');
    expect(meetingProvider('https://meet.google.com/abc')).toBe('Google Meet');
    expect(meetingProvider('https://us02web.zoom.us/j/1')).toBe('Zoom');
    expect(meetingProvider('https://evil-zoom.us.example.com/x')).toBe('Reunião online');
    expect(meetingProvider('nada')).toBe('Reunião online');
  });
});
