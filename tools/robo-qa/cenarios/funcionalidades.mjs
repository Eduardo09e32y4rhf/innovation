import { clicar, ir, passo } from '../lib/acoes.mjs';
import { explorarPagina } from '../lib/explorador.mjs';
import { FATURAS_ABAS, PLATAFORMA_ABAS } from './matriz.mjs';

const PERFIS_VAGAS = ['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR'];
const PERFIS_DOCUMENTOS = ['DEV', 'ADMIN', 'RH', 'RH_RS'];
const PERFIS_RESPONSAVEIS = ['DEV', 'ADMIN', 'RH'];

const textoDaTela = (ctx) => ctx.page.evaluate(() => document.body?.innerText ?? '');
/** So a area principal (sem o menu lateral), para nao confundir item de menu com conteudo do painel. */
const textoPrincipal = (ctx) => ctx.page.evaluate(() => (document.querySelector('main') ?? document.body)?.innerText ?? '');

async function plataforma(ctx, { base, links, opcoes }) {
  const abas = PLATAFORMA_ABAS[ctx.perfil];
  if (!abas || !links.includes(base({ caminho: '/dashboard/platform' }))) return;
  ctx.cenario = 'Plataforma (tela única)';
  await passo(ctx, 'Abrir a Plataforma', () => ir(ctx, `/${ctx.tenant}/dashboard/platform`, 'Abrindo a Plataforma'));
  const secoes = ctx.page.getByRole('navigation', { name: 'Seções da Plataforma' });
  for (const aba of abas) {
    await passo(ctx, `Plataforma: aba "${aba}"`, async () => {
      await clicar(ctx, secoes.getByRole('button', { name: aba, exact: true }), `aba "${aba}"`);
      await ctx.page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    });
    const sub = ctx.page.getByRole('navigation', { name: 'Subseções' }).getByRole('button');
    const nomes = (await sub.allInnerTexts().catch(() => [])).map((n) => n.trim()).filter(Boolean);
    for (const nome of nomes) {
      await passo(ctx, `Plataforma › ${aba} › "${nome}"`, async () => {
        await clicar(ctx, ctx.page.getByRole('navigation', { name: 'Subseções' }).getByRole('button', { name: nome, exact: true }), `subseção "${nome}"`);
        await ctx.page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      });
      await explorarPagina(ctx, `Plataforma › ${aba} › ${nome}`, { max: 6 });
    }
    if (!nomes.length) await explorarPagina(ctx, `Plataforma › ${aba}`, { max: opcoes.max });
  }
  // Dossie de uma empresa
  if (abas.includes('Empresas')) {
    await passo(ctx, 'Plataforma: abrir a primeira empresa da lista', async () => {
      await clicar(ctx, secoes.getByRole('button', { name: 'Empresas', exact: true }), 'aba "Empresas"');
      const abrir = ctx.page.getByRole('button', { name: /abrir empresa/i }).first();
      if (!(await abrir.count().catch(() => 0))) return; // sem empresas: nada a testar
      await clicar(ctx, abrir, 'botão "Abrir empresa"');
      await ctx.page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    });
    const abasEmpresa = await ctx.page.getByRole('navigation', { name: 'Subseções' }).getByRole('button').allInnerTexts().catch(() => []);
    for (const nome of abasEmpresa.map((n) => n.trim()).filter(Boolean)) {
      await passo(ctx, `Empresa › "${nome}"`, () => clicar(ctx, ctx.page.getByRole('navigation', { name: 'Subseções' }).getByRole('button', { name: nome, exact: true }), `aba da empresa "${nome}"`));
    }
  }
}

async function faturas(ctx, { base, links }) {
  const abas = FATURAS_ABAS[ctx.perfil];
  if (!abas || !links.includes(base({ caminho: '/dashboard/faturas' }))) return;
  ctx.cenario = 'Faturas (planos, assinaturas e cupons)';
  await passo(ctx, 'Abrir Faturas', () => ir(ctx, `/${ctx.tenant}/dashboard/faturas`, 'Abrindo Faturas'));
  for (const aba of abas) {
    await passo(ctx, `Faturas: aba "${aba}"`, async () => {
      await clicar(ctx, ctx.page.getByRole('navigation', { name: 'Seções de Faturas' }).getByRole('button', { name: aba, exact: true }), `aba "${aba}"`);
      await ctx.page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    });
    await explorarPagina(ctx, `Faturas › ${aba}`, { max: 6 });
  }
  // Aba que NAO deve existir para este perfil
  const proibidas = ['Faturas', 'Assinaturas', 'Planos', 'Cupons'].filter((aba) => !abas.includes(aba));
  for (const aba of proibidas) {
    await passo(ctx, `Faturas: a aba "${aba}" NÃO deve aparecer para ${ctx.perfil}`, async () => {
      const existe = await ctx.page.getByRole('navigation', { name: 'Seções de Faturas' }).getByRole('button', { name: aba, exact: true }).count().catch(() => 0);
      if (existe) throw new Error(`ESPERADO: a aba "${aba}" aparece para o perfil ${ctx.perfil}, mas esse perfil não deveria ter essa função.`);
    });
  }
}

