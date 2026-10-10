#!/usr/bin/env node
/**
 * ROBÔ "CLIENTE DA LANDING PAGE" (navegador de verdade).
 * Age como um desconhecido que achou o site: landing -> planos -> "Criar empresa" -> primeiro acesso -> equipe -> cada perfil
 * entrando pela tela de login -> ponto -> PDFs, no COMPUTADOR e no CELULAR. Tira foto de cada passo e mede: erro no console,
 * resposta 5xx, rolagem horizontal, link quebrado, menu errado para o perfil, página proibida que abre.
 *
 * Roda no seu PC (abre o Chrome) apontando para o site publicado. Veja tools/robo-cliente/README.md.
 *   ROBO_CLIENTE_CONFIRMO=sim [ROBO_DEV_EMAIL=.. ROBO_DEV_SENHA=..] node tools/robo-cliente/robo-cliente.mjs --url https://innovationia.com.br
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarPlaywright } from '../robo-qa/lib/playwright.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const flag = (n) => process.argv.includes(n);
const SITE = (arg('--url') || process.env.ROBO_CLIENTE_URL || '').replace(/\/$/, '');
const DEV_EMAIL = process.env.ROBO_DEV_EMAIL, DEV_SENHA = process.env.ROBO_DEV_SENHA;
if (!SITE) { console.error('Informe o site: --url https://innovationia.com.br'); process.exit(2); }
if (process.env.ROBO_CLIENTE_CONFIRMO !== 'sim' && !/localhost|127\.0\.0\.1/.test(SITE)) {
  console.error(`O robô vai CRIAR uma empresa de teste em ${SITE}. Confirme com ROBO_CLIENTE_CONFIRMO=sim.`); process.exit(2);
}
const API = `${SITE}/api`;
const unico = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e3).toString(36)}`;
const NOME_EMPRESA = `ROBO-QA CICLO CLIENTE ${unico}`;
const SENHA = 'RoboCliente#2026Ok', SENHA_NOVA = 'RoboCliente#Nova2026';
const email = (p) => `robo-cliente-${unico}-${p}@example.com`;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const pastaRel = join(raiz, 'tools/robo-cliente/relatorios', stamp);
mkdirSync(join(pastaRel, 'fotos'), { recursive: true });

// ---------- resultado ----------
const resultados = [];
let area = '', foto = 0, vp = 'PC';
function registrar(nome, ok, d = {}) {
  resultados.push({ area, tela: vp, nome, situacao: ok === null ? 'inconclusivo' : ok ? 'passou' : 'FALHOU', ...d });
  console.log(`${ok === null ? '⚠️ ' : ok ? '✅' : '❌'} [${vp}] [${area}] ${nome}${ok === false && d.obtido ? `  -> ${d.obtido}` : ''}`);
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- API (só para preparar/limpar o que a tela não cobre) ----------
async function api(metodo, caminho, corpo, token) {
  try {
    const r = await fetch(API + caminho, { method: metodo, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const t = await r.text(); let json = null; try { json = JSON.parse(t); } catch { /* */ }
    return { status: r.status, json, data: json?.data ?? json };
  } catch (e) { return { status: 0, json: null, data: null, erro: String(e) }; }
}
const tokenDe = (r) => r.data?.access_token ?? r.data?.accessToken ?? null;
const lista = (r) => (Array.isArray(r.data) ? r.data : Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data?.items) ? r.data.items : []);
function cpfValido(seed) { const n = String(seed).padStart(9, '0').slice(-9).split('').map(Number); for (const t of [9, 10]) { const s = n.reduce((a, d, i) => a + d * (t + 1 - i), 0); n.push(((s * 10) % 11) % 10); } return n.join(''); }
function cnpjValido(seed) {
  const dig = (nums, pesos) => { const s = nums.reduce((a, n, i) => a + n * pesos[i], 0) % 11; return s < 2 ? 0 : 11 - s; };
  const b = String(seed).padStart(8, '0').slice(-8).split('').map(Number).concat([0, 0, 0, 1]);
  b.push(dig(b, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])); b.push(dig(b, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])); return b.join('');
}
const maskCnpj = (d) => d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

// ---------- navegador ----------
const { chromium } = carregarPlaywright();
const browser = await chromium.launch({ headless: flag('--semjanela'), slowMo: flag('--lento') ? 250 : 40 });
const VIEWPORTS = { PC: { width: 1366, height: 800 }, CELULAR: { width: 390, height: 844 } };

