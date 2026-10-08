#!/usr/bin/env node
// Robo QA provisorio: entra como cada perfil, clica nas telas e botoes na sua frente e gera um relatorio em portugues.
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { rodarPerfil } from './cenarios/perfil.mjs';
import { sair } from './cenarios/login.mjs';
import { anexarColetor } from './lib/coletor.mjs';
import { carregarPlaywright } from './lib/playwright.mjs';
import { Relatorio } from './lib/relatorio.mjs';
import { instalarOverlay } from './lib/ui.mjs';
import { registrarAchado } from './lib/acoes.mjs';
import { MENU } from './cenarios/matriz.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));

const { values: args } = parseArgs({
  options: {
    config: { type: 'string' },
    url: { type: 'string' },
    perfil: { type: 'string' },
    modo: { type: 'string', default: 'leitura' },
    rapido: { type: 'boolean', default: false },
    devagar: { type: 'boolean', default: false },
    semjanela: { type: 'boolean', default: false },
    semabrir: { type: 'boolean', default: false },
    celular: { type: 'boolean', default: false },
    max: { type: 'string', default: '16' },
    demo: { type: 'boolean', default: false },
    critico: { type: 'boolean', default: false },
    'ambiente-teste': { type: 'boolean', default: false },
    ajuda: { type: 'boolean', default: false },
  },
});

if (args.ajuda) {
  console.log(`Robô QA — uso:
  node tools/robo-qa/robo.mjs [opções]
  --config=arquivo.json   perfis e senhas (padrão: tools/robo-qa/robo.config.json)
  --url=https://...       endereço do sistema (sobrescreve o do arquivo)
  --perfil=DEV,RH_RS      só estes perfis (padrão: todos os que têm senha no arquivo)
  --modo=leitura|completo leitura (padrão) nunca cria/apaga/envia nada; completo também aperta botões de salvar etc.
  --rapido / --devagar    velocidade dos cliques (padrão: normal, dá para acompanhar)
  --celular               também confere cada tela no tamanho de celular
  --semjanela             sem abrir o navegador (para rodar escondido)
  --semabrir              não abre o relatório no final
  --demo                  testa o próprio robô num sistema de mentira com defeitos de propósito`);
  process.exit(0);
}

