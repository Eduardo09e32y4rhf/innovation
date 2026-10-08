import { clicar, ir, naoTestado, passo, registrarAchado } from './acoes';
import { acharPorTexto, areaPrincipal, dormir, esperarAssentar, esperarAte, rotulo, todos } from './dom';
import { explicacaoMenuFaltando, explicacaoMenuSobrando, explicacaoVazamento } from './explicacoes';
import { cenariosDoPerfil } from './cenarios';
import { explorarPagina } from './explorador';
import { esperadoPara, FATURAS_ABAS, PLATAFORMA_ABAS, type ItemMenu } from './matriz';
import type { Contexto, Modo } from './tipos';

const TEXTO_BLOQUEIO = /acesso restrito|sem permiss|n[aã]o tem (autoriza|permiss)|n[aã]o est[aá] dispon[ií]vel para (seu|o seu) perfil|n[aã]o tem acesso/i;
const PERFIS_VAGAS = ['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR'];
const PERFIS_DOCUMENTOS = ['DEV', 'ADMIN', 'RH', 'RH_RS'];
const PERFIS_RESPONSAVEIS = ['DEV', 'ADMIN', 'RH'];

export interface Bloco { nome: string; rodar: (ctx: Contexto) => Promise<void> }

const caminhoDe = (ctx: Contexto, item: Pick<ItemMenu, 'caminho'>) => `/${ctx.anfitriao.tenant()}${item.caminho}`;
const textoPrincipal = () => rotulo(areaPrincipal());

/** Links do menu lateral (so os do dashboard desta empresa). */
function linksDoMenu(ctx: Contexto): string[] {
  const prefixo = `/${ctx.anfitriao.tenant()}/dashboard`;
  const ancoras = todos<HTMLAnchorElement>('aside a[href], nav a[href]').filter((a) => !a.closest('#robo-qa-raiz'));
  const base = ancoras.length ? ancoras : todos<HTMLAnchorElement>('a[href]');
  return [...new Set(base.map((a) => (a.getAttribute('href') ?? '').split('?')[0].replace(/\/$/, '')).filter((h) => h.startsWith(prefixo)))];
}

const botaoExato = (raiz: ParentNode, nome: string) => todos('button', raiz).find((b) => rotulo(b) === nome) ?? null;
const navPorNome = (nome: string) => document.querySelector(`nav[aria-label="${nome}"]`);

async function estaBloqueado(ctx: Contexto, caminho: string): Promise<boolean> {
  await dormir(900);
  const atual = ctx.anfitriao.caminhoAtual().split('?')[0].replace(/\/$/, '');
  if (atual !== caminho.replace(/\/$/, '')) return true;
  return TEXTO_BLOQUEIO.test(document.body.innerText ?? '');
}

async function abrirTela(ctx: Contexto, item: ItemMenu) {
  const caminho = caminhoDe(ctx, item);
  const link = todos<HTMLAnchorElement>('a[href]').find((a) => (a.getAttribute('href') ?? '').split('?')[0].replace(/\/$/, '') === caminho && !a.closest('#robo-qa-raiz'));
  if (link) await clicar(ctx, link, `menu "${item.nome}"`);
  else await ir(ctx, caminho, `Abrindo ${item.nome}`);
  await esperarAssentar(500, 8000);
}

function blocoMenu(perfil: string): Bloco {
  return {
    nome: 'Menu lateral',
    rodar: async (ctx) => {
      ctx.cenario = 'Menu lateral';
      await ir(ctx, `/${ctx.anfitriao.tenant()}/dashboard`, 'Voltando ao painel inicial');
      await passo(ctx, 'Conferir se o menu mostra as funções certas para este perfil', async () => {
        const links = linksDoMenu(ctx);
        const { permitidos, negados } = esperadoPara(perfil);
        for (const item of permitidos) if (!links.includes(caminhoDe(ctx, item))) registrarAchado(ctx, `Menu: ${item.nome}`, explicacaoMenuFaltando(perfil, item.nome));
        for (const item of negados) if (links.includes(caminhoDe(ctx, item))) registrarAchado(ctx, `Menu: ${item.nome}`, explicacaoMenuSobrando(perfil, item.nome));
      });
    },
  };
}

