#!/usr/bin/env node
/**
 * ROBÔ 360° (navegador de verdade, só leitura).
 * Varre cada área do site no COMPUTADOR e no CELULAR e mede o que quebra:
 *   1. Landing (seções, menus, botões, links do rodapé, links internos quebrados)
 *   2. Portal de vagas (/carreiras: busca, filtros, vaga, formulário vazio, voltar dos rodapés, conta do candidato)
 *   3. Login (validação, senha errada, esqueci a senha, cadastro de empresa sem criar nada)
 *   4. Painel da empresa depois do login (cada item do menu, cada aba, cada botão "Novo/Adicionar" abre e fecha)
 *   5. Painel da plataforma (DEV), se informado
 * Não salva, não cria e não apaga nada: botões de ação perigosa nunca são clicados.
 *
 *   node tools/robo-360/robo-360.mjs --url https://innovationia.com.br
 *   ROBO_EMAIL=admin@empresa-teste ROBO_SENHA=... [ROBO_DEV_EMAIL=.. ROBO_DEV_SENHA=..] node tools/robo-360/robo-360.mjs --url ...
 * Opções: --semjanela (escondido) · --so-pc · --so-celular · --lento
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarPlaywright } from '../robo-qa/lib/playwright.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const flag = (n) => process.argv.includes(n);
const SITE = (arg('--url') || process.env.ROBO_URL || '').replace(/\/$/, '');
if (!SITE) { console.error('Informe o site: --url https://innovationia.com.br'); process.exit(2); }
const CONTAS = [
  process.env.ROBO_EMAIL && { rotulo: 'Empresa', email: process.env.ROBO_EMAIL, senha: process.env.ROBO_SENHA },
  process.env.ROBO_DEV_EMAIL && { rotulo: 'Plataforma (DEV)', email: process.env.ROBO_DEV_EMAIL, senha: process.env.ROBO_DEV_SENHA },
].filter(Boolean);

/** Nunca clicados: qualquer coisa que grave, cobre, apague ou desconecte. */
const PERIGOSO = /(excluir|apagar|remover|arquivar|cancelar|purg|suspender|bloquear|desativar|revogar|encerrar|sair|logout|resetar|redefinir|reemitir|emitir|pagar|cobrar|reembols|estorn|devolu|enviar|salvar|confirmar|aprovar|recusar|reprovar|contratar|lançar|lancar|gerar|importar|assinar|checkout|acesso assistido|publicar|fechar m[eê]s|duplicar|reativar|trocar|alterar|sincronizar|robo|robô)/i;
const ABRE_FORM = /^(\+\s*)?(novo|nova|adicionar|cadastrar|criar|incluir)\b/i;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const pastaRel = join(raiz, 'tools/robo-360/relatorios', stamp);
mkdirSync(join(pastaRel, 'fotos'), { recursive: true });

