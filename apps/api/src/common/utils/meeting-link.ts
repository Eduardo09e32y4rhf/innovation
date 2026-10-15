/** Links de reuniao online (Teams, Google Meet, Zoom, Webex...). So https: nada de javascript:, data: ou http. */
export class InvalidMeetingLinkError extends Error {}

const MAX = 600;

export function normalizeMeetingUrl(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let url: URL;
  try { url = new URL(candidate); } catch { throw new InvalidMeetingLinkError('Link da reunião inválido. Cole o endereço completo (https://...).'); }
  if (url.protocol !== 'https:' || !url.hostname.includes('.') || candidate.length > MAX) {
    throw new InvalidMeetingLinkError('Use um link https da reunião (Teams, Meet, Zoom...).');
  }
  return url.toString();
}

export function meetingProvider(url: string | null | undefined): string {
  const host = (() => { try { return new URL(String(url)).hostname.toLowerCase(); } catch { return ''; } })();
  if (host.endsWith('teams.microsoft.com') || host.endsWith('teams.live.com')) return 'Microsoft Teams';
  if (host === 'meet.google.com') return 'Google Meet';
  if (host.endsWith('zoom.us') || host.endsWith('zoom.com')) return 'Zoom';
  if (host.endsWith('webex.com')) return 'Webex';
  if (host.endsWith('whereby.com')) return 'Whereby';
  if (host.endsWith('jit.si')) return 'Jitsi';
  return 'Reunião online';
}
