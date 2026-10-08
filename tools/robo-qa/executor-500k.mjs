#!/usr/bin/env node
/** Executor HTTP real para o catálogo. Cada linha é uma requisição observável, com timeout, retry e relatório. */
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: {
  url: { type: 'string' }, catalogo: { type: 'string' }, saida: { type: 'string' }, concorrencia: { type: 'string', default: '16' }, timeout: { type: 'string', default: '8000' }, retry: { type: 'string', default: '1' }, semabrir: { type: 'boolean', default: false }, ajuda: { type: 'boolean', default: false },
} });
if (args.ajuda || !args.url || !args.catalogo) {
  console.log('Uso: node tools/robo-qa/executor-500k.mjs --url=http://localhost:3000 --catalogo=...ndjson [--concorrencia=16] [--timeout=8000]');
  process.exit(args.ajuda ? 0 : 2);
}
const baseUrl = String(args.url).replace(/\/+$/, '');
const concorrencia = Math.max(1, Math.min(64, Number(args.concorrencia) || 16));
const timeoutMs = Math.max(500, Number(args.timeout) || 8000);
const retries = Math.max(0, Math.min(3, Number(args.retry) || 1));
const inicio = Date.now();
const nome = args.saida ?? path.join(path.dirname(args.catalogo), `execucao-${new Date().toISOString().replace(/[:.]/g, '-')}.ndjson`);
fs.mkdirSync(path.dirname(nome), { recursive: true });
const relatorio = fs.createWriteStream(nome);
const stats = { total: 0, concluidos: 0, sucesso: 0, falhas: 0, errosRede: 0, porStatus: {}, porDominio: {}, lentos: 0 };
const rotas = { dashboard: '/dashboard', funcionarios: '/dashboard/employees', usuarios: '/dashboard/users', escala: '/dashboard/escales', ferias: '/dashboard/vacations', vagas: '/dashboard/jobs', candidatos: '/dashboard/jobs', plataforma: '/dashboard/platform', faturas: '/dashboard/faturas', devolucoes: '/dashboard/faturas?aba=devolucoes', pagamentos: '/dashboard/faturas?aba=pagamentos', suporte: '/dashboard/support' };
const metodo = (acao) => ({ listar: 'GET', filtrar: 'GET', detalhar: 'GET', exportar: 'GET', webhook: 'POST', criar: 'POST', editar: 'PATCH', excluir: 'DELETE', aprovar: 'POST', rejeitar: 'POST' }[acao] ?? 'GET');
const esperado = (caso) => {
  if (caso.empresa !== 'propria' || caso.estado === 'invalido') return [400, 401, 403, 404, 422];
  if (caso.estado === 'duplicado') return [200, 201, 204, 409, 422];
  if (caso.estado === 'expirado' || caso.estado === 'cancelado') return [400, 404, 409, 422];
  return [200, 201, 202, 204, 400, 401, 403, 404, 422];
};
async function executar(caso) {
  const caminho = rotas[caso.dominio] ?? '/dashboard';
  const url = `${baseUrl}/qa/${caso.perfil.toLowerCase()}${caminho}`;
  const headers = { accept: 'application/json,text/html', 'x-qa-case-id': caso.id, 'x-qa-profile': caso.perfil, 'x-qa-tenant-mode': caso.empresa };
  const init = { method: metodo(caso.acao), headers, signal: AbortSignal.timeout(timeoutMs) };
  if (init.method !== 'GET') { headers['content-type'] = 'application/json'; init.body = JSON.stringify({ qaCaseId: caso.id, state: caso.estado, dryRun: true }); }
  let ultima;
  for (let tentativa = 0; tentativa <= retries; tentativa++) {
    const t = Date.now();
    try {
      const resposta = await fetch(url, init);
      const duracaoMs = Date.now() - t;
      const ok = esperado(caso).includes(resposta.status);
      return { ...caso, url, metodo: init.method, status: resposta.status, duracaoMs, ok, tentativa };
    } catch (erro) { ultima = erro; }
  }
  return { ...caso, url, metodo: init.method, status: null, duracaoMs: timeoutMs, ok: false, erro: String(ultima?.message ?? ultima) };
}
const fila = [];
let ativa = 0;
let terminou = false;
function registrar(resultado) {
  stats.total++; stats.concluidos++; if (resultado.ok) stats.sucesso++; else stats.falhas++; if (resultado.erro) stats.errosRede++; if ((resultado.duracaoMs ?? 0) > 1500) stats.lentos++;
  if (resultado.status != null) stats.porStatus[resultado.status] = (stats.porStatus[resultado.status] ?? 0) + 1;
  stats.porDominio[resultado.dominio] = (stats.porDominio[resultado.dominio] ?? 0) + 1;
  relatorio.write(`${JSON.stringify(resultado)}\n`);
}
async function drenar() {
  while (fila.length || ativa) {
    while (fila.length && ativa < concorrencia) { const caso = fila.shift(); ativa++; executar(caso).then(registrar).finally(() => { ativa--; }).catch(() => {}); }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
const entrada = readline.createInterface({ input: fs.createReadStream(args.catalogo), crlfDelay: Infinity });
for await (const linha of entrada) {
  if (!linha.trim()) continue;
  const item = JSON.parse(linha); if (item.tipo === 'meta') continue;
  fila.push(item); if (fila.length >= concorrencia * 4) await drenar();
}
await drenar();
terminou = true;
await new Promise((resolve) => { relatorio.write(`${JSON.stringify({ tipo: 'resumo', ...stats, duracaoSegundos: Math.round((Date.now() - inicio) / 1000), finalizado: terminou })}\n`); relatorio.end(resolve); });
console.log(`Execução concluída: ${stats.concluidos} casos · sucesso ${stats.sucesso} · falhas ${stats.falhas} · ${Math.round((Date.now() - inicio) / 1000)}s`);
console.log(`Relatório: ${nome}`);

