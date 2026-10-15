/** Mesmo criterio do servidor (apps/api/src/common/utils/meeting-link.ts): so links https. */
export type MeetingInput = { ok: boolean; value: string | null; error: string | null };
export function normalizeMeetingInput(raw: string): MeetingInput {
  const value = raw.trim();
  if (!value) return { ok: true, value: null, error: null };
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || !url.hostname.includes('.') || candidate.length > 600) return { ok: false, value: null, error: 'Use um link https da reunião (Teams, Meet, Zoom...).' };
    return { ok: true, value: url.toString(), error: null };
  } catch {
    return { ok: false, value: null, error: 'Link inválido. Cole o endereço completo (https://...).' };
  }
}

export function meetingLabel(url: string | null | undefined): string {
  let host = '';
  try { host = new URL(String(url)).hostname.toLowerCase(); } catch { return 'Reunião online'; }
  if (host.endsWith('teams.microsoft.com') || host.endsWith('teams.live.com')) return 'Teams';
  if (host === 'meet.google.com') return 'Google Meet';
  if (host.endsWith('zoom.us') || host.endsWith('zoom.com')) return 'Zoom';
  if (host.endsWith('webex.com')) return 'Webex';
  return 'Reunião online';
}