function blocoTela(item: ItemMenu, obrigatorio: boolean, max: number): Bloco {
  return {
    nome: `Tela: ${item.nome}`,
    rodar: async (ctx) => {
      ctx.cenario = `Tela: ${item.nome}`;
      if (!obrigatorio && !linksDoMenu(ctx).includes(caminhoDe(ctx, item))) { naoTestado(ctx, `Tela: ${item.nome}`, `${item.nome} não aparece no menu deste perfil (depende de permissão individual), então não foi testada.`); return; }
      await passo(ctx, `Abrir ${item.nome} pelo menu`, () => abrirTela(ctx, item));
      await explorarPagina(ctx, item.nome, max);
    },
  };
}

function blocoBloqueio(item: ItemMenu): Bloco {
  return {
    nome: `Bloqueio: ${item.nome}`,
    rodar: async (ctx) => {
      ctx.cenario = 'Telas que devem estar bloqueadas';
      ctx.esperaNegado = true;
      try {
        const caminho = caminhoDe(ctx, item);
        await passo(ctx, `Tentar abrir ${item.nome} direto pelo endereço (deve ser bloqueado)`, async () => {
          await ir(ctx, caminho, `Digitando o endereço de ${item.nome} na barra do navegador`);
          if (!(await estaBloqueado(ctx, caminho))) registrarAchado(ctx, `Bloqueio: ${item.nome}`, explicacaoVazamento(ctx.perfil, `${item.nome} (${caminho})`));
        }, { verificarTela: false });
      } finally { ctx.esperaNegado = false; }
    },
  };
}

const blocoPainel: Bloco = {
  nome: 'Painel inicial',
  rodar: async (ctx) => {
    ctx.cenario = 'Painel inicial do perfil';
    await passo(ctx, 'Abrir o painel inicial', () => ir(ctx, `/${ctx.anfitriao.tenant()}/dashboard`, 'Abrindo o painel inicial'));
    await passo(ctx, 'Painel: mostra uma saudação com o nome', () => {
      if (ctx.perfil !== 'DEV' && !/(bom dia|boa tarde|boa noite|ol[aá])/i.test(textoPrincipal())) throw new Error('ESPERADO: o painel deveria cumprimentar o usuário ("Bom dia, Nome!"), mas nenhuma saudação apareceu.');
    });
    if (ctx.perfil === 'RH_RS') {
      await passo(ctx, 'RH — R&S: painel só de recrutamento (4 indicadores)', () => {
        const texto = textoPrincipal();
        for (const indicador of ['Vagas abertas', 'Candidaturas para triagem', 'Entrevistas próximas', 'Documentos a conferir']) {
          if (!texto.includes(indicador)) throw new Error(`ESPERADO: o painel do RH — R&S deveria mostrar o indicador "${indicador}", mas ele não apareceu.`);
        }
        if (/folha|ponto|férias|funcion[aá]rios/i.test(texto.split('Requer atenção')[0] ?? '')) throw new Error('ESPERADO: o painel do RH — R&S não deveria mostrar dados de folha, ponto, férias ou funcionários.');
      });
    }
  },
};