async function novaPagina(nome) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[nome], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', geolocation: { latitude: -23.5505, longitude: -46.6333 }, permissions: ['geolocation'], acceptDownloads: true, isMobile: nome === 'CELULAR', hasTouch: nome === 'CELULAR' });
  const page = await ctx.newPage();
  page.problemas = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.problemas.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => page.problemas.push(`erro de página: ${String(e.message).slice(0, 160)}`));
  page.on('response', (r) => {
    const url = r.url().replace(SITE, '');
    if (r.status() >= 500) page.problemas.push(`resposta ${r.status()} em ${r.request().method()} ${url.slice(0, 100)}`);
    else if (r.status() >= 400 && !(r.status() === 401 && /\/api\/auth\/(refresh|me)/.test(url)) && !(r.status() === 401 && /login/.test(page.url()))) page.problemas.push(`resposta ${r.status()} em ${r.request().method()} ${url.slice(0, 100)}`);
  });
  page.on('requestfailed', (r) => { if (!/analytics|fonts|favicon|_next\/image|_rsc=/.test(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) page.problemas.push(`falha de rede: ${r.url().replace(SITE, '').slice(0, 100)}`); });
  return { ctx, page };
}
async function tirar(page, nome) {
  const arq = `${String(++foto).padStart(3, '0')}-${vp}-${nome.replace(/[^\w]+/g, '-').slice(0, 50)}.png`;
  try { await page.screenshot({ path: join(pastaRel, 'fotos', arq), fullPage: false }); } catch { /* */ }
  return arq;
}
async function conferirTela(page, nome, { esperaTexto } = {}) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const f = await tirar(page, nome);
  const medidas = await page.evaluate(() => ({ larg: document.scrollingElement.scrollWidth, janela: window.innerWidth, texto: document.body.innerText.slice(0, 4000) }));
  registrar(`${nome}: sem rolagem horizontal`, medidas.larg <= medidas.janela + 2, { obtido: `conteúdo ${medidas.larg}px numa janela de ${medidas.janela}px`, foto: f });
  const quebrada = /Application error|algo deu errado|Something went wrong|500 Internal|Unexpected Application/i.test(medidas.texto);
  registrar(`${nome}: sem tela de erro`, !quebrada, { obtido: medidas.texto.slice(0, 160), foto: f });
  if (esperaTexto) registrar(`${nome}: mostra "${esperaTexto}"`, new RegExp(esperaTexto, 'i').test(medidas.texto), { obtido: medidas.texto.slice(0, 160), foto: f });
  const probs = [...new Set(page.problemas.splice(0))];
  registrar(`${nome}: sem erro de console/rede`, probs.length === 0, { obtido: probs.slice(0, 4).join(' | '), foto: f });
  return medidas.texto;
}
async function visivel(loc, ms = 1500) { try { await loc.first().waitFor({ state: 'visible', timeout: ms }); return true; } catch { return false; } }
async function passo(nome, fn, page) {
  try { await fn(); } catch (e) { const f = page ? await tirar(page, `FALHA-${nome}`) : null; registrar(nome, false, { obtido: String(e?.message ?? e).split('\n')[0].slice(0, 220), foto: f }); return false; }
  return true;
}

/** Portões que o sistema coloca antes do painel: senha provisória, termo de privacidade, boas-vindas, passo a passo. */
async function portoes(page, { senhaAtual, senhaNova } = {}) {
  for (let i = 0; i < 12; i++) {
    await dormir(900);
    if (await visivel(page.getByText('Troque sua senha'), 500) && senhaAtual) {
      await page.getByLabel('Senha atual').fill(senhaAtual);
      await page.getByLabel('Nova senha', { exact: true }).fill(senhaNova);
      await page.getByLabel('Confirmar nova senha').fill(senhaNova);
      await page.getByRole('button', { name: 'Trocar senha' }).click();
      senhaAtual = null; continue;
    }
    if (await visivel(page.getByRole('button', { name: /Assinar termo/ }), 500)) {
      await page.evaluate(() => { for (const el of document.querySelectorAll('*')) if (el.scrollHeight > el.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight; });
      await dormir(500);
      await page.getByRole('checkbox').first().check({ timeout: 4000 }).catch(() => {});
      await page.getByRole('button', { name: /Assinar termo/ }).click({ timeout: 4000 }).catch(() => {});
      continue;
    }
    if (await visivel(page.getByRole('button', { name: /Começar agora/ }), 500)) { await page.getByRole('button', { name: /Começar agora/ }).click(); continue; }
    if (await visivel(page.getByRole('button', { name: 'Pular' }), 500)) { await page.getByRole('button', { name: 'Pular' }).click(); continue; }
    if (/\/dashboard/.test(page.url()) && await visivel(page.getByRole('navigation').first(), 800)) break;
  }
}

async function entrarPelaTela(page, tenantHint, e, senha, senhaNova) {
  await page.goto(`${SITE}/login`);
  await page.locator('#login-email').fill(e);
  await page.getByLabel('Senha', { exact: true }).first().fill(senha);
  await page.getByRole('button', { name: /^Entrar$/ }).click();
  await portoes(page, { senhaAtual: senhaNova ? senha : null, senhaNova });
  if (senhaNova) { // depois da troca, o sistema pede login de novo ou segue; garante que está logado
    if (/login/.test(page.url())) {
      await page.locator('#login-email').fill(e); await page.getByLabel('Senha', { exact: true }).first().fill(senhaNova); await page.getByRole('button', { name: /^Entrar$/ }).click(); await portoes(page);
    }
  }
}
const sair = async (page) => {
  try {
    await page.getByRole('button', { name: /Abrir menu de/ }).first().click({ timeout: 4000 });
    await page.getByRole('menuitem', { name: 'Sair' }).click({ timeout: 4000 });
    await page.waitForURL(/login/, { timeout: 8000 });
  } catch { await page.context().clearCookies(); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => {}); }
};
const tenantDe = (url) => new URL(url).pathname.split('/')[1];