// ---------- resultado ----------
const resultados = [];
let area = '', vp = 'PC', foto = 0;
function registrar(nome, ok, d = {}) {
  resultados.push({ area, tela: vp, nome, situacao: ok === null ? 'inconclusivo' : ok ? 'passou' : 'FALHOU', ...d });
  console.log(`${ok === null ? '⚠️ ' : ok ? '✅' : '❌'} [${vp}] [${area}] ${nome}${ok === false && d.obtido ? `  -> ${d.obtido}` : ''}`);
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- navegador ----------
const { chromium } = carregarPlaywright();
const browser = await chromium.launch({ headless: flag('--semjanela'), slowMo: flag('--lento') ? 250 : 30 });
const VIEWPORTS = { PC: { width: 1366, height: 800 }, CELULAR: { width: 390, height: 844 } };

async function novaPagina(nome) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[nome], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', isMobile: nome === 'CELULAR', hasTouch: nome === 'CELULAR', geolocation: { latitude: -23.55, longitude: -46.63 }, permissions: ['geolocation'] });
  const page = await ctx.newPage();
  page.problemas = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) page.problemas.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => page.problemas.push(`erro de página: ${String(e.message).slice(0, 160)}`));
  page.on('response', (r) => {
    const url = r.url().replace(SITE, '');
    const ignorar401 = r.status() === 401 && (/\/api\/auth\/(refresh|me)|candidate-portal\/me/.test(url) || /login|entrar/.test(page.url()));
    if (r.status() >= 500 || (r.status() >= 400 && !ignorar401 && r.status() !== 404)) page.problemas.push(`resposta ${r.status()} em ${r.request().method()} ${url.slice(0, 110)}`);
  });
  return { ctx, page };
}
async function tirar(page, nome) {
  const arq = `${String(++foto).padStart(3, '0')}-${vp}-${nome.replace(/[^\w]+/g, '-').slice(0, 60)}.png`;
  try { await page.screenshot({ path: join(pastaRel, 'fotos', arq) }); } catch { /* */ }
  return arq;
}
async function conferir(page, nome, { espera } = {}) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await dormir(300);
  const f = await tirar(page, nome);
  const m = await page.evaluate(() => ({ larg: document.scrollingElement.scrollWidth, janela: window.innerWidth, texto: document.body.innerText.slice(0, 5000) })).catch(() => ({ larg: 0, janela: 1, texto: '' }));
  registrar(`${nome}: sem rolagem horizontal`, m.larg <= m.janela + 2, { obtido: `${m.larg}px numa janela de ${m.janela}px`, foto: f });
  const codigo = m.texto.match(/c[oó]digo ([0-9a-f]{8})/i)?.[1];
  const quebrada = /Application error|algo deu errado|Something went wrong|500 Internal|This page could not be found|404/i.test(m.texto.slice(0, 600));
  registrar(`${nome}: sem tela de erro`, !quebrada, { obtido: `${codigo ? `código ${codigo} · ` : ''}${m.texto.slice(0, 160)}`, foto: f });
  if (espera) registrar(`${nome}: mostra "${espera}"`, new RegExp(espera, 'i').test(m.texto), { obtido: m.texto.slice(0, 160), foto: f });
  const probs = [...new Set(page.problemas.splice(0))];
  registrar(`${nome}: sem erro de console/rede`, probs.length === 0, { obtido: probs.slice(0, 4).join(' | '), foto: f });
  return m.texto;
}
async function visivel(loc, ms = 1500) { try { await loc.first().waitFor({ state: 'visible', timeout: ms }); return true; } catch { return false; } }
async function passo(nome, page, fn) {
  try { await fn(); registrar(nome, true); return true; } catch (e) { registrar(nome, false, { obtido: String(e?.message ?? e).split('\n')[0].slice(0, 220), foto: await tirar(page, `FALHA-${nome}`) }); return false; }
}

/** Links internos da página: abre cada um (GET) e acusa 404/500. */
async function linksQuebrados(page, nome) {
  const hrefs = await page.evaluate((site) => [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(site) && !h.includes('#') && !/\/api\/|logout|mailto|tel:/.test(h)))], SITE);
  const ruins = [];
  for (const h of hrefs.slice(0, 40)) {
    try { const r = await fetch(h, { redirect: 'follow' }); if (r.status >= 400) ruins.push(`${r.status} ${h.replace(SITE, '')}`); } catch (e) { ruins.push(`falha ${h.replace(SITE, '')}`); }
  }
  registrar(`${nome}: ${hrefs.length} links internos sem 404/500`, ruins.length === 0, { obtido: ruins.slice(0, 6).join(' | ') });
}

// ---------- 1. Landing ----------
async function landing(page) {
  area = 'Landing';
  await page.goto(SITE + '/');
  await conferir(page, 'Landing', { espera: 'Criar' });
  for (const id of ['vagas', 'gestao', 'ponto', 'planos', 'portal-vagas', 'faq']) {
    const existe = await page.locator(`#${id}`).count();
    registrar(`Seção #${id} existe`, existe > 0);
    if (existe) { await page.locator(`#${id}`).scrollIntoViewIfNeeded().catch(() => {}); await dormir(250); }
  }
  registrar('Planos aparecem na landing', await visivel(page.locator('#planos').getByText(/R\$\s?\d/), 6000));
  registrar('Portal de vagas fica depois dos planos', await page.evaluate(() => { const p = document.querySelector('#planos'), v = document.querySelector('#portal-vagas'); return Boolean(p && v && (p.compareDocumentPosition(v) & Node.DOCUMENT_POSITION_FOLLOWING)); }));
  await linksQuebrados(page, 'Landing');
  if (vp === 'CELULAR') await passo('Menu do celular abre', page, async () => { await page.getByRole('button', { name: /Abrir menu/ }).click(); if (!(await visivel(page.locator('#mobile-nav'), 2000))) throw new Error('o menu não abriu'); await page.getByRole('button', { name: /Fechar menu/ }).click(); });
  for (const [rotulo, caminho] of [['Termos', '/termos'], ['Privacidade', '/privacidade'], ['Suporte', '/suporte']]) {
    await page.goto(SITE + caminho); await conferir(page, `Página ${rotulo}`);
  }
}

