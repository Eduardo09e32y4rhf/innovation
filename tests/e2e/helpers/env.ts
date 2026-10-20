export const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3001';
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3333';
export const PASSWORD = process.env.E2E_PASSWORD ?? 'LoadTest@123';

export const USERS = {
  admin: { email: process.env.E2E_ADMIN_EMAIL ?? 'e2e.admin@innovation.local', label: 'ADMIN' },
  func: { email: process.env.E2E_FUNC_EMAIL ?? 'e2e.func@innovation.local', label: 'FUNCIONARIO' },
} as const;
export type UserKey = keyof typeof USERS;

// Telas oficiais do escopo P1 (largura x altura).
export const VIEWPORTS = [
  { name: '360', width: 360, height: 740 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1920', width: 1920, height: 1080 },
] as const;

// Navegadores sem motor real no container: emulados por user agent + toque via CDP (Chromium).
export const EMULATED_DEVICES = [
  { name: 'iOS Safari (emulado)', width: 390, height: 844, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' },
  { name: 'Samsung Internet (emulado)', width: 412, height: 915, ua: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36' },
] as const;