const agora = new Date();
const carimbo = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}_${String(agora.getHours()).padStart(2, '0')}-${String(agora.getMinutes()).padStart(2, '0')}-${String(agora.getSeconds()).padStart(2, '0')}`;
const pasta = path.join(aqui, 'relatorios', carimbo);

let servidorDemo = null;
let config;
if (args.demo) {
  const { iniciarDemo, CONFIG_DEMO } = await import('./demo/servidor-demo.mjs');
  servidorDemo = await iniciarDemo();
  config = { urlBase: servidorDemo.url, perfis: CONFIG_DEMO };
} else {
  const arquivo = args.config ?? path.join(aqui, 'robo.config.json');
  if (!fs.existsSync(arquivo)) {
    console.error(`Não achei ${arquivo}.\nCopie tools/robo-qa/robo.config.exemplo.json para tools/robo-qa/robo.config.json e preencha e-mail e senha dos perfis de TESTE.`);
    process.exit(2);
  }
  config = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
}
if (args.url) config.urlBase = args.url;
config.urlBase = String(config.urlBase).replace(/\/+$/, '');

const pedidos = args.perfil ? args.perfil.split(',').map((p) => p.trim().toUpperCase()) : Object.keys(config.perfis);
const ritmo = args.rapido ? { antes: 60, depois: 120, digitacao: 5, slowMo: 0 } : args.devagar ? { antes: 900, depois: 900, digitacao: 90, slowMo: 400 } : { antes: 450, depois: 450, digitacao: 35, slowMo: 150 };
const viewport = { width: 1366, height: 820 };
const modo = args.modo === 'completo' ? 'completo' : 'leitura';
const critico = Boolean(args.critico);
if (critico && modo === 'completo' && !args['ambiente-teste'] && !args.demo) {
  console.error('Para usar --critico --modo=completo, confirme explicitamente --ambiente-teste.');
  process.exit(2);
}

const estado = { passos: [], achados: [], perfis: {}, agora: 'iniciando', perfilAtual: null, api: { total: 0, porStatus: {}, porRota: {}, lentas: [] } };
const meta = { urlBase: config.urlBase, modo, critico, ambienteTeste: Boolean(args['ambiente-teste'] || args.demo), inicio: agora.toLocaleString('pt-BR') };
const relatorio = new Relatorio({ pasta, estado, meta });
const incertos = MENU.filter((item) => item.incerto);

console.log(`\n🤖 Robô QA\n   Sistema: ${config.urlBase}\n   Modo: ${modo}${modo === 'leitura' ? ' (não cria, não apaga, não envia nada)' : ' (CUIDADO: pode criar e alterar dados)'}\n   Relatório ao vivo: ${path.join(pasta, 'ao-vivo.html')}\n`);

const { chromium } = carregarPlaywright();
const navegador = await chromium.launch({ headless: args.semjanela, slowMo: ritmo.slowMo, args: ['--window-size=1400,900'] });
relatorio.aoVivo();
if (!args.semabrir && !args.semjanela) exec(`start "" "${path.join(pasta, 'ao-vivo.html')}"`);

for (const perfil of pedidos) {
  const credencial = config.perfis[perfil];
  if (!credencial?.email || !credencial?.senha) {
    estado.perfis[perfil] = { situacao: 'não testado', motivo: 'sem e-mail/senha no arquivo de configuração' };
    continue;
  }
  estado.perfis[perfil] = { situacao: 'testando…' };
  estado.perfilAtual = perfil;
  console.log(`\n▶ Perfil ${perfil} (${credencial.email})`);
  const context = await navegador.newContext({ viewport, locale: 'pt-BR' });
  await instalarOverlay(context);
  const page = await context.newPage();
  page.on('dialog', (dialogo) => (modo === 'completo' ? dialogo.accept() : dialogo.dismiss()).catch(() => {}));
  const ctx = {
    page, context, perfil, baseUrl: config.urlBase, tenant: '', modo, critico, ambienteTeste: Boolean(args['ambiente-teste'] || args.demo), ritmo, estado, relatorio, log: true, cenario: '', agora: '',
    coletor: anexarColetor(page), pastaFotos: path.join(pasta, 'fotos'), esperaNegado: false,
  };
  Object.defineProperty(ctx, 'agora', { get: () => estado.agora, set: (v) => { estado.agora = v; } });
  try {
    await rodarPerfil(ctx, credencial, { max: critico ? Math.max(Number(args.max), 40) : Number(args.max), celular: args.celular, viewport, incertos, critico });
    estado.perfis[perfil] = { situacao: 'testado' };
  } catch (erro) {
    await registrarAchado(ctx, 'O robô travou', { gravidade: 'alta', titulo: 'O robô não conseguiu terminar este perfil', explicacao: `Aconteceu um problema inesperado durante o teste: ${String(erro?.message ?? erro).split('\n')[0]}. O que vinha depois não foi testado.` });
    estado.perfis[perfil] = { situacao: 'interrompido', motivo: String(erro?.message ?? erro).split('\n')[0].slice(0, 120) };
  }
  const saiu = await sair(ctx).catch(() => false);
  if (!saiu && !/\/login(?:\/|$)/i.test(page.url())) await registrarAchado(ctx, 'Logout explícito', { gravidade: 'média', titulo: 'Não foi possível confirmar o encerramento da sessão', explicacao: 'O robô terminou o perfil sem conseguir confirmar a volta para a tela de login. Isso pode permitir que a próxima conta herde uma sessão.' });
  await context.close().catch(() => {});
  relatorio.aoVivo();
}

estado.agora = 'terminou';
estado.perfilAtual = null;
await navegador.close().catch(() => {});
if (servidorDemo) {
  estado.demo = servidorDemo.estado();
  await servidorDemo.parar();
}
meta.duracao = `${Math.round((Date.now() - agora.getTime()) / 1000)} s`;
const arquivo = relatorio.finalizar();
const falhas = estado.passos.filter((p) => p.status === 'falha').length;
const avisos = estado.passos.filter((p) => p.status === 'aviso').length;
console.log(`\n✅ Terminou em ${meta.duracao}. Passos: ${estado.passos.length} · avisos: ${avisos} · falhas: ${falhas}\n   Relatório: ${arquivo}\n   Texto:     ${path.join(pasta, 'relatorio.md')}\n`);
if (args.demo) console.log('   Estado do sistema de mentira (deve ser "nada apagado"):', JSON.stringify(estado.demo));
if (!args.semabrir && !args.semjanela) exec(`start "" "${arquivo}"`);

