import { clicar, digitar, falar, passo, registrarAchado } from './acoes';
import { acharPorTexto, dormir, esperarAte, rotulo, todos } from './dom';
import { autorizarNome, registrarRecurso } from './recursos';
import { registrarSegredo } from './seguranca';
import { gerarSenhaForte, tratarPortoes } from './portoes';
import { criarFuncionarioComAcesso } from './cenarios';
import { criarUsuarioDeTeste, novoUsuarioDeTeste } from './usuarios';
import type { Contexto, Estado } from './tipos';

/** CNPJ com dígitos verificadores válidos (o cadastro recusa CNPJ inválido ou repetido). */
export function cnpjValido(): string {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  base[8] = 0; base[9] = 0; base[10] = 0; base[11] = 1;
  const dv = (nums: number[]) => {
    const pesos = nums.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = nums.reduce((t, n, i) => t + n * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(base); const d2 = dv([...base, d1]);
  return [...base, d1, d2].join('');
}

const MODULOS = ['employees', 'time-track', 'vacations', 'management', 'recruitment'];

export async function faseCliente(ctx: Contexto): Promise<void> {
  const estado: Estado = ctx.estado;
  const anf = ctx.anfitriao;
  const c = (estado.cliente ??= { etapa: 'plano' });
  ctx.cenario = 'Cliente novo: plano grátis, cadastro pela tela de login e equipe';

  // 1) O DEV cria o plano grátis que o cliente vai escolher (a única coisa feita como DEV).
  if (c.etapa === 'plano') {
    if (anf.usuario()?.perfil !== 'DEV' || !anf.chamarApi) {
      registrarAchado(ctx, 'Criar o plano grátis', { gravidade: 'alta', titulo: 'Para criar o plano grátis é preciso estar logado como DEV', explicacao: 'O teste do cliente novo foi interrompido.' });
      estado.fase = 'fim'; return;
    }
    const sufixo = Math.random().toString(36).slice(2, 6).toUpperCase();
    c.plano = `ROBO-QA Grátis ${sufixo}`;
    autorizarNome(c.plano);
    await passo(ctx, `Criar o plano grátis "${c.plano}"`, async () => {
      const plano = await anf.chamarApi!<{ id?: string; data?: { id?: string } }>('POST', '/platform/plans', {
        name: c.plano, description: 'Plano de teste do robô (ROBO-QA). Pode ser apagado.', isFree: true, price: 0, cycle: 'MONTHLY',
        maxUsers: 10, maxEmployees: 20, activeModules: MODULOS, isActive: true, isHidden: false, isRecommended: false,
      });
      const id = plano?.id ?? plano?.data?.id;
      if (!id) throw new Error('ESPERADO: o servidor deveria devolver o plano criado, mas não devolveu o identificador.');
      c.planoId = id;
      registrarRecurso({ id, nome: c.plano!, rota: '/platform/plans' });
    });
    if (!c.planoId) { estado.fase = 'fim'; return; }
    c.etapa = 'sair'; ctx.salvar();
  }

  // 2) Sai do DEV: daqui em diante é um cliente desconhecido.
  if (c.etapa === 'sair') {
    falar(ctx, 'Saindo do DEV: agora o robô é um cliente que achou a página');
    if (anf.usuario()) {
      await anf.sair();
      await esperarAte(() => !anf.usuario() && anf.caminhoAtual().startsWith('/login'), { timeout: 20000, descricao: 'a saída do DEV' });
    }
    c.etapa = 'cadastro'; ctx.salvar();
  }

  // 3) Cadastro pela área de login.
  if (c.etapa === 'cadastro') {
    const id = Math.random().toString(36).slice(2, 8);
    c.empresa = `ROBO-QA Empresa ${id}`;
    c.email = `robo-qa.cliente.${id}@example.com`;
    c.senha = gerarSenhaForte();
    registrarSegredo(c.senha);
    autorizarNome(c.empresa);
    ctx.esperaNegado = true;
    await passo(ctx, 'Na tela de login, clicar em criar conta e abrir o cadastro', async () => {
      if (!anf.caminhoAtual().startsWith('/login')) { anf.navegar('/login'); await dormir(800); }
      const link = await esperarAte(() => document.querySelector<HTMLAnchorElement>('a[href^="/cadastro"], a[href^="/criar-conta"]') ?? acharPorTexto('a', /criar (sua )?(conta|empresa)|cadastre|come[cç]ar/i), { timeout: 8000, descricao: 'o link "Criar conta" na tela de login' }).catch(() => null);
      if (link) await clicar(ctx, link, 'link Criar conta (tela de login)');
      else {
        registrarAchado(ctx, 'Tela de login sem link de cadastro', { gravidade: 'media', titulo: 'A tela de login não tem link para criar conta', explicacao: 'Um cliente que chega pela tela de login não encontra como criar a empresa. O robô foi pelo endereço /cadastro.' }, 'inconclusivo');
        anf.navegar('/cadastro');
      }
      await esperarAte(() => anf.caminhoAtual().startsWith('/cadastro') && document.querySelector('#c-company'), { descricao: 'o formulário de cadastro abrir' });
    });
    await passo(ctx, 'Cadastro, etapa 1: dados da empresa e do administrador', async () => {
      const campo = async (id: string) => esperarAte(() => document.querySelector<HTMLInputElement>(`#${id}`), { descricao: `o campo ${id}` });
      await digitar(ctx, await campo('c-company'), c.empresa!, 'campo Nome da empresa');
      await digitar(ctx, await campo('c-doc'), cnpjValido(), 'campo CNPJ');
      await digitar(ctx, await campo('c-name'), 'ROBO-QA Cliente Administrador', 'campo Seu nome');
      await digitar(ctx, await campo('c-email'), c.email!, 'campo E-mail de acesso');
      await digitar(ctx, await esperarAte(() => document.querySelector<HTMLInputElement>('form input[type="password"]'), { descricao: 'o campo Senha' }), c.senha!, 'campo Senha');
      await clicar(ctx, await esperarAte(() => acharPorTexto('button', /^continuar$/i), { descricao: 'o botão "Continuar"' }), 'botão Continuar');
      await esperarAte(() => document.querySelector('#c-seats'), { descricao: 'a etapa 2 (plano) abrir' });
    });
    await passo(ctx, `Cadastro, etapa 2: escolher o plano "${c.plano}", aceitar os termos e criar a empresa`, async () => {
      const opcao = await esperarAte(() => todos('fieldset label').find((l) => rotulo(l).includes(c.plano!)), { timeout: 15000, descricao: `o plano "${c.plano}" na lista (o plano grátis recém-criado precisa aparecer para o cliente)` });
      await clicar(ctx, opcao, `plano ${c.plano}`);
      const aceite = await esperarAte(() => todos<HTMLInputElement>('input[type="checkbox"]').find(Boolean), { descricao: 'a caixa de aceite dos termos' });
      await clicar(ctx, aceite, 'caixa "Li e aceito os Termos"');
      await clicar(ctx, await esperarAte(() => acharPorTexto('button', /criar minha empresa/i), { descricao: 'o botão "Criar minha empresa"' }), 'botão Criar minha empresa');
      await esperarAte(() => /\/dashboard/.test(anf.caminhoAtual()) && anf.usuario(), { timeout: 40000, descricao: 'o painel da empresa nova abrir' }).catch(() => {
        const erro = todos('[role="alert"]').map(rotulo).find(Boolean) ?? '';
        throw new Error(`ESPERADO: a empresa deveria ser criada e o painel abrir, mas ficou no cadastro.${erro ? ` Mensagem na tela: "${erro.slice(0, 200)}".` : ''}`);
      });
    });
    ctx.esperaNegado = false;
    if (!/\/dashboard/.test(anf.caminhoAtual()) || !anf.usuario()) { estado.fase = 'fim'; return; }
    const empresaId = anf.empresaId?.();
    if (empresaId) registrarRecurso({ id: empresaId, nome: c.empresa!, rota: '/platform/companies' });
    c.etapa = 'portoes'; ctx.salvar();
  }

  // 4) Primeiro acesso do administrador (termo, boas-vindas, passo a passo).
  if (c.etapa === 'portoes') {
    ctx.cenario = 'Primeiro acesso do administrador da empresa nova';
    await tratarPortoes(ctx, c.senha!);
    c.etapa = 'equipe'; c.fila = ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA']; ctx.salvar();
  }

  // 5) O administrador cadastra a equipe pelas telas.
  if (c.etapa === 'equipe') {
    ctx.perfil = 'ADMIN';
    const equipe = (estado.usuarios = estado.usuarios.filter((u) => u.perfil === 'ADMIN' && u.email === c.email));
    if (!equipe.length) equipe.push({ perfil: 'ADMIN', nome: 'ROBO-QA Cliente Administrador', email: c.email!, senha: c.senha!, criado: true, reutilizada: true, situacao: 'pendente' });
    for (const perfil of c.fila ?? []) {
      const usuario = novoUsuarioDeTeste(perfil);
      equipe.push(usuario);
      try {
        const comCadastro = perfil === 'FUNCIONARIO' && (await criarFuncionarioComAcesso(ctx, usuario));
        if (!comCadastro && !usuario.criado) await criarUsuarioDeTeste(ctx, usuario);
      } catch (erro) {
        if (['CANCELADO', 'TEMPO_BLOCO'].includes((erro as Error)?.message)) throw erro;
        usuario.situacao = 'erro'; usuario.motivo = 'não foi possível criar o acesso';
      }
      ctx.salvar();
    }
    c.etapa = 'fim'; ctx.salvar();
  }

  estado.fase = 'usuarios';
  estado.idxUsuario = 0;
  estado.subEtapa = 'sair';
  ctx.salvar();
}