const MENU_ESPERADO = {
  ADMIN: ['Dashboard', 'Funcionários', 'Escalas', 'Férias', 'Gestão', 'Vagas', 'Usuários', 'Faturas', 'Configurações', 'Suporte'],
  RH: ['Dashboard', 'Funcionários', 'Escalas', 'Férias', 'Gestão', 'Vagas', 'Usuários', 'Faturas', 'Configurações', 'Suporte'],
  GESTOR: ['Dashboard', 'Funcionários', 'Escalas', 'Férias', 'Gestão', 'Vagas', 'Configurações', 'Suporte'],
  FUNCIONARIO: ['Dashboard', 'Escalas', 'Férias', 'Configurações', 'Suporte'],
  CONSULTA: ['Dashboard', 'Funcionários', 'Escalas', 'Férias', 'Configurações', 'Suporte'],
};
const TODAS = ['Dashboard', 'Funcionários', 'Escalas', 'Férias', 'Gestão', 'Vagas', 'Usuários', 'Faturas', 'Configurações', 'Suporte'];
const ROTA = { Dashboard: '', Funcionários: '/employees', Escalas: '/escalas', Férias: '/vacations', Gestão: '/management', Vagas: '/jobs', Usuários: '/users', Faturas: '/faturas', Configurações: '/settings', Suporte: '/support' };

async function menuDoPerfil(page, perfil, tenant) {
  if (vp === 'CELULAR') { await page.getByRole('button', { name: /Abrir todos os destinos|Abrir ou recolher menu principal/ }).first().click({ timeout: 4000 }).catch(() => {}); await dormir(500); }
  const achados = [];
  for (const nome of TODAS) if (await page.locator(`aside[aria-label="Menu principal"] a[aria-label="${nome}"]`).count()) achados.push(nome);
  const esperado = MENU_ESPERADO[perfil];
  const falta = esperado.filter((x) => !achados.includes(x)), sobra = achados.filter((x) => !esperado.includes(x));
  registrar(`${perfil}: o menu tem exatamente as abas do perfil`, !falta.length && !sobra.length, { esperado: esperado.join(', '), obtido: `faltam: ${falta.join(', ') || '-'} · a mais: ${sobra.join(', ') || '-'}`, foto: await tirar(page, `menu-${perfil}`) });
  if (vp === 'CELULAR') await page.keyboard.press('Escape').catch(() => {});
  return achados;
}
async function varrerAbas(page, perfil, tenant, abas) {
  for (const nome of abas) {
    await passo(`${perfil}: abrir ${nome}`, async () => {
      await page.goto(`${SITE}/${tenant}/dashboard${ROTA[nome]}`);
      await portoes(page);
      await conferirTela(page, `${perfil} · ${nome}`);
    }, page);
  }
}
async function bloqueios(page, perfil, tenant) {
  const proibidas = TODAS.filter((n) => !MENU_ESPERADO[perfil].includes(n));
  for (const nome of proibidas) {
    await passo(`${perfil}: ${nome} por endereço direto deve ser bloqueado`, async () => {
      await page.goto(`${SITE}/${tenant}/dashboard${ROTA[nome]}`);
      await dormir(2200);
      const url = page.url(); const texto = await page.evaluate(() => document.body.innerText.slice(0, 1500));
      const barrado = !url.endsWith(`/dashboard${ROTA[nome]}`) || /restrit|sem permiss|não tem acesso|não gerencia|não possui acesso|não permite/i.test(texto);
      registrar(`${perfil}: ${nome} por endereço direto é bloqueado`, barrado, { obtido: `abriu ${url.replace(SITE, '')}: "${texto.replace(/\s+/g, ' ').slice(0, 100)}"`, foto: await tirar(page, `bloqueio-${perfil}-${nome}`) });
    }, page);
  }
}