async function vagas(ctx, { links, base }) {
  if (!PERFIS_VAGAS.includes(ctx.perfil) || !links.includes(base({ caminho: '/dashboard/jobs' }))) return;
  ctx.cenario = 'Vagas e candidatos';
  await passo(ctx, 'Abrir a lista de vagas', () => ir(ctx, `/${ctx.tenant}/dashboard/jobs`, 'Abrindo Vagas'));
  const href = await ctx.page.evaluate((tenant) => {
    const prefixo = `/${tenant}/dashboard/jobs/`;
    return [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).find((h) => h?.startsWith(prefixo) && !/\/(new|edit|settings)(\/|$)/.test(h) && h !== prefixo) ?? null;
  }, ctx.tenant).catch(() => null);
  if (!href) { await passo(ctx, 'Vagas: não há nenhuma vaga para abrir (teste do funil pulado)', async () => {}); return; }
  await passo(ctx, 'Abrir o funil da primeira vaga', async () => {
    await clicar(ctx, ctx.page.locator(`a[href="${href}"]`), 'primeira vaga da lista');
    await ctx.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  });
  await passo(ctx, `Vaga: bloco "Responsáveis pela vaga" ${PERFIS_RESPONSAVEIS.includes(ctx.perfil) ? 'deve' : 'NÃO deve'} aparecer para ${ctx.perfil}`, async () => {
    const tem = /responsáveis pela vaga/i.test(await textoDaTela(ctx));
    if (PERFIS_RESPONSAVEIS.includes(ctx.perfil) && !tem) throw new Error('ESPERADO: o bloco "Responsáveis pela vaga" deveria aparecer para este perfil, mas não apareceu.');
    if (!PERFIS_RESPONSAVEIS.includes(ctx.perfil) && tem) throw new Error('ESPERADO: o bloco "Responsáveis pela vaga" apareceu para um perfil que não pode escolher responsáveis.');
  });
  await explorarPagina(ctx, 'Funil da vaga', { max: 8 });

  const candidato = ctx.page.locator('article[draggable] button').first();
  if (!(await candidato.count().catch(() => 0))) { await passo(ctx, 'Vaga sem candidatos: painel do candidato não pôde ser testado', async () => {}); return; }
  await passo(ctx, 'Abrir o painel do primeiro candidato', () => clicar(ctx, candidato, 'primeiro candidato do funil'));
  await passo(ctx, `Candidato: aba "Documentos" ${PERFIS_DOCUMENTOS.includes(ctx.perfil) ? 'deve' : 'NÃO deve'} existir para ${ctx.perfil}`, async () => {
    const tem = await ctx.page.getByRole('tab', { name: 'Documentos' }).count().catch(() => 0);
    if (PERFIS_DOCUMENTOS.includes(ctx.perfil) && !tem) throw new Error('ESPERADO: a aba "Documentos" do candidato deveria existir para este perfil, mas não existe.');
    if (!PERFIS_DOCUMENTOS.includes(ctx.perfil) && tem) throw new Error('ESPERADO: a aba "Documentos" do candidato apareceu para um perfil que não deveria ver documentos de candidatos.');
  });
  if (ctx.perfil === 'RH_RS') {
    await passo(ctx, 'RH — R&S: a etapa "Contratado" NÃO pode ser oferecida', async () => {
      const opcoes = await ctx.page.locator('select[aria-label="Etapa"] option').allInnerTexts().catch(() => []);
      if (opcoes.some((o) => /contratad/i.test(o))) throw new Error('ESPERADO: o RH — R&S não pode contratar, mas a etapa "Contratado" apareceu na lista de etapas do candidato.');
    });
  }
  for (const aba of ['Resumo', 'Avaliação', 'Notas', 'Entrevistas', 'Documentos', 'Histórico']) {
    if (aba === 'Documentos' && !PERFIS_DOCUMENTOS.includes(ctx.perfil)) continue;
    await passo(ctx, `Candidato › aba "${aba}"`, () => clicar(ctx, ctx.page.getByRole('tab', { name: aba }), `aba "${aba}"`, { timeout: 4000 }));
  }
}

async function paineis(ctx, { base }) {
  ctx.cenario = 'Painel inicial do perfil';
  await passo(ctx, 'Abrir o painel inicial', () => ir(ctx, base({ caminho: '/dashboard' }), 'Abrindo o painel inicial'));
  await passo(ctx, 'Painel: mostra uma saudação com o nome', async () => {
    const texto = await textoDaTela(ctx);
    if (!/(bom dia|boa tarde|boa noite|ol[aá])/i.test(texto)) throw new Error('ESPERADO: o painel deveria cumprimentar o usuário ("Bom dia, Nome!"), mas nenhuma saudação apareceu.');
  });
  if (ctx.perfil === 'RH_RS') {
    await passo(ctx, 'RH — R&S: painel só de recrutamento (4 indicadores)', async () => {
      const texto = await textoPrincipal(ctx);
      for (const indicador of ['Vagas abertas', 'Candidaturas para triagem', 'Entrevistas próximas', 'Documentos a conferir']) {
        if (!texto.includes(indicador)) throw new Error(`ESPERADO: o painel do RH — R&S deveria mostrar o indicador "${indicador}", mas ele não apareceu.`);
      }
      if (/folha|ponto|férias|funcion[aá]rios/i.test(texto.split('Requer atenção')[0] ?? '')) throw new Error('ESPERADO: o painel do RH — R&S não deveria mostrar dados de folha, ponto, férias ou funcionários.');
    });
  }
}

export async function cenariosEspecificos(ctx, args) {
  await paineis(ctx, args);
  await plataforma(ctx, args);
  await faturas(ctx, args);
  await vagas(ctx, args);
}