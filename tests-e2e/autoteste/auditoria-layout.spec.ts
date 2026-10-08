import { expect, test } from '@playwright/test';
import { auditar } from '../lib/auditoria-layout';

/** Autoteste do robô de tamanhos de tela: ele precisa ACUSAR páginas quebradas e NÃO acusar páginas boas. Não precisa do app no ar. */
const BOA = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
  body{margin:0;font:16px sans-serif} main{padding:16px} button,a.b,input{min-height:44px;min-width:44px;margin:4px}
  .tabela{overflow-x:auto;max-width:100%} .tabela table{width:900px}
</style></head><body><main><h1>Tela boa</h1><p>Conteúdo de exemplo com bastante texto para não ser considerada vazia.</p>
<button>Salvar</button> <a class="b" href="#">Voltar</a> <input placeholder="Nome">
<div class="tabela"><table><tr><td><button>Na tabela que rola</button></td><td>x</td></tr></table></div></main></body></html>`;

const RUIM = `<!doctype html><html><head><style>body{margin:0;font:16px sans-serif}</style></head><body>
<p>Tela com vários defeitos de layout para o robô encontrar, com texto suficiente.</p>
<div style="width:900px;background:#eee">Faixa larga demais</div>
<button style="position:absolute;left:600px;top:80px;width:100px;height:40px">Cortado</button>
<button style="width:10px;height:10px;padding:0">x</button></body></html>`;

test.use({ viewport: { width: 390, height: 800 } });

test('página boa em celular: nenhuma falha (tabela que rola de propósito não conta)', async ({ page }) => {
  await page.setContent(BOA);
  const { falhas } = await auditar(page);
  expect(falhas).toEqual([]);
});

test('página quebrada em celular: acusa rolagem lateral, controle cortado, alvo minúsculo e falta de viewport', async ({ page }) => {
  await page.setContent(RUIM);
  const { falhas } = await auditar(page);
  const tipos = falhas.map((f) => f.tipo);
  for (const esperado of ['sem meta viewport', 'rolagem lateral', 'controle cortado', 'alvo de toque minúsculo']) expect(tipos, `faltou acusar: ${esperado}`).toContain(esperado);
});

test('página em branco é acusada', async ({ page }) => {
  await page.setContent('<!doctype html><meta name="viewport" content="width=device-width"><body></body>');
  expect((await auditar(page)).falhas.map((f) => f.tipo)).toContain('tela em branco');
});

test('no desktop o alvo de toque não é cobrado', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width"><body><p>Conteúdo suficiente para não ser branco.</p><button style="width:10px;height:10px;padding:0">x</button></body>`);
  expect((await auditar(page)).falhas.map((f) => f.tipo)).not.toContain('alvo de toque minúsculo');
});