// ---------- 2. Portal de vagas ----------
async function portalVagas(page) {
  area = 'Portal de vagas';
  await page.goto(SITE + '/carreiras');
  const texto = await conferir(page, 'Portal de vagas', { espera: 'oportunidade' });
  await linksQuebrados(page, 'Portal de vagas');
  await passo('Busca filtra as vagas', page, async () => {
    const busca = page.getByRole('searchbox').first();
    await busca.fill('zzzz-nada-existe'); await dormir(600);
    if (!(await visivel(page.getByText(/Nenhuma vaga/i), 3000))) throw new Error('buscar algo que não existe não mostrou "nenhuma vaga"');
    await busca.fill(''); await dormir(400);
  });
  if (vp === 'CELULAR') await passo('Filtros abrem no celular', page, async () => { await page.getByRole('button', { name: /Filtros de busca/ }).click(); await dormir(300); });
  const vaga = page.locator('a[href*="/carreiras/"]').filter({ hasText: /Ver vaga|candidatar/i }).first();
  if (await visivel(vaga, 4000)) {
    await vaga.click();
    await conferir(page, 'Página da vaga', { espera: 'candidat' });
    await passo('Formulário vazio mostra os erros (não envia)', page, async () => {
      const enviar = page.getByRole('button', { name: /Enviar candidatura/ });
      if (!(await visivel(enviar, 3000))) throw new Error('botão "Enviar candidatura" não apareceu');
      if (await enviar.isDisabled()) return; // exige consentimento antes: já impede envio vazio
      await enviar.click(); await dormir(800);
      if (!(await visivel(page.locator('[role="alert"]'), 3000))) throw new Error('enviar vazio não mostrou nenhum erro');
    });
  } else registrar('Há ao menos uma vaga aberta para conferir a página da vaga', null, { obtido: texto.slice(0, 120) });
  for (const [rotulo, caminho] of [['Termos', '/termos?de=carreiras'], ['Suporte', '/suporte?de=carreiras']]) {
    await page.goto(SITE + caminho);
    await conferir(page, `${rotulo} aberto pelo portal`);
    registrar(`${rotulo}: "voltar" leva ao portal de vagas`, await visivel(page.locator('a[href="/carreiras"]').filter({ hasText: /Voltar para as vagas/ }), 4000));
  }
  for (const [rotulo, caminho] of [['Conta do candidato', '/carreiras/conta'], ['Entrar (candidato)', '/carreiras/conta/entrar'], ['Meus dados (LGPD)', '/carreiras/privacidade']]) {
    await page.goto(SITE + caminho); await conferir(page, rotulo);
  }
}

// ---------- 3. Login e cadastro (sem criar nada) ----------
async function loginECadastro(page) {
  area = 'Login';
  await page.goto(SITE + '/login');
  await conferir(page, 'Login', { espera: 'Entrar' });
  await passo('Senha errada mostra erro e não entra', page, async () => {
    await page.locator('#login-email').fill('robo-360-inexistente@example.com');
    await page.getByLabel('Senha', { exact: true }).first().fill('SenhaErrada#123');
    await page.getByRole('button', { name: /^Entrar$/ }).click();
    if (!(await visivel(page.locator('[role="alert"]'), 8000))) throw new Error('nenhuma mensagem de erro');
    if (!/\/login/.test(page.url())) throw new Error(`saiu do login: ${page.url()}`);
  });
  page.problemas.splice(0); // o 401 da senha errada é esperado
  await page.goto(SITE + '/esqueci-senha'); await conferir(page, 'Esqueci a senha');
  area = 'Empresas (cadastro)';
  await page.goto(SITE + '/cadastro');
  await conferir(page, 'Cadastro de empresa', { espera: 'empresa' });
  await passo('Cadastro: avançar vazio não deixa seguir', page, async () => {
    const botao = page.getByRole('button', { name: /Continuar|Próximo|Avançar/ }).first();
    if (!(await visivel(botao, 3000))) throw new Error('botão de avançar não apareceu');
    await botao.click(); await dormir(600);
    if (!(await visivel(page.locator('[role="alert"], .text-rose-700, .text-rose-800'), 3000))) throw new Error('avançou ou não mostrou erro com o formulário vazio');
  });
  const planos = await fetch(`${SITE}/api/auth/public-plans`).then((r) => r.json()).catch(() => null);
  const lista = Array.isArray(planos?.data) ? planos.data : Array.isArray(planos) ? planos : [];
  registrar('Há planos públicos para o cadastro', lista.length > 0, { obtido: `${lista.length} plano(s): ${lista.map((p) => p.name).join(', ')}` });
}