const blocoPlataforma: Bloco = {
  nome: 'Plataforma',
  rodar: async (ctx) => {
    const abas = PLATAFORMA_ABAS[ctx.perfil];
    if (!abas || !linksDoMenu(ctx).includes(`/${ctx.anfitriao.tenant()}/dashboard/platform`)) return;
    ctx.cenario = 'Plataforma (tela única)';
    await passo(ctx, 'Abrir a Plataforma', () => ir(ctx, `/${ctx.anfitriao.tenant()}/dashboard/platform`, 'Abrindo a Plataforma'));
    for (const aba of abas) {
      await passo(ctx, `Plataforma: aba "${aba}"`, async () => {
        const nav = await esperarAte(() => navPorNome('Seções da Plataforma'), { descricao: 'o menu de seções da Plataforma' });
        const botao = botaoExato(nav, aba);
        if (!botao) throw new Error(`ESPERADO: a aba "${aba}" da Plataforma deveria aparecer para este perfil.`);
        await clicar(ctx, botao, `aba "${aba}"`);
      });
      const subNav = navPorNome('Subseções');
      const nomes = subNav ? todos('button', subNav).map(rotulo).filter(Boolean) : [];
      for (const nome of nomes) {
        await passo(ctx, `Plataforma › ${aba} › "${nome}"`, async () => {
          const atual = navPorNome('Subseções');
          const botao = atual ? botaoExato(atual, nome) : null;
          if (!botao) throw new Error(`Tempo esgotado: não achei a subseção "${nome}"`);
          await clicar(ctx, botao, `subseção "${nome}"`);
        });
        await explorarPagina(ctx, `Plataforma › ${aba} › ${nome}`, 6);
      }
      if (!nomes.length) await explorarPagina(ctx, `Plataforma › ${aba}`, 10);
    }
  },
};

const blocoFaturas: Bloco = {
  nome: 'Faturas',
  rodar: async (ctx) => {
    const abas = FATURAS_ABAS[ctx.perfil];
    if (!abas || !linksDoMenu(ctx).includes(`/${ctx.anfitriao.tenant()}/dashboard/faturas`)) return;
    ctx.cenario = 'Faturas (planos, assinaturas e cupons)';
    await passo(ctx, 'Abrir Faturas', () => ir(ctx, `/${ctx.anfitriao.tenant()}/dashboard/faturas`, 'Abrindo Faturas'));
    for (const aba of abas) {
      await passo(ctx, `Faturas: aba "${aba}"`, async () => {
        const nav = await esperarAte(() => navPorNome('Seções de Faturas'), { descricao: 'as abas de Faturas' });
        const botao = botaoExato(nav, aba);
        if (!botao) throw new Error(`ESPERADO: a aba "${aba}" de Faturas deveria aparecer para este perfil.`);
        await clicar(ctx, botao, `aba "${aba}"`);
      });
      await explorarPagina(ctx, `Faturas › ${aba}`, 6);
    }
    for (const aba of ['Faturas', 'Assinaturas', 'Planos', 'Cupons'].filter((a) => !abas.includes(a))) {
      await passo(ctx, `Faturas: a aba "${aba}" NÃO deve aparecer para ${ctx.perfil}`, () => {
        const nav = navPorNome('Seções de Faturas');
        if (nav && botaoExato(nav, aba)) throw new Error(`ESPERADO: a aba "${aba}" aparece para o perfil ${ctx.perfil}, mas esse perfil não deveria ter essa função.`);
      });
    }
  },
};

