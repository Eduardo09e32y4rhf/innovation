import { API_URL, WEB_URL } from './env';

const ROUTES = ['/login', '/carreiras'];

// Confere que API e front estao no ar e aquece as rotas do `next dev` (a primeira compilacao leva 5-25 s).
export default async function globalSetup() {
  const api = await fetch(`${API_URL}/health`).catch(() => null);
  if (!api?.ok) throw new Error(`API fora do ar em ${API_URL}. Suba a API antes de rodar os fluxos (ver tests-e2e/README.md).`);
  const web = await fetch(`${WEB_URL}/login`, { signal: AbortSignal.timeout(120_000) }).catch(() => null);
  if (!web?.ok) throw new Error(`Front fora do ar em ${WEB_URL}. Rode: NEXT_PUBLIC_API_URL=${API_URL} next dev -p 3000 em apps/web.`);
  await Promise.all(ROUTES.map((route) => fetch(`${WEB_URL}${route}`, { signal: AbortSignal.timeout(120_000) }).catch(() => null)));
}