// =====================================================================================================
const S = { devToken: null, planoId: null, empresaId: null, tenant: null, adminToken: null, func: {} };
async function limpar() {
  area = 'Limpeza';
  if (flag('--manter')) return registrar('Empresa de teste mantida (--manter)', null, { obtido: NOME_EMPRESA });
  if (!S.devToken) return registrar('Sem credencial de Dev: a empresa de teste NÃO foi apagada', null, { obtido: `apague "${NOME_EMPRESA}" em Plataforma → Empresas` });
  const novo = tokenDe(await api('POST', '/auth/login', { email: DEV_EMAIL, password: DEV_SENHA })); if (novo) S.devToken = novo;
  if (S.empresaId) { const r = await api('DELETE', `/platform/companies/${S.empresaId}/purge`, undefined, S.devToken); registrar('Empresa de teste e todos os dados apagados', [200, 204].includes(r.status), { obtido: `status ${r.status}` }); }
  if (S.planoId) { await api('DELETE', `/platform/plans/${S.planoId}`, undefined, S.devToken); const r = await api('DELETE', `/platform/plans/${S.planoId}/permanent`, undefined, S.devToken); registrar('Plano grátis de teste apagado', [200, 204].includes(r.status), { obtido: `status ${r.status}` }); }
}

async function preparar() {
  area = '0. Preparação';
  if (DEV_EMAIL && DEV_SENHA) {
    const l = await api('POST', '/auth/login', { email: DEV_EMAIL, password: DEV_SENHA });
    S.devToken = tokenDe(l);
    registrar('Dev entra (só para criar o plano grátis e limpar depois)', Boolean(S.devToken), { obtido: `status ${l.status}` });
    if (S.devToken) {
      for (const e of lista(await api('GET', `/platform/companies?search=${encodeURIComponent('ROBO-QA CICLO')}&limit=100`, undefined, S.devToken)).filter((x) => String(x.name).startsWith('ROBO-QA CICLO'))) await api('DELETE', `/platform/companies/${e.id}/purge`, undefined, S.devToken);
      for (const p of lista(await api('GET', '/platform/plans', undefined, S.devToken)).filter((x) => String(x.name).startsWith('ROBO-QA Grátis'))) { await api('DELETE', `/platform/plans/${p.id}`, undefined, S.devToken); await api('DELETE', `/platform/plans/${p.id}/permanent`, undefined, S.devToken); }
      const r = await api('POST', '/platform/plans', { name: `ROBO-QA Grátis ${unico}`, description: 'Plano grátis de teste do robô', isFree: true, price: 0, cycle: 'MONTHLY', maxUsers: 20, maxEmployees: 50, activeModules: ['employees', 'time-track', 'vacations', 'management', 'recruitment'], isActive: true, isHidden: false, displayOrder: 999 }, S.devToken);
      S.planoId = r.data?.id; registrar('Plano grátis criado para o teste', [200, 201].includes(r.status) && Boolean(S.planoId), { obtido: `status ${r.status}` });
    }
  } else registrar('Sem credencial de Dev: o robô usará um plano público que já exista', null);
}

