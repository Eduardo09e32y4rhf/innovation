// Escuta tudo o que da errado por baixo da tela: erros de JavaScript, chamadas ao servidor que falham, etc.

const IGNORAR_URL = [/favicon/i, /\/_next\/static\/webpack/i, /hot-update/i, /google-analytics|googletagmanager|sentry\.io/i];
const IGNORAR_CONSOLE = [/^Failed to load resource/i, /ResizeObserver loop/i, /Download the React DevTools/i, /\[Fast Refresh\]/i];

export function anexarColetor(page) {
  const eventos = [];
  page.on('console', (mensagem) => {
    if (mensagem.type() !== 'error') return;
    const texto = mensagem.text();
    if (IGNORAR_CONSOLE.some((regra) => regra.test(texto))) return; // respostas HTTP ja entram em "response"
    eventos.push({ tipo: 'console', texto, url: page.url() });
  });
  page.on('pageerror', (erro) => eventos.push({ tipo: 'pageerror', texto: erro.message, url: page.url() }));
  page.on('response', (resposta) => {
    const status = resposta.status();
    if (status < 400) return;
    const alvo = resposta.url();
    if (IGNORAR_URL.some((regra) => regra.test(alvo))) return;
    eventos.push({ tipo: 'http', status, metodo: resposta.request().method(), alvo, url: page.url() });
  });
  page.on('requestfailed', (requisicao) => {
    const motivo = requisicao.failure()?.errorText ?? 'falha';
    if (/ERR_ABORTED/i.test(motivo)) return; // navegacao que mudou de ideia: normal
    if (IGNORAR_URL.some((regra) => regra.test(requisicao.url()))) return;
    eventos.push({ tipo: 'rede', texto: motivo, alvo: requisicao.url(), url: page.url() });
  });
  return { drenar: () => eventos.splice(0) };
}