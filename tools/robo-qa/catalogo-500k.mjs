#!/usr/bin/env node
/** Gera 500.000 casos reais em NDJSON, sem carregar tudo na memória. */
import fs from 'node:fs';
import path from 'node:path';

const destino = process.argv[2] ?? path.join('tools', 'robo-qa', 'relatorios', 'catalogo-500k.ndjson');
const total = Math.min(500_000, Math.max(10_000, Number(process.env.QA_CASOS ?? 500_000)));
const perfis = ['DEV', 'CEO', 'ADMIN', 'RH', 'RH_RS', 'CONTABIL', 'COMERCIAL', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const empresas = ['propria', 'outra', 'sem-vinculo', 'suspensa'];
const dominios = ['dashboard', 'funcionarios', 'usuarios', 'escala', 'ferias', 'vagas', 'candidatos', 'plataforma', 'faturas', 'devolucoes', 'pagamentos', 'suporte'];
const acoes = ['listar', 'filtrar', 'detalhar', 'criar', 'editar', 'excluir', 'aprovar', 'rejeitar', 'exportar', 'webhook'];
const estados = ['vazio', 'valido', 'invalido', 'duplicado', 'expirado', 'cancelado', 'processando', 'concluido'];
const transportes = ['desktop', 'mobile', 'rede-lenta', 'timeout', 'offline-retorno'];
const base = [];
for (const perfil of perfis) for (const empresa of empresas) for (const dominio of dominios) for (const acao of acoes) for (const estado of estados) for (const transporte of transportes) {
  if (acao === 'webhook' && !['faturas', 'devolucoes', 'pagamentos'].includes(dominio)) continue;
  if (['aprovar', 'rejeitar'].includes(acao) && ['dashboard', 'suporte', 'plataforma'].includes(dominio)) continue;
  base.push({ perfil, empresa, dominio, acao, estado, transporte });
}
fs.mkdirSync(path.dirname(destino), { recursive: true });
const out = fs.createWriteStream(destino);
out.write(`${JSON.stringify({ tipo: 'meta', versao: 1, seed: 'innovation-qa-500000', total, universo: base.length, geradoEm: new Date().toISOString() })}\n`);
for (let i = 0; i < total; i++) out.write(`${JSON.stringify({ tipo: 'caso', id: `QA-${String(i + 1).padStart(7, '0')}`, repeticao: Math.floor(i / base.length) + 1, ...base[i % base.length] })}\n`);
await new Promise((resolve, reject) => { out.on('finish', resolve); out.on('error', reject); out.end(); });
console.log(`Catálogo gerado: ${total} casos em ${destino} (universo ${base.length})`);