async function landingEPlanos() {
  area = '1. Landing e planos';
  const { ctx, page } = await novaPagina(vp);
  await passo('Abrir a landing page', async () => {
    await page.goto(`${SITE}/`);
    const texto = await conferirTela(page, 'Landing (/)', { esperaTexto: 'Innovation' });
    registrar('Landing: botão de criar conta existe e leva ao cadastro', (await page.locator('a[href="/cadastro"]').count()) > 0 && (await page.locator('a[href="/login"]').count()) > 0, { obtido: 'faltam links /cadastro ou /login' });
    void texto;
    const links = await page.$$eval('a[href]', (as) => [...new Set(as.map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/') && !h.startsWith('//')))]);
    const mortos = [];
    for (const h of links) { const r = await page.request.get(SITE + h.split('#')[0] || '/').catch(() => null); if (!r || r.status() >= 400) mortos.push(`${h} (${r?.status() ?? 'sem resposta'})`); }
    registrar(`Landing: os ${links.length} links internos abrem`, mortos.length === 0, { obtido: mortos.join(', ') });
  }, page);
  for (const [rota, texto] of [['/planos', 'plano'], ['/termos', 'termo'], ['/privacidade', 'privacidade'], ['/suporte', 'suporte'], ['/login', 'entrar'], ['/esqueci-senha', 'senha'], ['/carreiras', 'vagas']]) {
    await passo(`Abrir ${rota}`, async () => { await page.goto(SITE + rota); await conferirTela(page, `Página ${rota}`, { esperaTexto: texto }); }, page);
  }
  await passo('Planos: o que a tela mostra bate com a API', async () => {
    const pub = lista(await api('GET', '/auth/public-plans'));
    await page.goto(`${SITE}/planos`); await page.waitForLoadState('networkidle').catch(() => {});
    const texto = await page.evaluate(() => document.body.innerText);
    const semNome = pub.filter((p) => !texto.includes(p.name)).map((p) => p.name);
    registrar(`Planos: os ${pub.length} planos públicos aparecem na página`, pub.length > 0 && semNome.length === 0, { obtido: pub.length ? `não aparecem: ${semNome.join(', ')}` : 'BLOQUEIO DE VENDA: /api/auth/public-plans devolve lista vazia — nenhum cliente consegue criar empresa (a etapa 2 do cadastro fica sem plano). Crie os planos (scripts/deploy/seed-plans.sql).' });
    if (S.planoId) registrar('Planos: o plano grátis criado pelo robô aparece na lista pública', pub.some((p) => p.id === S.planoId), { obtido: 'não apareceu em /auth/public-plans' });
  }, page);
  await ctx.close();
}

async function cadastro() {
  area = '2. Criar empresa pela landing → cadastro';
  const { ctx, page } = await novaPagina(vp);
  await passo('Landing → clicar em criar conta', async () => {
    await page.goto(`${SITE}/`);
    await page.locator('a[href="/cadastro"]').first().click();
    await page.waitForURL(/cadastro/, { timeout: 10000 });
    await conferirTela(page, 'Cadastro etapa 1', { esperaTexto: 'Crie sua empresa' });
  }, page);
  await passo('Cadastro: erros aparecem e são compreensíveis', async () => {
    await page.locator('#c-company').fill('X'); await page.getByRole('button', { name: 'Continuar' }).click();
    registrar('Nome de empresa curto mostra aviso', await visivel(page.getByText('Informe o nome da empresa'), 2500), { foto: await tirar(page, 'erro-nome') });
    await page.locator('#c-company').fill(NOME_EMPRESA); await page.locator('#c-doc').fill('11111111111');
    await page.locator('#c-name').fill('Robo Dono'); await page.locator('#c-email').fill(email('admin')); await page.getByLabel('Senha', { exact: true }).fill('fraca');
    await page.getByRole('button', { name: 'Continuar' }).click();
    registrar('CNPJ/CPF inválido mostra aviso', await visivel(page.getByText(/CPF ou CNPJ válido/), 2500), { foto: await tirar(page, 'erro-cnpj') });
    await page.locator('#c-doc').fill(maskCnpj(cnpjValido(Date.now() % 1e8)));
    await page.getByRole('button', { name: 'Continuar' }).click();
    registrar('Senha fraca mostra aviso', await visivel(page.getByText(/senha não atende/i), 2500), { foto: await tirar(page, 'erro-senha') });
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByRole('button', { name: 'Continuar' }).click();
    registrar('Com tudo certo vai para a etapa 2 (plano)', await visivel(page.getByText(/Etapa 2 de 2/), 4000), { foto: await tirar(page, 'cadastro-etapa2') });
  }, page);
  let criou = false;
  await passo('Cadastro: escolher o plano grátis e criar a empresa', async () => {
    await page.waitForSelector('input[name="plan"]', { timeout: 10000 });
    const nomes = await page.$$eval('label:has(input[name="plan"])', (ls) => ls.map((l) => l.innerText.replace(/\s+/g, ' ')));
    registrar('Etapa 2 lista os planos para escolher', nomes.length > 0, { obtido: 'nenhum plano na tela', foto: await tirar(page, 'planos-etapa2') });
    const alvo = page.locator('label:has(input[name="plan"])', { hasText: S.planoId ? 'ROBO-QA Grátis' : 'Grátis' }).first();
    registrar('O plano grátis aparece como "Grátis"', await alvo.count() > 0 && /Grátis/.test(await alvo.innerText()), { obtido: nomes.join(' | ') });
    await alvo.click();
    await page.locator('#c-seats').fill('8');
    registrar('Sem aceitar os termos o botão fica desabilitado', await page.getByRole('button', { name: 'Criar minha empresa' }).isDisabled());
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Criar minha empresa' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    criou = true;
    S.tenant = tenantDe(page.url());
    registrar('Empresa criada: o cliente caiu direto no painel (plano grátis, sem cobrança)', true, { obtido: page.url(), foto: await tirar(page, 'pos-cadastro') });
  }, page);
  if (criou) {
    S.adminToken = await page.evaluate(() => { for (const st of [localStorage, sessionStorage]) for (let i = 0; i < st.length; i++) { const v = st.getItem(st.key(i)) ?? ''; const m = v.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/); if (m) return m[0]; } return null; });
    registrar('A sessão do administrador foi guardada pelo site', Boolean(S.adminToken));
    const eu = await api('GET', '/auth/me', undefined, S.adminToken); S.empresaId = eu.data?.companyId ?? eu.data?.user?.companyId;
    await portoes(page);
    await conferirTela(page, 'Painel do administrador (1º acesso)');
    await menuDoPerfil(page, 'ADMIN', S.tenant);
    if (vp === 'PC') await varrerAbas(page, 'ADMIN', S.tenant, MENU_ESPERADO.ADMIN.slice(1));
  }
  await ctx.close();
  return criou;
}

async function equipe() {
  area = '3. Equipe (cadastro e acesso)';
  if (!S.adminToken) return registrar('Equipe', null, { obtido: 'sem administrador' });
  const adm = new Date(Date.UTC(new Date().getUTCFullYear() - 2, 0, 1)).toISOString().slice(0, 10);
  const base = { contractType: 'CLT', workScale: '5X2', dailyWorkload: '08:00', standardEntry: '08:00', standardLunchStart: '12:00', standardLunchReturn: '13:00', standardExit: '17:00', status: 'ACTIVE', admissionDate: adm, department: 'Operações', unit: 'Matriz' };
  let seq = Date.now() % 1e8;
  for (const [k, nome, perfil, salario] of [['GESTOR', 'ROBO Gestor', 'GESTOR', 5000], ['RH', 'ROBO RH', 'RH', 4200], ['FUNCIONARIO', 'ROBO Colaborador', 'FUNCIONARIO', 3000], ['CONSULTA', 'ROBO Consulta', 'CONSULTA', 3500]]) {
    const c = await api('POST', '/employees', { ...base, name: nome, cpf: cpfValido(seq++), email: email(`f-${k}`), position: nome, salary: salario, registration: `RB-${k}` }, S.adminToken);
    const id = c.data?.id ?? c.data?.employee?.id;
    registrar(`Cadastro do funcionário ${nome}`, [200, 201].includes(c.status) && Boolean(id), { obtido: `status ${c.status}: ${JSON.stringify(c.json?.error ?? c.json?.message ?? '').slice(0, 120)}` });
    if (!id) continue;
    const ac = await api('POST', `/employees/${id}/access`, { email: email(k), role: perfil, name: nome }, S.adminToken);
    const prov = ac.data?.temporaryPassword;
    registrar(`Acesso (${perfil}) para ${nome} com senha provisória`, [200, 201].includes(ac.status) && Boolean(prov), { obtido: `status ${ac.status}` });
    if (prov) S.func[k] = { id, nome, email: email(k), provisoria: prov };
  }
}

async function equipePelaTela() {
  area = '3b. Cadastrar funcionário pela tela (formulário de 8 seções)';
  if (!S.adminToken || vp !== 'PC') return;
  const { ctx, page } = await novaPagina('PC');
  await passo('Administrador entra pela tela de login', async () => { await entrarPelaTela(page, S.tenant, email('admin'), SENHA); }, page);
  await passo('Cadastrar funcionário pela tela', async () => {
    await page.goto(`${SITE}/${S.tenant}/dashboard/employees`);
    await portoes(page);
    await conferirTela(page, 'Funcionários (lista)');
    await page.getByRole('link', { name: /Novo funcionário/ }).click();
    await page.waitForURL(/employees\/new/, { timeout: 10000 });
    await page.getByLabel('Nome completo').fill('ROBO Pela Tela');
    const cpf = page.getByLabel(/^CPF/); if (await cpf.count()) await cpf.first().fill(cpfValido(Date.now() % 1e9 + 9));
    await page.getByLabel('E-mail').first().fill(email('pela-tela'));
    await tirar(page, 'form-secao-1');
    for (let i = 0; i < 7; i++) { const prox = page.getByRole('button', { name: /Próxima seção/ }); if (!(await prox.isEnabled().catch(() => false))) break; await prox.click(); await dormir(250); }
    await tirar(page, 'form-ultima-secao');
    const salvar = page.getByRole('button', { name: /^(Salvar|Cadastrar|Criar funcionário|Concluir)/ }).first();
    registrar('O formulário chega à última seção e mostra o botão de salvar', await salvar.count() > 0, { foto: await tirar(page, 'form-final') });
  }, page);
  await ctx.close();
}

async function perfis() {
  area = '4. Cada perfil entra pela tela de login';
  for (const [k, perfil] of [['RH', 'RH'], ['GESTOR', 'GESTOR'], ['FUNCIONARIO', 'FUNCIONARIO'], ['CONSULTA', 'CONSULTA']]) {
    const f = S.func[k]; if (!f) { registrar(`Perfil ${perfil}`, null, { obtido: 'sem acesso criado' }); continue; }
    const { ctx, page } = await novaPagina(vp);
    await passo(`${perfil}: entra com a senha provisória e troca a senha pela tela`, async () => {
      await entrarPelaTela(page, S.tenant, f.email, f.provisoria, SENHA_NOVA);
      registrar(`${perfil}: depois da troca de senha chega ao painel`, /\/dashboard/.test(page.url()), { obtido: page.url(), foto: await tirar(page, `painel-${perfil}`) });
    }, page);
    await passo(`${perfil}: painel e menu`, async () => {
      await conferirTela(page, `Painel ${perfil}`);
      await menuDoPerfil(page, perfil, S.tenant);
    }, page);
    if (vp === 'PC') { await varrerAbas(page, perfil, S.tenant, MENU_ESPERADO[perfil].slice(1)); await bloqueios(page, perfil, S.tenant); }
    if (k === 'FUNCIONARIO') await funcionarioNoDiaADia(page);
    if (k === 'RH' && vp === 'PC') await rhBaixaPdfs(page);
    await sair(page);
    await ctx.close();
  }
}

async function funcionarioNoDiaADia(page) {
  await passo('Funcionário: bate o ponto pelo botão da tela', async () => {
    await page.goto(`${SITE}/${S.tenant}/dashboard/escalas?view=hoje`); await portoes(page);
    const botao = page.getByRole('button', { name: /Registrar (entrada|saída|volta)/i }).first();
    registrar('Tela de ponto mostra o botão "Registrar entrada"', await visivel(botao, 8000), { foto: await tirar(page, 'ponto-botao') });
    await botao.click();
    registrar('Depois de bater, a tela confirma a batida', await visivel(page.getByText(/registrada|Batidas de hoje/i), 6000), { foto: await tirar(page, 'ponto-batido') });
    const lista2 = await page.evaluate(() => document.body.innerText);
    registrar('A batida aparece na lista "Batidas de hoje"', /Batidas de hoje/.test(lista2) && !/Nenhuma batida ainda/.test(lista2), { obtido: lista2.slice(0, 120) });
  }, page);
  await passo('Funcionário: abre o espelho de ponto e baixa o PDF', async () => {
    await page.goto(`${SITE}/${S.tenant}/dashboard/escalas?view=ponto`); await portoes(page);
    await conferirTela(page, 'Espelho de ponto do funcionário');
    const pdfBtn = page.getByRole('button', { name: /Folha em PDF/ });
    if (!(await visivel(pdfBtn, 6000))) return registrar('Funcionário vê o botão "Folha em PDF"', false, { obtido: 'botão não apareceu', foto: await tirar(page, 'sem-pdf') });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), pdfBtn.click()]);
    await conferirDownload('Folha de ponto (PDF) baixada pelo funcionário', dl);
  }, page);
  await passo('Funcionário: tela de férias e botão de pedir', async () => {
    await page.goto(`${SITE}/${S.tenant}/dashboard/vacations`); await portoes(page);
    await conferirTela(page, 'Férias (funcionário)');
    const pede = await visivel(page.getByRole('button', { name: /Nova solicitação/ }), 3000);
    registrar('Funcionário consegue pedir férias pela tela (botão "Nova solicitação")', pede ? true : null, { obtido: 'O botão NÃO aparece para o Funcionário no padrão do sistema (só aparece com a permissão "Solicitar férias para si"). Se o cliente espera pedir férias sozinho, libere em Usuários → Permissões ou mude o padrão.', foto: await tirar(page, 'ferias-func') });
  }, page);
  await passo('Funcionário: pede uma troca de folga/justificativa pelo assistente', async () => {
    await page.goto(`${SITE}/${S.tenant}/dashboard/escalas?view=solicitacoes`); await portoes(page);
    await page.getByRole('button', { name: /Nova solicitação/ }).first().click();
    registrar('O assistente de solicitação abre com os tipos de pedido', await visivel(page.getByText(/Troca de folga|Troca de turno|Justificativa|Ajuste/i), 5000), { foto: await tirar(page, 'assistente-pedido') });
    await page.keyboard.press('Escape');
  }, page);
}

