import { clicar, ir, passo, registrarAchado, verificarTela } from '../lib/acoes.mjs';
import { explicacaoMenuFaltando, explicacaoMenuSobrando, explicacaoVazamento } from '../lib/explicacoes.mjs';
import { explorarPagina } from '../lib/explorador.mjs';
import { entrar } from './login.mjs';
import { esperadoPara } from './matriz.mjs';
import { cenariosEspecificos } from './funcionalidades.mjs';

const TEXTO_BLOQUEIO = /acesso restrito|sem permiss|n[aã]o tem (autoriza|permiss)|n[aã]o est[aá] dispon[ií]vel para (seu|o seu) perfil|n[aã]o tem acesso/i;

async function linksDoMenu(ctx) {
  return ctx.page.evaluate((tenant) => {
    const raiz = document.querySelector('aside, nav') ? [...document.querySelectorAll('aside a[href], nav a[href]')] : [...document.querySelectorAll('a[href]')];
    const limpos = raiz.map((a) => (a.getAttribute('href') || '').split('?')[0].replace(/\/$/, '')).filter((h) => h.startsWith(`/${tenant}/dashboard`));
    return [...new Set(limpos)];
  }, ctx.tenant).catch(() => []);
}

async function estaBloqueado(ctx, caminhoPedido) {
  const atual = new URL(ctx.page.url()).pathname.replace(/\/$/, '');
  if (atual !== caminhoPedido.replace(/\/$/, '')) return true; // mandou para outro lugar
  const texto = await ctx.page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
  return TEXTO_BLOQUEIO.test(texto);
}

export async function rodarPerfil(ctx, credencial, opcoes) {
  ctx.cenario = 'Entrada no sistema';
  let sessao = null;
  await passo(ctx, 'Entrar no sistema', async () => { sessao = await entrar(ctx, credencial); }, { verificarTela: false });
  if (!sessao) return;
  ctx.tenant = sessao.tenant;

  if (sessao.onboardingCEO) {
    ctx.cenario = 'Primeiro acesso do CEO';
    await passo(ctx, 'Tela de primeiro acesso do CEO carregou', async () => {
      const texto = await ctx.page.evaluate(() => document.body?.innerText ?? '');
      if (!/primeiro acesso do ceo/i.test(texto)) throw new Error('ESPERADO: a tela "Primeiro acesso do CEO" deveria aparecer, mas não apareceu.');
    });
    await explorarPagina(ctx, 'Primeiro acesso do CEO', { max: 6 });
    return;
  }

  const { permitidos, negados } = esperadoPara(ctx.perfil);
  const base = (item) => (item.exato ? `/${ctx.tenant}${item.caminho}` : `/${ctx.tenant}${item.caminho}`);

  ctx.cenario = 'Menu lateral';
  await ir(ctx, `/${ctx.tenant}/dashboard`, 'Voltando ao painel inicial');
  let links = [];
  await passo(ctx, 'Conferir se o menu mostra as funções certas para este perfil', async () => {
    links = await linksDoMenu(ctx);
    for (const item of permitidos) {
      if (!links.includes(base(item))) await registrarAchado(ctx, `Menu: ${item.nome}`, explicacaoMenuFaltando(ctx.perfil, item.nome));
    }
    for (const item of negados) {
      if (links.includes(base(item))) await registrarAchado(ctx, `Menu: ${item.nome}`, explicacaoMenuSobrando(ctx.perfil, item.nome));
    }
  });

  // Passeia por cada tela que o perfil pode usar
  const aPassear = [...permitidos, ...(opcoes.incertos ?? [])].filter((item) => links.includes(base(item)) || item.id === 'dashboard');
  for (const item of aPassear) {
    ctx.cenario = `Tela: ${item.nome}`;
    await passo(ctx, `Abrir ${item.nome} pelo menu`, async () => {
      const link = ctx.page.locator(`a[href="${base(item)}"]`).first();
      if (await link.count().catch(() => 0)) await clicar(ctx, link, `menu "${item.nome}"`);
      else await ir(ctx, base(item), `Abrindo ${item.nome}`);
      await ctx.page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    });
    await explorarPagina(ctx, item.nome, { max: opcoes.max });
  }

  // Funcoes especificas (Plataforma, Faturas, Vagas, painel do funcionario...)
  await cenariosEspecificos(ctx, { links, base, opcoes });

  // Telas bloqueadas: precisam realmente estar bloqueadas
  ctx.cenario = 'Telas que devem estar bloqueadas';
  for (const item of negados) {
    ctx.esperaNegado = true;
    await passo(ctx, `Tentar abrir ${item.nome} direto pelo endereço (deve ser bloqueado)`, async () => {
      await ir(ctx, base(item), `Digitando o endereço de ${item.nome} na barra do navegador`);
      await ctx.page.waitForTimeout(900);
      if (!(await estaBloqueado(ctx, base(item)))) await registrarAchado(ctx, `Bloqueio: ${item.nome}`, explicacaoVazamento(ctx.perfil, `${item.nome} (${base(item)})`));
    }, { verificarTela: false });
    ctx.esperaNegado = false;
  }

  // Celular
  if (opcoes.celular) {
    ctx.cenario = 'Celular (390 x 844)';
    await ctx.page.setViewportSize({ width: 390, height: 844 });
    for (const item of aPassear) {
      await passo(ctx, `No celular: ${item.nome} cabe na tela?`, async () => {
        await ir(ctx, base(item), `Abrindo ${item.nome} no tamanho de celular`);
        const achados = await verificarTela(ctx);
        for (const achado of achados) await registrarAchado(ctx, `Celular: ${item.nome}`, achado);
      }, { verificarTela: false });
    }
    await ctx.page.setViewportSize(opcoes.viewport);
  }
}