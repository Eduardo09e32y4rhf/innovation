// Prova o MOTOR do robo (o que roda dentro do sistema) num navegador de verdade, contra um sistema de mentira multiusuario.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import { carregarPlaywright } from '../lib/playwright.mjs';
import { iniciarSpa } from './spa-multiusuario.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const comJanela = process.argv.includes('--janela');

const pacote = await rolldown({ input: path.join(aqui, 'harness.ts'), platform: 'browser', logLevel: 'silent' });
const { output } = await pacote.generate({ format: 'iife' });
const spa = await iniciarSpa(output[0].code);

const { chromium } = carregarPlaywright();
const navegador = await chromium.launch({ headless: !comJanela, slowMo: comJanela ? 120 : 0 });
const page = await (await navegador.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
page.on('pageerror', () => {});

await page.goto(`${spa.url}/login`);
await page.fill('#login-email', 'dev@demo.test');
await page.fill('input[type="password"]', 'devpass');
await page.click('button[type="submit"]');
await page.waitForURL(/\/demo\/dashboard/);
await page.waitForFunction(() => window.__motor);
async function rodar(modo) {
  await page.evaluate(() => localStorage.removeItem('roboQa.relatorio'));
  await page.evaluate((m) => window.__motor.iniciar(['ADMIN', 'RH_RS', 'FUNCIONARIO'], 'rapido', m), modo);
  const inicio = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 1500));
    const bruto = await page.evaluate(() => localStorage.getItem('roboQa.relatorio')).catch(() => null);
    if (bruto) return { relatorio: bruto, segundos: Math.round((Date.now() - inicio) / 1000) };
    if (Date.now() - inicio > 240000) return { relatorio: null, segundos: 240 };
  }
}
const um = await rodar('completo');
const contasSalvas = await page.evaluate(() => JSON.parse(localStorage.getItem('roboQa.contas') ?? '{}'));
const criadosDepoisDoUm = spa.estado.criados.length;

// 2a execucao, em modo RAPIDO, no mesmo navegador: deve reaproveitar as contas (nao cria nada, nao refaz o primeiro acesso).
await page.waitForURL(/\/login/, { timeout: 20000 }).catch(() => {});
await page.fill('#login-email', 'dev@demo.test');
await page.fill('input[type="password"]', 'devpass');
await page.click('button[type="submit"]');
await page.waitForURL(/\/demo\/dashboard/);
await page.waitForFunction(() => window.__motor);
const dois = await rodar('rapido');
let relatorio = um.relatorio;
const fase = 'fim';
await navegador.close();
const estadoSpa = spa.estado;
await spa.parar();

if (!relatorio || !dois.relatorio) { console.error('FALHOU: o robo nao terminou a tempo.'); process.exit(1); }
const dados = JSON.parse(relatorio);
const dados2 = JSON.parse(dois.relatorio);
console.log(dados.markdown);
console.log('\n--- verificacoes do teste do motor ---');
const esperar = (cond, texto) => { console.log(`${cond ? 'OK     ' : 'FALHOU '} ${texto}`); if (!cond) process.exitCode = 1; };
const md = dados.markdown;
esperar(criadosDepoisDoUm === 3, `1a execucao (completo): criou os 3 usuarios de teste pela tela (criou ${criadosDepoisDoUm})`);
esperar(estadoSpa.criados.length === 3, `2a execucao (rapido): NAO criou ninguem de novo (total ${estadoSpa.criados.length})`);
esperar(Object.keys(contasSalvas).length === 3, 'guardou as 3 contas de teste para reaproveitar');
esperar(/modo rápido/.test(dados2.markdown) && /modo completo/.test(md), 'cada relatorio indica o modo (rapido/completo)');
esperar(dois.segundos < um.segundos, `modo rapido foi mais curto (${dois.segundos}s contra ${um.segundos}s)`);
esperar(!/Plataforma|Faturas/.test(dados2.markdown), 'modo rapido nao entrou em Plataforma/Faturas');
esperar(/ADMIN \| testado/.test(dados2.markdown) && /RH_RS \| testado/.test(dados2.markdown) && /FUNCIONARIO \| testado/.test(dados2.markdown), '2a execucao entrou com as contas salvas (sem refazer primeiro acesso) e testou os 3 perfis');
esperar(!estadoSpa.excluido, 'NAO clicou em "Excluir tudo"');
esperar(/## ❌ Falhou \(\d+\)/.test(md) && /## ⚠️ Inconclusivo/.test(md) && /## ⏭️ Não testado \([1-9]/.test(md), 'relatorio separa ❌ falhou, ⚠️ inconclusivo e ⏭️ nao testado (ha itens nao testados)');
esperar(/\*\*Esperado:\*\*/.test(md) && /\*\*Obtido:\*\*/.test(md) && /\*\*Evidência:\*\*/.test(md) && /\*\*Tela:\*\*/.test(md) && /\*\*Ação:\*\*/.test(md), 'cada item traz perfil, tela, acao, esperado, obtido e evidencia');
esperar(/SEGURANÇA/.test(md) && /erro 500/i.test(md) && /Falha ao montar a lista de chamados/.test(md), 'achou vazamento de permissao, erro 500 e erro de JavaScript (falhas reais)');
const segredos = Object.values(contasSalvas).map((c) => c.senha).filter(Boolean);
esperar(segredos.length === 3 && ![md, dados.html, dados2.markdown, dados2.html].some((txt) => segredos.some((s) => txt.includes(s))), 'nenhuma senha aparece nos relatorios (md e html)');