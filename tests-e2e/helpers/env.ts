export const WEB_URL = process.env.E2E_WEB_URL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3333';
export const PASSWORD = process.env.E2E_PASSWORD ?? 'LoadTest@123';

export const USERS = {
  admin: { email: process.env.E2E_ADMIN_EMAIL ?? 'e2e.admin@innovation.local', label: 'ADMIN' },
  func: { email: process.env.E2E_FUNC_EMAIL ?? 'e2e.func@innovation.local', label: 'FUNCIONARIO' },
} as const;
export type UserKey = keyof typeof USERS;

/** Tela do teste, no formato LARGURAxALTURA (padrao desktop 1280x800; celular: 360x740). */
const [width, height] = (process.env.E2E_VIEWPORT ?? '1280x800').split('x').map(Number);
export const VIEWPORT = { width: width || 1280, height: height || 800 };
export const VIEWPORT_KEY = `${VIEWPORT.width}x${VIEWPORT.height}`;
