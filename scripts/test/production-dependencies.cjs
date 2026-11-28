const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(__dirname, '../../apps/api/package.json'));

(async () => {
  // Actual v4 call sites used by Bull's timer manager and ExcelJS's XLSX writer.
  const TimerManager = apiRequire('bull/lib/timer-manager');
  const manager = new TimerManager();
  const id = manager.set('compatibility-test', 60000, () => {});
  manager.clear(id);
  assert.match(id, /^[a-f0-9-]{36}$/);
  const ExcelJS = apiRequire('exceljs');
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Teste'); sheet.addRow([10]);
  sheet.addConditionalFormatting({ ref: 'A1', rules: [{ type: 'dataBar', minLength: 0, maxLength: 100, cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FF5B2BD6' } }] });
  const bytes = await book.xlsx.writeBuffer();
  const restored = new ExcelJS.Workbook(); await restored.xlsx.load(bytes);
  assert.equal(restored.getWorksheet('Teste').getCell('A1').value, 10);

  const app = require('fastify')({ logger: false });
  try {
    await app.register(require('@fastify/static'), { root: path.resolve(__dirname, '../../apps/web/public'), prefix: '/assets/' });
    assert.equal((await app.inject('/assets/fonts/inter/Inter-400.ttf')).statusCode, 200);
    assert.equal((await app.inject('/assets/does-not-exist')).statusCode, 404);
  } finally { await app.close(); }
  const Sentry = apiRequire('@sentry/node');
  Sentry.init({ dsn: '', enabled: false, defaultIntegrations: false });
  await Sentry.close(500);
  console.log('Production dependency compatibility: Bull timers, ExcelJS XLSX roundtrip, Fastify static and disabled Sentry passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
