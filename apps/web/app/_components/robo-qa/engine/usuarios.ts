import { clicar, digitar, ir, passo } from './acoes';
import { acharPorTexto, dormir, esperarAte, rotulo, setValor, todos } from './dom';
import { registrarSegredo } from './seguranca';
import type { Contexto, UsuarioTeste } from './tipos';

export const ROTULO_PERFIL: Record<string, string> = {
  DEV: 'Desenvolvedor', CEO: 'CEO', CONTABIL: 'Contábil', COMERCIAL: 'Comercial', ADMIN: 'Administrador',
  RH: 'RH - Empresas', RH_RS: 'RH - R&S', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Consulta',
};

/** Mensagem de limite de licencas da empresa: pre-condicao do ambiente de teste, nao defeito do sistema. */
export const ehLimiteDeLicencas = (texto: string) => /SEAT_LIMIT|licen[cç]as/i.test(texto);

const aleatorio = () => Math.random().toString(36).slice(2, 8);

export function novoUsuarioDeTeste(perfil: string): UsuarioTeste {
  const id = aleatorio();
  return { perfil, nome: `ROBO-QA ${ROTULO_PERFIL[perfil] ?? perfil} ${id}`, email: `robo-qa.${perfil.toLowerCase().replace(/_/g, '')}.${id}@example.com`, senha: '', criado: false, situacao: 'pendente' };
}

/** Cria o usuario pelo MESMO formulario que uma pessoa usaria (Usuarios > Novo acesso) e le a senha provisoria mostrada. */
export async function criarUsuarioDeTeste(ctx: Contexto, usuario: UsuarioTeste): Promise<boolean> {
  ctx.cenario = `Criar usuário de teste (${ROTULO_PERFIL[usuario.perfil] ?? usuario.perfil})`;
  let provisoria = '';
  const ok = await passo(ctx, `Criar o acesso de teste "${usuario.nome}"`, async () => {
    await ir(ctx, `/${ctx.anfitriao.tenant()}/dashboard/users`, 'Abrindo a tela de Usuários');
    await clicar(ctx, await esperarAte(() => acharPorTexto('button', /novo acesso/i), { descricao: 'o botão "Novo acesso"' }), 'botão Novo acesso');

    const dialogo = await esperarAte(() => todos('[role="dialog"], .fixed.inset-0').find((d) => /novo acesso/i.test(rotulo(d))), { descricao: 'a janela "Novo acesso"' });
    const livre = await esperarAte(() => acharPorTexto('button[role="radio"]', /pessoa sem cadastro/i, dialogo), { descricao: 'a opção "Pessoa sem cadastro"' });
    await clicar(ctx, livre, 'opção "Pessoa sem cadastro"');

    const empresa = todos<HTMLSelectElement>('select', dialogo).find((s) => /empresa/i.test(rotulo(s.closest('label') ?? s)));
    if (empresa && !empresa.value) {
      const opcao = [...empresa.options].find((o) => o.value);
      if (!opcao) throw new Error('ESPERADO: o DEV deveria poder escolher uma empresa na janela "Novo acesso", mas a lista veio vazia.');
      setValor(empresa, opcao.value);
      await dormir(200);
    }

    const campo = (regra: RegExp) => esperarAte(() => todos<HTMLInputElement>('label', dialogo).filter((l) => regra.test(rotulo(l))).map((l) => l.querySelector('input')).find(Boolean) as HTMLInputElement | undefined, { descricao: `o campo ${regra}` });
    await digitar(ctx, await campo(/^nome/i), usuario.nome, 'campo Nome');
    await digitar(ctx, await campo(/e-mail/i), usuario.email, 'campo E-mail de acesso');

    const nomePerfil = ROTULO_PERFIL[usuario.perfil] ?? usuario.perfil;
    const escolha = await esperarAte(() => todos('fieldset label', dialogo).find((l) => rotulo(l).startsWith(nomePerfil)), { descricao: `a visão "${nomePerfil}" na lista de perfis` });
    await clicar(ctx, escolha, `visão "${nomePerfil}"`);

    await clicar(ctx, await esperarAte(() => acharPorTexto('button', /^criar acesso/i, document), { descricao: 'o botão "Criar acesso"' }), 'botão Criar acesso');

    const resultado = await esperarAte(() => {
      const codigo = todos('code').map(rotulo).find((t) => t.length >= 5);
      if (codigo) return { codigo };
      const erro = todos('[role="alert"]').map(rotulo).find(Boolean);
      return erro ? { erro } : null;
    }, { timeout: 20000, descricao: 'a senha provisória (ou uma mensagem de erro) depois de criar o acesso' });
    if ('erro' in resultado && ehLimiteDeLicencas(resultado.erro)) { ctx.estado.semLicencas = true; return; }
    if ('erro' in resultado) throw new Error(`ESPERADO: o acesso deveria ser criado, mas a tela mostrou: "${resultado.erro}".`);
    provisoria = resultado.codigo;
    await clicar(ctx, await esperarAte(() => acharPorTexto('button', /^concluir$/i), { descricao: 'o botão "Concluir"' }), 'botão Concluir');
  });
  if (ok && provisoria) { registrarSegredo(provisoria); usuario.senha = provisoria; usuario.criado = true; return true; }
  usuario.situacao = 'erro';
  usuario.motivo = ctx.estado.semLicencas ? 'a empresa não tem licenças livres' : 'não foi possível criar o acesso de teste';
  return false;
}