const blocoVagas: Bloco = {
  nome: 'Vagas',
  rodar: async (ctx) => {
    if (!PERFIS_VAGAS.includes(ctx.perfil) || !linksDoMenu(ctx).includes(`/${ctx.anfitriao.tenant()}/dashboard/jobs`)) return;
    ctx.cenario = 'Vagas e candidatos';
    const prefixo = `/${ctx.anfitriao.tenant()}/dashboard/jobs/`;
    await passo(ctx, 'Abrir a lista de vagas', () => ir(ctx, `/${ctx.anfitriao.tenant()}/dashboard/jobs`, 'Abrindo Vagas'));
    const ancora = todos<HTMLAnchorElement>('a[href]').find((a) => { const h = a.getAttribute('href') ?? ''; return h.startsWith(prefixo) && !/\/(new|edit|settings)(\/|$)/.test(h) && h !== prefixo; });
    if (!ancora) { naoTestado(ctx, 'Vagas: funil e painel do candidato', 'Não há nenhuma vaga cadastrada para abrir.'); return; }
    await passo(ctx, 'Abrir o funil da primeira vaga', () => clicar(ctx, ancora, 'primeira vaga da lista'));
    await passo(ctx, `Vaga: bloco "Responsáveis pela vaga" ${PERFIS_RESPONSAVEIS.includes(ctx.perfil) ? 'deve' : 'NÃO deve'} aparecer para ${ctx.perfil}`, () => {
      const tem = /responsáveis pela vaga/i.test(document.body.innerText ?? '');
      if (PERFIS_RESPONSAVEIS.includes(ctx.perfil) && !tem) throw new Error('ESPERADO: o bloco "Responsáveis pela vaga" deveria aparecer para este perfil, mas não apareceu.');
      if (!PERFIS_RESPONSAVEIS.includes(ctx.perfil) && tem) throw new Error('ESPERADO: o bloco "Responsáveis pela vaga" apareceu para um perfil que não pode escolher responsáveis.');
    });
    await explorarPagina(ctx, 'Funil da vaga', 8);
    const candidato = document.querySelector<HTMLElement>('article[draggable] button');
    if (!candidato) { naoTestado(ctx, 'Vagas: painel do candidato', 'A vaga aberta não tem candidatos para abrir.'); return; }
    await passo(ctx, 'Abrir o painel do primeiro candidato', () => clicar(ctx, candidato, 'primeiro candidato do funil'));
    const abaPor = (nome: string) => todos('[role="tab"]').find((t) => rotulo(t) === nome) ?? null;
    await passo(ctx, `Candidato: aba "Documentos" ${PERFIS_DOCUMENTOS.includes(ctx.perfil) ? 'deve' : 'NÃO deve'} existir para ${ctx.perfil}`, () => {
      const tem = Boolean(abaPor('Documentos'));
      if (PERFIS_DOCUMENTOS.includes(ctx.perfil) && !tem) throw new Error('ESPERADO: a aba "Documentos" do candidato deveria existir para este perfil, mas não existe.');
      if (!PERFIS_DOCUMENTOS.includes(ctx.perfil) && tem) throw new Error('ESPERADO: a aba "Documentos" do candidato apareceu para um perfil que não deveria ver documentos de candidatos.');
    });
    if (ctx.perfil === 'RH_RS') {
      await passo(ctx, 'RH — R&S: a etapa "Contratado" NÃO pode ser oferecida', () => {
        const opcoes = [...document.querySelectorAll<HTMLOptionElement>('select[aria-label="Etapa"] option')].map((o) => o.textContent ?? '');
        if (opcoes.some((o) => /contratad/i.test(o))) throw new Error('ESPERADO: o RH — R&S não pode contratar, mas a etapa "Contratado" apareceu na lista de etapas do candidato.');
      });
    }
    for (const nome of ['Resumo', 'Avaliação', 'Notas', 'Entrevistas', 'Documentos', 'Histórico']) {
      if (nome === 'Documentos' && !PERFIS_DOCUMENTOS.includes(ctx.perfil)) continue;
      await passo(ctx, `Candidato › aba "${nome}"`, async () => {
        const aba = await esperarAte(() => abaPor(nome), { timeout: 4000, descricao: `a aba "${nome}"` });
        await clicar(ctx, aba, `aba "${nome}"`);
      });
    }
  },
};

/** A lista de blocos e sempre a mesma para o mesmo perfil: o indice salvo permite continuar de onde parou. */
export function blocosDoTour(perfil: string, modo: Modo = 'completo'): Bloco[] {
  const { permitidos, negados, incertos } = esperadoPara(perfil);
  if (modo === 'rapido') return [blocoMenu(perfil), ...permitidos.map((item) => blocoTela(item, true, 3)), blocoPainel];
  return [
    blocoMenu(perfil),
    ...permitidos.map((item) => blocoTela(item, true, 14)),
    ...incertos.map((item) => blocoTela(item, false, 14)),
    blocoPainel, blocoPlataforma, blocoFaturas, blocoVagas,
    ...cenariosDoPerfil(perfil),
    ...negados.map(blocoBloqueio),
  ];
}

export { acharPorTexto };