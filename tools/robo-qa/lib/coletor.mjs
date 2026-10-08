// Escuta tudo o que da errado por baixo da tela: erros de JavaScript, chamadas ao servidor que falham, etc.

const IGNORAR_URL = [/favicon/i, /\/_next\/static\/webpack/i, /hot-update/i, /google-analytics|googletagmanager|sentry\.io/i];
const IGNORAR_CONSOLE = [/^Failed to load resource/i, /ResizeObserver loop/i, /Download the React DevTools/i, /\[Fast Refresh\]/i];

export function anexarColetor(page) {
  const eventos = [];
  const api = { total: 0, porStatus: {}, porRota: {}, lentas: [] };
  const inicio = new WeakMap();
  const ehApi = (url) => /\/api\//i.test(url) && !IGNORAR_URL.some((regra) => regra.test(url));
  page.on('console', (mensagem) => {
    if (mensagem.type() !== 'error') return;
    const texto = mensagem.text();
    if (IGNORAR_CONSOLE.some((regra) => regra.test(texto))) return; // respostas HTTP ja entram em "response"
    eventos.push({ tipo: 'console', texto, url: page.url() });
  });
  page.on('pageerror', (erro) => eventos.push({ tipo: 'pageerror', texto: erro.message, url: page.url() }));
  page.on('response', (resposta) => {
    const status = resposta.status();
    const alvo = resposta.url();
    if (IGNORAR_URL.some((regra) => regra.test(alvo))) return;
    const metodo = resposta.request().method();
    const duracaoMs = inicio.has(resposta.request()) ? Date.now() - inicio.get(resposta.request()) : undefined;
    if (ehApi(alvo)) {
      api.total++;
      api.porStatus[status] = (api.porStatus[status] ?? 0) + 1;
      const rota = (() => { try { return new URL(alvo).pathname; } catch { return alvo; } })();
      api.porRota[rota] = (api.porRota[rota] ?? 0) + 1;
      if (duracaoMs > 1500) api.lentas.push({ metodo, rota, status, duracaoMs });
    }
    if (status >= 400) eventos.push({ tipo: 'http', status, metodo, alvo, duracaoMs, url: page.url() });
  });
  page.on('request', (requisicao) => inicio.set(requisicao, Date.now()));
  page.on('requestfailed', (requisicao) => {
    const motivo = requisicao.failure()?.errorText ?? 'falha';
    if (/ERR_ABORTED/i.test(motivo)) return; // navegacao que mudou de ideia: normal
    if (IGNORAR_URL.some((regra) => regra.test(requisicao.url()))) return;
    eventos.push({ tipo: 'rede', texto: motivo, alvo: requisicao.url(), url: page.url() });
  });
  return { drenar: () => eventos.splice(0), resumoApi: () => structuredClone(api) };
}