async function conferirDownload(nome, dl) {
  const arq = join(pastaRel, 'fotos', dl.suggestedFilename().replace(/[^\w.\-]+/g, '_'));
  await dl.saveAs(arq);
  const { readFileSync } = await import('node:fs'); const buf = readFileSync(arq);
  const erros = [];
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') erros.push('não é PDF');
  if (!buf.subarray(Math.max(0, buf.length - 1024)).toString('latin1').includes('%%EOF')) erros.push('PDF truncado (sem %%EOF)');
  if (buf.length < 1000) erros.push(`só ${buf.length} bytes`);
  if (!(buf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length) erros.push('sem páginas');
  if (/%[0-9A-Fa-f]{2}/.test(dl.suggestedFilename())) erros.push(`nome do arquivo feio: ${dl.suggestedFilename()}`);
  registrar(`${nome} (${buf.length} bytes, arquivo "${dl.suggestedFilename()}")`, erros.length === 0, { obtido: erros.join(' | ') });
}

async function rhBaixaPdfs(page) {
  area = '5. PDFs pelo botão da tela (RH)';
  await passo('RH baixa os PDFs de um funcionário pelo menu Ações', async () => {
    await page.goto(`${SITE}/${S.tenant}/dashboard/employees`); await portoes(page);
    const acoes = page.getByRole('button', { name: /^Ações de/ }).first();
    registrar('Lista de funcionários mostra o botão Ações', await visivel(acoes, 8000), { foto: await tirar(page, 'rh-acoes') });
    for (const item of ['Ficha cadastral (PDF)', 'Folha de ponto (PDF)', 'Ocorrências (PDF)']) {
      await page.getByRole('button', { name: /^Ações de/ }).first().click();
      const b = page.getByRole('menuitem', { name: item }).or(page.getByRole('button', { name: item }));
      if (!(await visivel(b, 3000))) { registrar(`Menu Ações mostra "${item}"`, false, { obtido: 'opção ausente', foto: await tirar(page, `sem-${item}`) }); await page.keyboard.press('Escape'); continue; }
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 25000 }), b.first().click()]);
      await conferirDownload(item, dl);
    }
  }, page);
}

