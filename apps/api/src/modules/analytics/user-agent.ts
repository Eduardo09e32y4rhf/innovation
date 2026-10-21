export type DeviceKind = 'mobile' | 'tablet' | 'desktop';

export interface ParsedAgent {
  bot: boolean;
  device: DeviceKind;
  browser: string;
}

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|monitor|uptime|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|go-http|java\/|okhttp|axios|node-fetch|undici|postman|insomnia|scrapy|httpclient|libwww|phantom/i;

export function parseUserAgent(raw: string | undefined): ParsedAgent {
  const ua = (raw ?? '').slice(0, 400);
  if (!ua.trim() || BOT.test(ua)) return { bot: true, device: 'desktop', browser: 'Outro' };

  const tablet = /ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua));
  const mobile = /mobi|iphone|ipod|android/i.test(ua);
  const device: DeviceKind = tablet ? 'tablet' : mobile ? 'mobile' : 'desktop';

  let browser = 'Outro';
  if (/edg(e|a|ios)?\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/chrome|crios|chromium/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && /version\//i.test(ua)) browser = 'Safari';

  return { bot: false, device, browser };
}
