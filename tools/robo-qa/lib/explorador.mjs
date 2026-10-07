import { clicar, passo } from './acoes.mjs';

// Em modo "leitura" o robo NUNCA aperta nada que crie, altere, apague, cobre ou envie algo.
const PERIGOSO = /(excluir|apagar|remover|arquivar|cancelar (assinatura|contrato|empresa)|purg|suspender|bloquear|desativar|revogar|encerrar|sair|logout|resetar|redefinir|reemitir|emitir|pagar|cobrar|reembolsar|enviar|salvar|confirmar|aprovar|devolver|contratar|encaminhar|selecionar candidato|gerar link|criar|importar|baixar|exportar|assinar|checkout|acesso assistido|ghost)/i;

const SELETOR = 'main button:visible, main [role="tab"]:visible, main summary:visible, main [role="button"]:visible';

async function rotulosClicaveis(ctx) {
  return ctx.page.evaluate((seletor) => {
    const visivel = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    return [...document.querySelectorAll(seletor.replace(/:visible/g, ''))].filter(visivel).map((el, i) => ({
      i,
      rotulo: (el.innerText || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim(),
      desabilitado: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
    }));
  }, SELETOR).catch(() => []);
}

async function fecharJanelas(ctx) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const aberta = await ctx.page.locator('[role="dialog"]:visible, .fixed.inset-0:visible').count().catch(() => 0);
    if (!aberta) return;
    await ctx.page.keyboard.press('Escape').catch(() => {});
    await ctx.page.waitForTimeout(250).catch(() => {});
    const ainda = await ctx.page.locator('[role="dialog"]:visible, .fixed.inset-0:visible').count().catch(() => 0);
    if (!ainda) return;
    const fechar = ctx.page.locator('[role="dialog"]:visible button, .fixed.inset-0:visible button').filter({ hasText: /cancelar|fechar|voltar|^×$|^x$/i }).first();
    if (await fechar.count().catch(() => 0)) await fechar.click({ timeout: 2000 }).catch(() => {});
  }
}

/**
 * Passeia pela tela atual apertando o que e seguro (abas, filtros, abrir detalhes, "Novo ..." sem salvar).
 * Cada clique e um passo: se algo quebrar, o relatorio diz qual botao foi.
 */
export async function explorarPagina(ctx, nomePagina, { max = 18 } = {}) {
  const inicio = ctx.page.url();
  const vistos = new Set();
  const lista = await rotulosClicaveis(ctx);
  let feitos = 0;
  for (const item of lista) {
    if (feitos >= max) break;
    if (!item.rotulo || item.desabilitado) continue;
    if (ctx.modo !== 'completo' && PERIGOSO.test(item.rotulo)) continue;
    const chave = item.rotulo.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    feitos++;
    await passo(ctx, `${nomePagina}: clicar em "${item.rotulo.slice(0, 50)}"`, async () => {
      const atual = ctx.page.locator(SELETOR).nth(item.i);
      const texto = ((await atual.innerText({ timeout: 3000 }).catch(() => '')) || (await atual.getAttribute('aria-label').catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (texto && texto !== item.rotulo) return; // a tela mudou de lugar: nao clica no botao errado
      await clicar(ctx, atual, `"${item.rotulo.slice(0, 50)}"`, { timeout: 4000 });
      await ctx.page.waitForTimeout(350);
    });
    await fecharJanelas(ctx);
    if (ctx.page.url().split('#')[0] !== inicio.split('#')[0]) {
      const mesmaRota = new URL(ctx.page.url()).pathname === new URL(inicio).pathname;
      if (!mesmaRota) { await ctx.page.goto(inicio, { waitUntil: 'domcontentloaded' }).catch(() => {}); await ctx.page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {}); }
    }
  }
  return feitos;
}