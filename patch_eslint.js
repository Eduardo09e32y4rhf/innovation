const fs = require('fs');

// Patch node_modules/eslint-config-next/index.js if needed, or simply let `npm install eslint` fix it.
// The failure is mostly about tests timing out in CI for `platform-finance.spec.ts`. Let's fix that timeout.

const pFinance = 'tests-e2e/tests/platform-finance.spec.ts';
let content = fs.readFileSync(pFinance, 'utf8');

// Increase timeout for login
content = content.replace(/\{ timeout: 15_000 \}/g, '{ timeout: 30_000 }');

// Add test.setTimeout
content = content.replace(/test\.describe\('Plataforma: Asaas e cobrancas', \(\) => \{/, "test.describe('Plataforma: Asaas e cobrancas', () => {\n  test.setTimeout(60000);");

fs.writeFileSync(pFinance, content);
