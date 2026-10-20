import { API_URL, WEB_URL } from './env';

const ROUTES = ['/login', '/planos', '/carreiras', '/esqueci-senha'];

// Aquece as rotas do `next dev` (a primeira compilacao leva 5-25 s) e confere que API e front estao no ar.
export default async function globalSetup() {
  const api = await fetch(`${API_URL}/health`).catch(() => null);
  if (!api?.ok) throw new Error(`API fora do ar em ${API_URL}. Suba a API antes de rodar o E2E.`);
  const web = await fetch(`${WEB_URL}/login`, { signal: AbortSignal.timeout(120_000) }).catch(() => null);
  if (!web?.ok) throw new Error(`Front fora do ar em ${WEB_URL}. Rode: NEXT_PUBLIC_API_URL=${API_URL} next dev -p 3001 em apps/web.`);
  await Promise.all(ROUTES.map((r) => fetch(`${WEB_URL}${r}`, { signal: AbortSignal.timeout(120_000) }).catch(() => null)));
}
