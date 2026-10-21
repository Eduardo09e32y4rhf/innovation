import { describe, expect, it } from 'vitest';
import { parseUserAgent } from './user-agent';

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const ANDROID_TABLET = 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36';

describe('parseUserAgent', () => {
  it('reconhece dispositivo e navegador comuns', () => {
    expect(parseUserAgent(CHROME_WIN)).toEqual({ bot: false, device: 'desktop', browser: 'Chrome' });
    expect(parseUserAgent(SAFARI_IPHONE)).toEqual({ bot: false, device: 'mobile', browser: 'Safari' });
    expect(parseUserAgent(CHROME_ANDROID)).toEqual({ bot: false, device: 'mobile', browser: 'Chrome' });
    expect(parseUserAgent(ANDROID_TABLET).device).toBe('tablet');
    expect(parseUserAgent(SAMSUNG).browser).toBe('Samsung');
    expect(parseUserAgent(CHROME_WIN + ' Edg/126.0').browser).toBe('Edge');
    expect(parseUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0').browser).toBe('Firefox');
  });

  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0)',
    'curl/8.5.0',
    'python-requests/2.31',
    'WhatsApp/2.24.1',
    'Mozilla/5.0 HeadlessChrome/126.0',
    'Chrome-Lighthouse',
    'axios/1.6.0',
    '',
  ])('descarta robo/ferramenta: %j', (agent) => {
    expect(parseUserAgent(agent).bot).toBe(true);
  });

  it('trata ausencia de user-agent como robo', () => {
    expect(parseUserAgent(undefined).bot).toBe(true);
  });
});
