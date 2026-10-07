import type { EventoTecnico } from './explicacoes';

// Escuta tudo o que da errado por baixo da tela: erros de JavaScript e chamadas ao servidor que falham.

const IGNORAR_CONSOLE = [/ResizeObserver loop/i, /Download the React DevTools/i, /\[Fast Refresh\]/i, /^Failed to load resource/i];
// 401 em rotas de sessao e normal (usuario saindo/entrando): nao e defeito.
const IGNORAR_HTTP = [/\/auth\/(refresh|me|session|logout)/i, /\/users\/ping/i, /\/users\/activity\//i];

interface ColetorGlobal { eventos: EventoTecnico[]; pendentes: number }
declare global { interface Window { __roboColetor?: ColetorGlobal } }

const textoDe = (valor: unknown) => String((valor as { message?: string })?.message ?? valor ?? '');

export function instalarColetor() {
  if (window.__roboColetor) return window.__roboColetor;
  const estado: ColetorGlobal = { eventos: [], pendentes: 0 };
  window.__roboColetor = estado;

  window.addEventListener('error', (evento) => {
    const texto = textoDe(evento.error ?? evento.message);
    if (/ResizeObserver loop/i.test(texto)) return;
    estado.eventos.push({ tipo: 'pageerror', texto });
  });
  window.addEventListener('unhandledrejection', (evento) => {
    const texto = textoDe(evento.reason);
    if (/AbortError|aborted/i.test(texto)) return;
    estado.eventos.push({ tipo: 'pageerror', texto });
  });

  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const texto = args.map(textoDe).join(' ');
    if (!IGNORAR_CONSOLE.some((regra) => regra.test(texto))) estado.eventos.push({ tipo: 'console', texto: texto.slice(0, 400) });
    consoleError(...args);
  };

  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const alvo = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const metodo = (init?.method ?? (typeof entrada === 'object' && 'method' in entrada ? entrada.method : 'GET')).toUpperCase();
    estado.pendentes++;
    try {
      const resposta = await fetchOriginal(entrada, init);
      if (resposta.status >= 400 && !IGNORAR_HTTP.some((regra) => regra.test(alvo))) estado.eventos.push({ tipo: 'http', status: resposta.status, metodo, alvo });
      return resposta;
    } catch (erro) {
      const texto = textoDe(erro);
      if (!/AbortError|aborted/i.test(texto)) estado.eventos.push({ tipo: 'rede', texto, alvo });
      throw erro;
    } finally {
      estado.pendentes--;
    }
  };
  return estado;
}

export function drenarEventos(): EventoTecnico[] {
  return window.__roboColetor ? window.__roboColetor.eventos.splice(0) : [];
}
export const requisicoesPendentes = () => window.__roboColetor?.pendentes ?? 0;