// ---------- relatório ----------
function relatorio() {
  const falhas = resultados.filter((r) => r.situacao === 'FALHOU'), incs = resultados.filter((r) => r.situacao === 'inconclusivo');
  const l = [`# Robô cliente da landing — ${new Date().toLocaleString('pt-BR')}`, '', `Site: ${SITE} · ✅ ${resultados.length - falhas.length - incs.length} · ❌ ${falhas.length} · ⚠️ ${incs.length}`, `Fotos de cada passo: \`fotos/\` ao lado deste arquivo.`, ''];
  if (falhas.length) { l.push('## Defeitos', ''); falhas.forEach((f, i) => l.push(`${i + 1}. **${f.nome}** — tela: ${f.tela} · etapa: ${f.area}`, `   - Esperado: ${f.esperado ?? '-'}`, `   - Obtido: ${f.obtido ?? '-'}`, f.foto ? `   - Foto: fotos/${f.foto}` : '', '')); } else l.push('Nenhum defeito encontrado.', '');
  if (incs.length) { l.push('## Para decidir / verificar', ''); incs.forEach((f) => l.push(`- (${f.tela}) ${f.nome}: ${f.obtido ?? ''}`)); }
  const por = {}; for (const r of resultados) { const k = `${r.tela} · ${r.area}`; por[k] ??= { ok: 0, falha: 0, inc: 0 }; por[k][r.situacao === 'passou' ? 'ok' : r.situacao === 'FALHOU' ? 'falha' : 'inc']++; }
  l.push('', '## Resumo por etapa', '', ...Object.entries(por).map(([a, v]) => `- ${a}: ✅ ${v.ok} · ❌ ${v.falha} · ⚠️ ${v.inc}`));
  writeFileSync(join(pastaRel, 'relatorio.md'), l.join('\n'), 'utf8'); writeFileSync(join(pastaRel, 'relatorio.json'), JSON.stringify(resultados, null, 2), 'utf8');
  console.log(`\n${resultados.length - falhas.length - incs.length} passaram · ${falhas.length} falharam · ${incs.length} para decidir\nRelatório: ${join(pastaRel, 'relatorio.md')}`);
  return falhas.length;
}

