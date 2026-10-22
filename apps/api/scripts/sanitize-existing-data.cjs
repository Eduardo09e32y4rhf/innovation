#!/usr/bin/env node
/**
 * Higieniza texto livre já gravado no banco (HTML/script/javascript: em colunas de texto plano).
 * Usa a MESMA função do pipe global (src/common/utils/sanitize-string.ts), compilada na hora.
 *
 *   node scripts/sanitize-existing-data.cjs             # dry-run (padrão): só relata
 *   node scripts/sanitize-existing-data.cjs --apply     # grava (transação única)
 *   --allow-remote                                      # necessário para --apply fora de localhost
 *
 * Idempotente: depois de aplicado, uma nova execução encontra 0 registros.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const ALLOW_REMOTE = args.has('--allow-remote');
const PLACEHOLDER = '[conteúdo removido]';

require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function loadSanitizer() {
  const ts = require('typescript');
  const file = path.join(__dirname, '../src/common/utils/sanitize-string.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const mod = new Module(file);
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod._compile(outputText, file);
  return mod.exports.sanitizeString;
}

// Mesmos critérios do SanitizeInputInterceptor: segredos/binários e HTML intencional nunca são tocados.
const PROTECTED_COLUMN = /(password|senha|token|secret|hash|signature|assinatura|authorization|base64|dataurl|photo|foto|selfie|biometr|descriptor|embedding|html)/i;
const SKIP_TABLES = /^(_prisma_migrations|document_?templates?)$/i;
const CANDIDATE = '<|&#|&lt|script[[:space:]]*:|data[[:space:]]*:[[:space:]]*text/html';

const quote = (name) => `"${String(name).replace(/"/g, '""')}"`;
const preview = (value) => JSON.stringify(String(value).slice(0, 70)) + (String(value).length > 70 ? '…' : '');

async function main() {
  const url = process.env.DATABASE_URL || '';
  const host = (url.match(/@([^:/?]+)/) || [])[1] || '';
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (APPLY && !isLocal && !ALLOW_REMOTE) {
    console.error(`Recusado: --apply em banco remoto (${host || 'desconhecido'}). Use --allow-remote só com backup feito.`);
    process.exit(2);
  }

  const sanitizeString = loadSanitizer();
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  console.log(`Modo: ${APPLY ? 'APPLY (grava)' : 'DRY-RUN (não grava)'} | banco: ${host || '?'}`);

  const columns = await prisma.$queryRawUnsafe(
    `SELECT c.table_name AS t, c.column_name AS c
       FROM information_schema.columns c
       JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.data_type IN ('text', 'character varying')
      ORDER BY c.table_name, c.column_name`,
  );
  const hasId = new Set(
    (await prisma.$queryRawUnsafe(`SELECT table_name AS t FROM information_schema.columns WHERE table_schema='public' AND column_name='id'`)).map((r) => r.t),
  );

  const changes = [];
  const skippedNoId = new Set();
  for (const { t, c } of columns) {
    if (SKIP_TABLES.test(t) || PROTECTED_COLUMN.test(c) || c === 'id') continue;
    if (!hasId.has(t)) { skippedNoId.add(t); continue; }
    const rows = await prisma.$queryRawUnsafe(
      `SELECT ${quote('id')}::text AS id, ${quote(c)} AS v FROM ${quote(t)} WHERE ${quote(c)} ~* $1`,
      CANDIDATE,
    );
    for (const { id, v } of rows) {
      if (typeof v !== 'string') continue;
      let next = sanitizeString(v, { trim: false });
      if (next === v) continue;
      if (next.trim() === '') next = PLACEHOLDER;
      changes.push({ table: t, column: c, id, before: v, after: next });
    }
  }

  const perColumn = {};
  for (const ch of changes) perColumn[`${ch.table}.${ch.column}`] = (perColumn[`${ch.table}.${ch.column}`] || 0) + 1;

  console.log(`\nRegistros com marcação perigosa: ${changes.length}`);
  for (const [key, n] of Object.entries(perColumn)) console.log(`  ${key}: ${n}`);
  for (const ch of changes.slice(0, 15)) console.log(`  - ${ch.table}.${ch.column} [${ch.id}] ${preview(ch.before)} -> ${preview(ch.after)}`);
  if (changes.length > 15) console.log(`  … e mais ${changes.length - 15}`);
  if (skippedNoId.size) console.log(`\nTabelas sem coluna "id" (não verificadas): ${[...skippedNoId].join(', ')}`);
  console.log('Colunas JSON/JSONB não são varridas por este script.');

  if (APPLY && changes.length) {
    await prisma.$transaction(
      changes.map((ch) => prisma.$executeRawUnsafe(`UPDATE ${quote(ch.table)} SET ${quote(ch.column)} = $1 WHERE ${quote('id')}::text = $2`, ch.after, ch.id)),
    );
    console.log(`\nAplicado: ${changes.length} registro(s) atualizado(s).`);
  } else if (!APPLY && changes.length) {
    console.log('\nNada foi gravado. Rode com --apply para higienizar.');
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