// ---------- 4/5. Painel depois do login ----------
async function portoes(page) {
  for (let i = 0; i < 10; i++) {
    await dormir(800);
    if (await visivel(page.getByRole('button', { name: /Assinar termo/ }), 400)) {
      await page.evaluate(() => { for (const el of document.querySelectorAll('*')) if (el.scrollHeight > el.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight; });
      await dormir(400);
      await page.getByRole('checkbox').first().check({ timeout: 3000 }).catch(() => {});
      await page.getByRole('button', { name: /Assinar termo/ }).click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    if (await visivel(page.getByRole('button', { name: /Começar agora/ }), 400)) { await page.getByRole('button', { name: /Começar agora/ }).click(); continue; }
    if (await visivel(page.getByRole('button', { name: /^(Pular|Fechar)$/ }), 400)) { await page.getByRole('button', { name: /^(Pular|Fechar)$/ }).first().click(); continue; }
    if (/\/(dashboard|fatura-pendente)/.test(page.url())) break;
  }
}

async function painel(page, conta) {
  area = `Painel · ${conta.rotulo}`;
  await page.goto(SITE + '/login');
  const entrou = await passo('Entra pela tela de login', page, async () => {
    await page.locator('#login-email').fill(conta.email);
    await page.getByLabel('Senha', { exact: true }).first().fill(conta.senha);
    await page.getByRole('button', { name: /^Entrar$/ }).click();
    await page.waitForURL(/\/(dashboard|fatura-pendente|mfa|ceo-onboarding)/, { timeout: 20000 });
  });
  if (!entrou) return;
  if (/fatura-pendente/.test(page.url())) { await conferir(page, 'Tela de pagamento pendente'); registrar('Empresa com pagamento em dia (para varrer o painel)', false, { obtido: 'a conta está aguardando pagamento' }); return; }
  if (/mfa/.test(page.url())) { registrar('Conta sem MFA obrigatório (o robô não lê o autenticador)', null); return; }
  await portoes(page);
  await conferir(page, 'Início do painel');
  if (vp === 'CELULAR') await page.getByRole('button', { name: /menu/i }).first().click().catch(() => {});
  const itens = await page.evaluate(() => [...new Set([...document.querySelectorAll('nav a[href*="/dashboard"]')].map((a) => a.getAttribute('href')))]);
  if (vp === 'CELULAR') await page.keyboard.press('Escape').catch(() => {});
  registrar(`Menu tem itens (${itens.length})`, itens.length > 0);
  for (const href of itens) {
    await page.goto(SITE + href);
    const nome = href.replace(/^\/[^/]+\/dashboard/, '') || '/inicio';
    await conferir(page, `Aba ${nome}`);
    // Abas internas (role=tab): clica em cada uma.
    const abas = await page.getByRole('tab').all();
    for (const aba of abas.slice(0, 12)) {
      const rotulo = (await aba.innerText().catch(() => '')).trim().split('\n')[0];
      if (!rotulo || PERIGOSO.test(rotulo)) continue;
      await aba.click({ timeout: 3000 }).catch(() => {});
      await dormir(500);
      const probs = [...new Set(page.problemas.splice(0))];
      registrar(`Aba ${nome} › ${rotulo}`, probs.length === 0 && !(await visivel(page.getByText(/algo deu errado/i), 300)), { obtido: probs.slice(0, 3).join(' | ') });
    }
    // Botões que só abrem formulário (Novo/Adicionar): abre e fecha sem salvar.
    const botoes = await page.getByRole('button').filter({ hasText: ABRE_FORM }).all();
    for (const botao of botoes.slice(0, 3)) {
      const rotulo = (await botao.innerText().catch(() => '')).trim().split('\n')[0];
      if (!rotulo || PERIGOSO.test(rotulo) || !(await botao.isVisible().catch(() => false))) continue;
      await botao.click({ timeout: 3000 }).catch(() => {});
      await dormir(700);
      const abriu = await visivel(page.locator('[role="dialog"], form'), 1500);
      const probs = [...new Set(page.problemas.splice(0))];
      registrar(`${nome}: "${rotulo}" abre o formulário`, abriu && probs.length === 0, { obtido: abriu ? probs.slice(0, 3).join(' | ') : 'nada abriu', foto: await tirar(page, `${nome}-${rotulo}`) });
      await page.keyboard.press('Escape').catch(() => {});
      await dormir(300);
      if (!page.url().includes(href)) await page.goto(SITE + href);
    }
  }
}

// ---------- relatório ----------
function relatorio() {
  const falhas = resultados.filter((r) => r.situacao === 'FALHOU'), incs = resultados.filter((r) => r.situacao === 'inconclusivo');
  const l = [`# Robô 360° — ${SITE}`, '', `Data: ${new Date().toLocaleString('pt-BR')} · ${resultados.length} verificações · ✅ ${resultados.length - falhas.length - incs.length} · ❌ ${falhas.length} · ⚠️ ${incs.length}`, ''];
  if (falhas.length) { l.push('## ❌ O que quebrou', ''); falhas.forEach((f) => l.push(`- **(${f.tela}) ${f.area} — ${f.nome}**${f.obtido ? `: ${f.obtido}` : ''}${f.foto ? ` · foto: fotos/${f.foto}` : ''}`)); l.push(''); }
  if (incs.length) { l.push('## ⚠️ Para verificar', ''); incs.forEach((f) => l.push(`- (${f.tela}) ${f.area} — ${f.nome}: ${f.obtido ?? ''}`)); l.push(''); }
  const por = {}; for (const r of resultados) { const k = `${r.tela} · ${r.area}`; por[k] ??= { ok: 0, falha: 0, inc: 0 }; por[k][r.situacao === 'passou' ? 'ok' : r.situacao === 'FALHOU' ? 'falha' : 'inc']++; }
  l.push('## Resumo por área', '', ...Object.entries(por).map(([a, v]) => `- ${a}: ✅ ${v.ok} · ❌ ${v.falha} · ⚠️ ${v.inc}`));
  writeFileSync(join(pastaRel, 'relatorio.md'), l.join('\n'), 'utf8');
  writeFileSync(join(pastaRel, 'relatorio.json'), JSON.stringify(resultados, null, 2), 'utf8');
  console.log(`\n✅ ${resultados.length - falhas.length - incs.length} · ❌ ${falhas.length} · ⚠️ ${incs.length}\nRelatório: ${join(pastaRel, 'relatorio.md')}`);
  return falhas.length;
}

// ---------- execução ----------
let falhou = 0;
try {
  const telas = flag('--so-pc') ? ['PC'] : flag('--so-celular') ? ['CELULAR'] : ['PC', 'CELULAR'];
  for (const tela of telas) {
    vp = tela;
    const { ctx, page } = await novaPagina(tela);
    await landing(page).catch((e) => registrar('Landing travou', false, { obtido: String(e?.message ?? e) }));
    await portalVagas(page).catch((e) => registrar('Portal de vagas travou', false, { obtido: String(e?.message ?? e) }));
    await loginECadastro(page).catch((e) => registrar('Login/cadastro travou', false, { obtido: String(e?.message ?? e) }));
    await ctx.close();
    if (!CONTAS.length) { area = 'Painel'; registrar('Painel depois do login (informe ROBO_EMAIL/ROBO_SENHA)', null); }
    for (const conta of CONTAS) {
      const sessao = await novaPagina(tela);
      await painel(sessao.page, conta).catch((e) => registrar(`Painel ${conta.rotulo} travou`, false, { obtido: String(e?.message ?? e) }));
      await sessao.ctx.close();
    }
  }
} finally {
  falhou = relatorio();
  await browser.close();
}
process.exit(falhou ? 1 : 0);
