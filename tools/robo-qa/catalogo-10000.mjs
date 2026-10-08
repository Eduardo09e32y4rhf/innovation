#!/usr/bin/env node
/** Gera o catálogo determinístico de casos; serve para contar, particionar e reproduzir a execução longa. */
import fs from 'node:fs';
import path from 'node:path';

const perfis = ['DEV', 'CEO', 'ADMIN', 'RH', 'RH_RS', 'CONTABIL', 'COMERCIAL', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const empresas = ['propria', 'outra', 'sem-vinculo', 'suspensa'];
const dominios = ['dashboard', 'funcionarios', 'usuarios', 'escala', 'ferias', 'vagas', 'candidatos', 'plataforma', 'faturas', 'devolucoes', 'pagamentos', 'suporte'];
const acoes = ['listar', 'filtrar', 'detalhar', 'criar', 'editar', 'excluir', 'aprovar', 'rejeitar', 'exportar', 'webhook'];
const estados = ['vazio', 'valido', 'invalido', 'duplicado', 'expirado', 'cancelado', 'processando', 'concluido'];
const transportes = ['desktop', 'mobile', 'rede-lenta', 'timeout', 'offline-retorno'];
const casos = [];
for (const perfil of perfis) for (const empresa of empresas) for (const dominio of dominios) for (const acao of acoes) for (const estado of estados) for (const transporte of transportes) {
  // Mantém combinações úteis: webhook pertence a pagamentos/faturas/devoluções; ações de negócio não se aplicam ao dashboard.
  if (acao === 'webhook' && !['faturas', 'devolucoes', 'pagamentos'].includes(dominio)) continue;
  if (['aprovar', 'rejeitar'].includes(acao) && ['dashboard', 'suporte', 'plataforma'].includes(dominio)) continue;
  casos.push({ id: `QA-${String(casos.length + 1).padStart(6, '0')}`, perfil, empresa, dominio, acao, estado, transporte });
}
const limite = Number(process.env.QA_LIMITE ?? 12000);
const passo = Math.max(1, Math.ceil(casos.length / limite));
const selecionados = casos.length > limite ? casos.filter((_, indice) => indice % passo === 0).slice(0, limite) : casos;
selecionados.forEach((caso, indice) => { caso.id = `QA-${String(indice + 1).padStart(6, '0')}`; });
const destino = process.argv[2] ?? path.join('tools', 'robo-qa', 'relatorios', 'catalogo-10000.json');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify({ versao: 1, seed: 'innovation-qa-10000', geradoEm: new Date().toISOString(), total: selecionados.length, universo: casos.length, limite, casos: selecionados }, null, 2));
console.log(`Catálogo gerado: ${selecionados.length} casos (universo ${casos.length}) em ${destino}`);

