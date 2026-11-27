#!/usr/bin/env node
// Verificação reproduzível. Não publica, não aplica migrations e não acessa dados de produção.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'storage/qa/portal-candidato');
fs.mkdirSync(output, { recursive: true });
const selected = (process.argv.find(arg => arg.startsWith('--only='))?.slice(7) || 'audit,types,lint,unit,browser').split(',');
const results = [];
if (selected.includes('audit')) {
  const ts = require(path.join(root, 'node_modules/typescript'));
  function sources(directory) {
    return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? sources(file) : /\.(ts|tsx)$/.test(file) ? [file] : [];
    });
  }
  const files = [...sources('apps/web/app/carreira'), ...sources('apps/web/app/carreiras'), ...['calculate-match.ts', 'candidate-profile-strength.ts', 'candidate-account.service.ts', 'career-match.controller.ts'].map(file => `apps/api/src/modules/jobs/${file}`)];
  const findings = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) {
        const text = node.text;
        if (!text.startsWith('/') && !text.includes('://') && /[a-zA-Z]\?{1,2}[a-zA-Z]| \?[a-zA-Z]|[a-zA-Z] \? [a-zA-Z]|\uFFFD|\u00c3[\u0080-\u00bf]/.test(text)) findings.push({ file, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1, text });
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  fs.writeFileSync(path.join(output, 'encoding-audit.json'), JSON.stringify(findings, null, 2));
  console.log(`Auditoria de codificação: ${findings.length} suspeitas.`);
  if (findings.length) console.log(findings);
  results.push({ name: 'encoding-audit', exitCode: findings.length ? 1 : 0 });
}
function run(name, file, args, cwd = root) {
  console.log(`Executando ${name}…`);
  const result = spawnSync(process.execPath, [path.join(root, file), ...args], { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0' } });
  const log = (result.stdout || '') + (result.stderr || '') + (result.error?.message || '');
  fs.writeFileSync(path.join(output, `${name}.log`), log);
  results.push({ name, command: [process.execPath, file, ...args], exitCode: result.status ?? 1 });
  console.log(`${name}: saída ${result.status ?? 1}`);
  if (result.status !== 0 && name !== 'eslint') console.log(log.slice(-6000));
}
if (selected.includes('types')) {
  run('tsc-web', 'apps/web/node_modules/typescript/bin/tsc', ['--noEmit', '-p', 'apps/web/tsconfig.json']);
  run('tsc-api', 'node_modules/typescript/bin/tsc', ['--noEmit', '-p', 'apps/api/tsconfig.json']);
  run('prisma-validate', 'apps/api/node_modules/prisma/build/index.js', ['validate', '--schema', 'apps/api/prisma/schema.prisma']);
}
if (selected.includes('lint')) {
  run('eslint', 'apps/web/node_modules/eslint/bin/eslint.js', ['.', '--format', 'json', '--output-file', path.join(output, 'eslint.json')], path.join(root, 'apps/web'));
  const file = path.join(output, 'eslint.json');
  if (fs.existsSync(file)) {
    const lint = JSON.parse(fs.readFileSync(file, 'utf8'));
    const errors = lint.reduce((sum, item) => sum + item.errorCount, 0);
    const warnings = lint.reduce((sum, item) => sum + item.warningCount, 0);
    console.log(`ESLint: ${errors} erros, ${warnings} avisos.`);
    for (const item of lint.filter(item => item.errorCount)) console.log(item.filePath, item.messages.filter(message => message.severity === 2));
  }
}
if (selected.includes('unit')) run('unit', 'node_modules/vitest/vitest.mjs', ['run', '--config', 'vitest.config.ts', 'apps/api/src/modules/jobs/calculate-match.spec.ts', 'apps/api/src/modules/jobs/candidate-profile-strength.spec.ts', 'apps/api/src/modules/jobs/public-jobs-policy.spec.ts', 'apps/api/src/modules/jobs/candidate-account.service.spec.ts', 'tests/unit/candidate-job-presentation.spec.ts']);
if (selected.includes('browser')) run('browser', 'tests-e2e/node_modules/@playwright/test/cli.js', ['test', '--config', 'tests-e2e/playwright.candidate.config.ts']);
fs.writeFileSync(path.join(output, `verification-${selected.join('-')}.json`), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
process.exitCode = results.some(result => result.exitCode !== 0) ? 1 : 0;
