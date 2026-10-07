import path from 'node:path';
import {
  EXPLICACAO_ERRO_NEXT, EXPLICACAO_TELA_BRANCA, explicacaoAvisoDeErro, explicacaoRolagemLateral,
  explicarEvento, explicarFalhaPasso,
} from './explicacoes.mjs';
import { falar } from './ui.mjs';

const pausa = (ctx, ms) => ctx.page.waitForTimeout(ms).catch(() => {});

/** Anda ate um endereco e espera a tela assentar. */
export async function ir(ctx, caminho, descricao) {
  await falar(ctx, descricao ?? `Abrindo ${caminho}`);
  const alvo = caminho.startsWith('http') ? caminho : `${ctx.baseUrl}${caminho}`;
  await ctx.page.goto(alvo, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ctx.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await pausa(ctx, ctx.ritmo.depois);
}

/** Clique "humano": mostra o cursor indo ate o botao, destaca, clica e mostra a onda. */
export async function clicar(ctx, localizador, descricao, { timeout = 8000 } = {}) {
  await falar(ctx, `Clicando em: ${descricao}`);
  const alvo = localizador.first();
  await alvo.waitFor({ state: 'visible', timeout });
  await alvo.scrollIntoViewIfNeeded({ timeout }).catch(() => {});
  const caixa = await alvo.boundingBox();
  if (caixa) {
    const x = caixa.x + caixa.width / 2;
    const y = caixa.y + caixa.height / 2;
    await ctx.page.evaluate((p) => { window.__robo?.mover(p.x, p.y); window.__robo?.destacar({ x: p.l, y: p.t, w: p.w, h: p.h }); }, { x, y, l: caixa.x, t: caixa.y, w: caixa.width, h: caixa.height }).catch(() => {});
    await pausa(ctx, ctx.ritmo.antes);
    await alvo.click({ timeout });
    await ctx.page.evaluate((p) => window.__robo?.clique(p.x, p.y), { x, y }).catch(() => {});
  } else {
    await alvo.click({ timeout });
  }
  await pausa(ctx, ctx.ritmo.depois);
}

export async function digitar(ctx, localizador, texto, descricao) {
  await falar(ctx, `Digitando em: ${descricao}`);
  const alvo = localizador.first();
  await alvo.waitFor({ state: 'visible', timeout: 8000 });
  await alvo.click();
  await alvo.fill('');
  await alvo.pressSequentially(texto, { delay: ctx.ritmo.digitacao });
  await pausa(ctx, ctx.ritmo.antes);
}

/** O que a tela mostra de errado agora (sem depender de erro tecnico). */
export async function verificarTela(ctx) {
  const achados = [];
  const dados = await ctx.page.evaluate(() => {
    const texto = (document.body?.innerText ?? '').trim();
    const alertas = [...document.querySelectorAll('[role="alert"]')].filter((el) => el.offsetParent !== null && el.innerText.trim()).map((el) => el.innerText.trim());
    return {
      tamanho: texto.length,
      erroNext: /Application error|Unhandled Runtime Error/i.test(texto) || Boolean(document.querySelector('nextjs-portal')),
      alertas,
      largura: document.documentElement.scrollWidth,
      janela: window.innerWidth,
    };
  }).catch(() => null);
  if (!dados) return achados;
  if (dados.tamanho < 15) achados.push({ ...EXPLICACAO_TELA_BRANCA, origem: 'tela' });
  if (dados.erroNext) achados.push({ ...EXPLICACAO_ERRO_NEXT, origem: 'tela' });
  for (const alerta of dados.alertas.slice(0, 2)) {
    if (ctx.esperaNegado && /acesso restrito|sem permiss|n[aã]o tem (autoriza|permiss)/i.test(alerta)) continue;
    achados.push({ ...explicacaoAvisoDeErro(alerta), origem: 'tela' });
  }
  if (dados.largura - dados.janela > 4) achados.push({ ...explicacaoRolagemLateral(dados.largura, dados.janela), origem: 'tela' });
  return achados;
}

let contadorTela = 0;
async function tirarFoto(ctx, rotulo) {
  try {
    const arquivo = `${String(++contadorTela).padStart(3, '0')}-${ctx.perfil}-${rotulo}`.replace(/[^\w.-]+/g, '-').slice(0, 80) + '.png';
    await ctx.page.screenshot({ path: path.join(ctx.pastaFotos, arquivo), fullPage: false });
    return `fotos/${arquivo}`;
  } catch { return null; }
}

/**
 * Um passo do teste: executa, olha a tela, junta os erros que apareceram por baixo e registra tudo.
 * opcoes.verificarTela=false para passos que sabidamente deixam a tela diferente (ex.: logout).
 */
export async function passo(ctx, nome, fn, opcoes = {}) {
  await falar(ctx, nome);
  let erro = null;
  try { await fn(); } catch (e) { erro = e; }
  await pausa(ctx, 150);
  const registro = { perfil: ctx.perfil, cenario: ctx.cenario, nome, status: erro ? 'falha' : 'ok', url: ctx.page.url(), achados: [], quando: new Date().toISOString() };
  if (erro) registro.achados.push({ ...explicarFalhaPasso(nome, erro), origem: 'passo', tecnico: String(erro?.message ?? erro).split('\n')[0] });
  for (const evento of ctx.coletor.drenar()) {
    if (ctx.esperaNegado && evento.tipo === 'http' && [401, 403].includes(evento.status)) continue;
    registro.achados.push({ ...explicarEvento(evento, { perfil: ctx.perfil }), origem: evento.tipo, tecnico: evento.alvo ? `${evento.metodo ?? ''} ${evento.alvo} → ${evento.status ?? evento.texto}`.trim() : evento.texto });
  }
  if (opcoes.verificarTela !== false && !erro) registro.achados.push(...await verificarTela(ctx));
  if (registro.achados.length) {
    registro.status = registro.status === 'falha' ? 'falha' : 'aviso';
    registro.foto = await tirarFoto(ctx, nome);
  }
  ctx.estado.passos.push(registro);
  for (const achado of registro.achados) ctx.estado.achados.push({ ...achado, perfil: ctx.perfil, cenario: ctx.cenario, passo: nome, url: registro.url, foto: registro.foto });
  ctx.relatorio?.aoVivo();
  return registro.achados.length === 0;
}

/** Registra um achado direto (ex.: vazamento de permissao), sem depender de erro tecnico. */
export async function registrarAchado(ctx, nome, achado) {
  const registro = { perfil: ctx.perfil, cenario: ctx.cenario, nome, status: 'falha', url: ctx.page.url(), achados: [{ ...achado, origem: 'regra' }], quando: new Date().toISOString() };
  registro.foto = await tirarFoto(ctx, nome);
  ctx.estado.passos.push(registro);
  ctx.estado.achados.push({ ...achado, origem: 'regra', perfil: ctx.perfil, cenario: ctx.cenario, passo: nome, url: registro.url, foto: registro.foto });
  ctx.relatorio?.aoVivo();
}