// ---------- execução ----------
try {
  await preparar();
  vp = 'PC';
  await landingEPlanos();
  if (flag('--so-landing')) { vp = 'CELULAR'; await landingEPlanos(); throw new Error('Modo --so-landing: parei antes de criar empresa (nada foi criado).'); }
  const criou = await cadastro();
  if (criou) {
    await equipe();
    await equipePelaTela();
    await perfis();
    // repete no celular: landing, planos, e cada perfil entra e percorre o menu (a empresa já existe)
    vp = 'CELULAR';
    area = '1. Landing e planos'; await landingEPlanos();
    area = '4. Cada perfil entra pela tela de login';
    for (const [k, perfil] of [['RH', 'RH'], ['FUNCIONARIO', 'FUNCIONARIO']]) {
      const f = S.func[k]; if (!f) continue;
      const { ctx, page } = await novaPagina('CELULAR');
      await passo(`${perfil} no celular: entra e vê o painel`, async () => {
        await entrarPelaTela(page, S.tenant, f.email, SENHA_NOVA); await conferirTela(page, `Painel ${perfil}`);
        await menuDoPerfil(page, perfil, S.tenant);
        await varrerAbas(page, perfil, S.tenant, MENU_ESPERADO[perfil].slice(1));
      }, page);
      await ctx.close();
    }
    vp = 'PC';
  }
} catch (e) { registrar('O robô parou antes do fim', false, { obtido: String(e?.stack ?? e).slice(0, 300) }); }
finally { area = 'Limpeza'; await limpar().catch((e) => registrar('Falha na limpeza', false, { obtido: String(e) })); await browser.close().catch(() => {}); }
process.exit(relatorio() > 0 ? 1 : 0);
