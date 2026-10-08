// Cenarios de "uso de verdade": o robo cadastra, bate ponto, pede ferias, cria vaga e cliente, sempre pelos
// mesmos formularios que uma pessoa usaria. Tudo que ele cria leva o nome "ROBO-QA ..." para o DEV limpar depois.
import { clicar, cliqueDuplo, digitar, falar, ir, naoTestado, passo, registrarAchado } from './acoes';
import { acharPorTexto, dormir, esperarAssentar, esperarAte, rotulo, setValor, todos } from './dom';
import { gerarSenhaForte } from './portoes';
import { registrarSegredo } from './seguranca';
import { autorizarNome } from './recursos';
import { ehLimiteDeLicencas } from './usuarios';
import type { Contexto, UsuarioTeste } from './tipos';

export interface BlocoCenario { nome: string; rodar: (ctx: Contexto) => Promise<void> }

const aleatorio = () => Math.random().toString(36).slice(2, 7);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const tenantUrl = (ctx: Contexto, rota: string) => `/${ctx.anfitriao.tenant()}${rota}`;

/** CPF valido (digitos verificadores certos) para o servidor nao recusar por formato. */
export function cpfValido(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (base: number[]) => { const soma = base.reduce((s, d, i) => s + d * (base.length + 1 - i), 0); const r = (soma * 10) % 11; return r === 10 ? 0 : r; };
  const d1 = dv(n); const d2 = dv([...n, d1]);
  return [...n, d1, d2].join('');
}

function campoDe(raiz: ParentNode, texto: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  const alvo = texto.toLowerCase();
  const rotuloLimpo = (el: Element) => rotulo(el).replace(/\s*\*\s*$/, '').toLowerCase();
  const label = todos('label', raiz).find((l) => rotuloLimpo(l).startsWith(alvo));
  return (label?.querySelector('input, select, textarea') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) ?? null;
}

/** Preenche como uma pessoa: texto digitado letra a letra; data/hora/numero/lista de uma vez. */
async function preencher(ctx: Contexto, campo: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, valor: string, descricao: string) {
  await ctx.checarControle();
  if (campo instanceof HTMLSelectElement) {
    falar(ctx, `Escolhendo em: ${descricao}`);
    campo.scrollIntoView({ block: 'center' });
    const opcao = [...campo.options].find((o) => o.value === valor || (o.textContent ?? '').trim().toLowerCase().startsWith(valor.toLowerCase()));
    if (!opcao) throw new Error(`ESPERADO: a lista "${descricao}" deveria ter a opção "${valor}", mas ela não existe.`);
    setValor(campo, opcao.value);
    await ctx.aguardar(ctx.ritmo.antes);
    return;
  }
  const direto = campo instanceof HTMLTextAreaElement ? valor.length > 40 : ['date', 'time', 'number'].includes(campo.type);
  if (direto) { falar(ctx, `Preenchendo: ${descricao}`); campo.scrollIntoView({ block: 'center' }); campo.focus(); setValor(campo, valor); await ctx.aguardar(ctx.ritmo.antes); return; }
  await digitar(ctx, campo, valor, descricao);
}

async function preencherPorRotulo(ctx: Contexto, raiz: ParentNode, rotuloCampo: string, valor: string) {
  const campo = await esperarAte(() => campoDe(raiz, rotuloCampo), { timeout: 6000, descricao: `o campo "${rotuloCampo}"` });
  await preencher(ctx, campo, valor, `campo ${rotuloCampo}`);
}

const botaoTexto = (regra: RegExp, raiz: ParentNode = document) => acharPorTexto('button', regra, raiz);

async function abrirAbaCadastro(ctx: Contexto, nome: string) {
  const achar = () => {
    const nav = document.querySelector('nav[aria-label="Seções do cadastro"]');
    const aba = nav ? todos('button', nav).find((b) => rotulo(b) === nome) : null;
    if (aba) return { aba };
    // Celular: as abas viram uma lista de seleção ("1. Dados pessoais", "2. Documentos"...).
    const lista = todos<HTMLSelectElement>('select').find((s) => /seção do cadastro/i.test(rotulo(s.closest('label') ?? s)));
    const opcao = lista ? [...lista.options].find((o) => o.text.replace(/^\d+\.\s*/, '').trim() === nome) : null;
    return lista && opcao ? { lista, valor: opcao.value } : null;
  };
  const alvo = await esperarAte(achar, { timeout: 8000, descricao: `a seção "${nome}" do cadastro` });
  if ('aba' in alvo) await clicar(ctx, alvo.aba, `seção "${nome}"`);
  else { setValor(alvo.lista, alvo.valor); await dormir(300); }
}

/** Cadastra um funcionario pelo formulario completo. Com `acesso`, libera o painel e devolve a senha provisoria. */
export async function cadastrarFuncionario(ctx: Contexto, nome: string, email: string, acesso: boolean): Promise<string> {
  autorizarNome(nome);
  await ir(ctx, tenantUrl(ctx, '/dashboard/employees/new'), 'Abrindo o cadastro de funcionário');
  const formulario = await esperarAte(() => document.querySelector('form[novalidate]') ?? document.querySelector('form'), { descricao: 'o formulário de funcionário' });

  // Forca o formulario vazio primeiro: o sistema deveria barrar com uma lista de pendencias, nunca salvar nem quebrar.
  await passo(ctx, 'Tentar salvar o formulário em branco (deve ser barrado, não deve salvar nem quebrar)', async () => {
    await clicar(ctx, await esperarAte(() => botaoTexto(/^salvar funcion[aá]rio/i), { descricao: 'o botão "Salvar funcionário"' }), 'botão Salvar funcionário (formulário vazio)');
    await dormir(400);
    if (!/\/employees\/new/.test(ctx.anfitriao.caminhoAtual())) throw new Error('ESPERADO: o formulário vazio não deveria ser salvo (faltam campos obrigatórios), mas o sistema saiu da tela como se tivesse salvo.');
    const codigoIndevido = todos('code').map(rotulo).find((t) => t.length >= 5);
    if (codigoIndevido) throw new Error('ESPERADO: o sistema não deveria criar um funcionário a partir de um formulário em branco, mas mostrou uma senha provisória.');
  }, { verificarTela: false });

  // E-mail invalido: o sistema deve recusar sem quebrar.
  const campoEmailInvalido = await esperarAte(() => campoDe(formulario, 'E-mail'), { descricao: 'o campo "E-mail"' });
  await preencher(ctx, campoEmailInvalido, 'nao-e-um-email', 'campo E-mail (valor inválido, de propósito)');
  await passo(ctx, 'Tentar salvar com e-mail inválido (deve ser barrado, não deve salvar nem quebrar)', async () => {
    await clicar(ctx, await esperarAte(() => botaoTexto(/^salvar funcion[aá]rio/i), { descricao: 'o botão "Salvar funcionário"' }), 'botão Salvar funcionário (e-mail inválido)');
    await dormir(400);
    if (!/\/employees\/new/.test(ctx.anfitriao.caminhoAtual())) throw new Error('ESPERADO: um e-mail inválido ("nao-e-um-email") não deveria ser aceito, mas o sistema saiu da tela como se tivesse salvo.');
  }, { verificarTela: false });

  await preencherPorRotulo(ctx, formulario, 'Nome completo', nome);
  await preencherPorRotulo(ctx, formulario, 'CPF', cpfValido());
  await preencherPorRotulo(ctx, formulario, 'E-mail', email);
  await preencherPorRotulo(ctx, formulario, 'Telefone', '11 90000-0000');

  await abrirAbaCadastro(ctx, 'Dados profissionais');
  const admissao = new Date(); admissao.setFullYear(admissao.getFullYear() - 2);
  await preencherPorRotulo(ctx, formulario, 'Data de admissão', iso(admissao));
  await preencherPorRotulo(ctx, formulario, 'Departamento', 'Operação');
  await preencherPorRotulo(ctx, formulario, 'Cargo', 'Assistente Administrativo');

  await abrirAbaCadastro(ctx, 'Jornada');
  await preencherPorRotulo(ctx, formulario, 'Entrada padrão', '08:00');
  await preencherPorRotulo(ctx, formulario, 'Saída almoço', '12:00');
  await preencherPorRotulo(ctx, formulario, 'Retorno almoço', '13:00');
  await preencherPorRotulo(ctx, formulario, 'Saída padrão', '17:00');

  await abrirAbaCadastro(ctx, 'Contrato e acesso');
  await preencherPorRotulo(ctx, formulario, 'Salário', '2500');
  if (acesso) {
    await preencherPorRotulo(ctx, formulario, 'Permitir acesso ao painel', 'Sim');
    await preencherPorRotulo(ctx, formulario, 'Perfil de acesso', 'Funcionário');
  }
  // Clique duplo de proposito no botao de salvar: o sistema nao pode criar dois funcionarios por causa de um duplo clique sem querer.
  await cliqueDuplo(ctx, await esperarAte(() => botaoTexto(/^salvar funcion[aá]rio/i), { descricao: 'o botão "Salvar funcionário"' }), 'botão Salvar funcionário (clique duplo de propósito)');

  const resultado = await esperarAte(() => {
    const licenca = todos('[role="alert"], [role="status"], [data-sonner-toast]').map(rotulo).find((t) => ehLimiteDeLicencas(t));
    if (licenca) return { licenca };
    const codigo = todos('code').map(rotulo).find((t) => t.length >= 5);
    if (codigo) return { codigo };
    const alerta = todos('[role="alert"]').map(rotulo).find(Boolean);
    if (alerta) return { alerta };
    if (!acesso && !/\/employees\/new/.test(ctx.anfitriao.caminhoAtual())) return { codigo: '' };
    return null;
  }, { timeout: 20000, descricao: 'a confirmação do cadastro do funcionário' });
  if ('licenca' in resultado) { ctx.estado.semLicencas = true; return ''; }
  if ('alerta' in resultado) throw new Error(`ESPERADO: o funcionário deveria ser cadastrado, mas a tela mostrou: "${resultado.alerta.slice(0, 200)}".`);
  if (acesso && !resultado.codigo) throw new Error('ESPERADO: ao liberar o acesso, o sistema deveria mostrar a senha provisória do funcionário.');
  if (resultado.codigo) registrarSegredo(resultado.codigo);
  const concluir = botaoTexto(/ir para funcion[aá]rios/i);
  if (concluir) await clicar(ctx, concluir, 'botão Ir para Funcionários');
  return resultado.codigo;
}

/** Conta de teste do perfil FUNCIONARIO: nasce como funcionario de verdade (com cadastro), para poder bater ponto e pedir ferias. */
export async function criarFuncionarioComAcesso(ctx: Contexto, usuario: UsuarioTeste): Promise<boolean> {
  ctx.cenario = 'Criar funcionário de teste (com acesso ao painel)';
  let senha = '';
  const ok = await passo(ctx, `Cadastrar o funcionário "${usuario.nome}" com acesso ao painel`, async () => { senha = await cadastrarFuncionario(ctx, usuario.nome, usuario.email, true); });
  if (ok && senha) { usuario.senha = senha; usuario.criado = true; return true; }
  return false;
}

export const blocoCadastrarFuncionario: BlocoCenario = {
  nome: 'Cadastrar funcionário',
  rodar: async (ctx) => {
    ctx.cenario = 'Cadastro de funcionário';
    const id = aleatorio();
    const nome = `ROBO-QA Funcionário ${ctx.perfil} ${id}`;
    const ok = await passo(ctx, 'Preencher e salvar um funcionário novo (8 seções)', async () => { await cadastrarFuncionario(ctx, nome, `robo-qa.func.${id}@example.com`, false); });
    if (!ok) return;
    await passo(ctx, 'O funcionário recém-cadastrado aparece na lista de Funcionários', async () => {
      await ir(ctx, tenantUrl(ctx, '/dashboard/employees'), 'Voltando à lista de funcionários');
      const busca = todos<HTMLInputElement>('input[type="search"], input[placeholder*="uscar"]').find(Boolean);
      if (busca) { setValor(busca, nome); await dormir(600); await esperarAssentar(400, 5000); }
      const ocorrencias = (document.body.innerText ?? '').split(nome).length - 1;
      if (ocorrencias === 0) registrarAchado(ctx, 'Funcionário cadastrado não apareceu na lista', { gravidade: 'media', titulo: 'Inconclusivo: o funcionário salvo não apareceu na lista', explicacao: `Depois de salvar "${nome}", a lista de funcionários não mostrou esse nome (pode ser paginação ou filtro). Confira manualmente.` }, 'inconclusivo');
      if (ocorrencias > 1) throw new Error(`ESPERADO: o clique duplo no botão "Salvar funcionário" deveria criar só um funcionário, mas "${nome}" aparece ${ocorrencias} vezes na lista.`);
    });
  },
};

export const blocoCriarVaga: BlocoCenario = {
  nome: 'Criar vaga',
  rodar: async (ctx) => {
    ctx.cenario = 'Criar vaga';
    const id = aleatorio();
    autorizarNome(`ROBO-QA Vaga ${id}`);
    await passo(ctx, 'Criar uma vaga pelo passo a passo (salva como rascunho)', async () => {
      await ir(ctx, tenantUrl(ctx, '/dashboard/jobs/new'), 'Abrindo "Nova vaga"');
      const titulo = await esperarAte(() => todos<HTMLInputElement>('input').find((i) => /analista de rh/i.test(i.placeholder)), { descricao: 'o campo "Título da vaga"' });
      await preencher(ctx, titulo, `ROBO-QA Vaga ${id}`, 'campo Título da vaga');
      const dep = todos<HTMLInputElement>('input').find((i) => /recursos humanos/i.test(i.placeholder));
      if (dep) await preencher(ctx, dep, 'Recursos Humanos', 'campo Departamento');
      const proxima = () => botaoTexto(/^pr[oó]xima/i);
      await clicar(ctx, await esperarAte(proxima, { descricao: 'o botão "Próxima"' }), 'botão Próxima (Descrição)');
      const descricao = await esperarAte(() => todos<HTMLTextAreaElement>('textarea')[0], { descricao: 'o campo "Descrição da vaga"' });
      await preencher(ctx, descricao, 'Vaga criada automaticamente pelo robô de teste (ROBO-QA). Pode ser apagada.', 'campo Descrição da vaga');
      for (let i = 0; i < 4 && proxima(); i++) await clicar(ctx, proxima() as HTMLElement, 'botão Próxima');
      const rascunho = await esperarAte(() => botaoTexto(/salvar (como )?rascunho/i), { descricao: 'o botão "Salvar como rascunho"' });
      // Clique duplo de proposito: nao pode criar duas vagas iguais por causa de um clique repetido sem querer.
      await cliqueDuplo(ctx, rascunho, 'botão Salvar como rascunho (clique duplo de propósito)');
      await esperarAte(() => !/\/jobs\/new/.test(ctx.anfitriao.caminhoAtual()) || todos('[role="alert"]').map(rotulo).find(Boolean), { timeout: 15000, descricao: 'a vaga ser salva' });
      const alerta = todos('[role="alert"]').map(rotulo).find(Boolean);
      if (alerta && /\/jobs\/new/.test(ctx.anfitriao.caminhoAtual())) throw new Error(`ESPERADO: a vaga deveria ser salva, mas a tela mostrou: "${alerta.slice(0, 200)}".`);
    });
    await passo(ctx, 'Conferir que o clique duplo não criou duas vagas iguais', async () => {
      await ir(ctx, tenantUrl(ctx, '/dashboard/jobs'), 'Voltando à lista de vagas');
      const titulo = `ROBO-QA Vaga ${id}`;
      const ocorrencias = (document.body.innerText ?? '').split(titulo).length - 1;
      if (ocorrencias > 1) throw new Error(`ESPERADO: o clique duplo em "Salvar como rascunho" deveria criar só uma vaga, mas "${titulo}" aparece ${ocorrencias} vezes na lista.`);
    });
  },
};

export const blocoPonto: BlocoCenario = {
  nome: 'Bater ponto',
  rodar: async (ctx) => {
    ctx.cenario = 'Bater ponto';
    await passo(ctx, 'Abrir Escalas › Ponto', () => ir(ctx, tenantUrl(ctx, '/dashboard/escalas?view=ponto'), 'Abrindo a tela de Ponto'));
    const secao = () => document.querySelector('section[aria-label="Bater ponto"]');
    if (!secao()) { naoTestado(ctx, 'Bater ponto', 'A área "Bater ponto" não apareceu para este perfil (sem vínculo de funcionário ou sem permissão de ponto).'); return; }
    let batidas = 0;
    for (let i = 0; i < 2; i++) { // 2 batidas bastam e cada intervalo minimo custa ~1 min
      const botao = secao() ? botaoTexto(/^registrar /i, secao() as Element) : null;
      if (!botao) break;
      const rotuloBotao = rotulo(botao);
      let parar = false;
      await passo(ctx, `Bater ponto: ${rotuloBotao}${i === 0 ? ' (clique duplo de propósito)' : ''}`, async () => {
        // Na primeira marcação, clique duplo de proposito: o sistema nao pode registrar duas batidas por um clique repetido sem querer.
        if (i === 0) await cliqueDuplo(ctx, botao, rotuloBotao); else await clicar(ctx, botao, rotuloBotao);
        const ler = () => {
          const area = secao() as Element | null;
          if (!area) return null;
          const ok = todos('[role="status"]', area).map(rotulo).find((t) => /registrada/i.test(t));
          if (ok) return { ok };
          const alerta = todos('[role="alert"]', area).map(rotulo).find(Boolean);
          return alerta ? { alerta } : null;
        };
        let r = await esperarAte(ler, { timeout: 15000, descricao: 'o comprovante do ponto' });
        // Regras normais do sistema, nao sao defeito: o 2o clique do clique duplo e barrado ("ja esta sendo processada") e ha 60 s minimos entre batidas.
        if ('alerta' in r && /sendo processada/i.test(r.alerta)) {
          r = await esperarAte(() => { const x = ler(); return x && 'ok' in x ? x : null; }, { timeout: 20000, descricao: 'o comprovante da primeira batida (o clique duplo deveria registrar uma só)' });
        } else if ('alerta' in r && /aguarde\s+(\d+)\s*s/i.test(r.alerta)) {
          const espera = Number(/aguarde\s+(\d+)\s*s/i.exec(r.alerta)?.[1] ?? 60);
          falar(ctx, `O sistema exige ${espera}s entre batidas. Aguardando para bater de novo`);
          await dormir((espera + 3) * 1000);
          await clicar(ctx, (secao() ? botaoTexto(/^registrar /i, secao() as Element) : null) ?? botao, rotuloBotao);
          r = await esperarAte(ler, { timeout: 15000, descricao: 'o comprovante do ponto' });
        }
        if ('alerta' in r) {
          parar = true;
          if (/localiza|gps|permiss/i.test(r.alerta)) registrarAchado(ctx, `Ponto: ${rotuloBotao}`, { gravidade: 'baixa', titulo: 'Inconclusivo: o navegador não deu a localização para bater o ponto', explicacao: `O sistema exige localização e o navegador não liberou ("${r.alerta.slice(0, 160)}"). Libere a localização do site e rode de novo.` }, 'inconclusivo');
          else if (/v[ií]nculo|funcion[aá]rio n[aã]o|cadastro/i.test(r.alerta)) registrarAchado(ctx, `Ponto: ${rotuloBotao}`, { gravidade: 'baixa', titulo: 'Inconclusivo: este usuário de teste não tem cadastro de funcionário', explicacao: `A batida foi recusada: "${r.alerta.slice(0, 160)}". Use "Recriar contas de teste" para o robô criar o funcionário com acesso.` }, 'inconclusivo');
          else throw new Error(`ESPERADO: o ponto deveria ser registrado, mas a tela mostrou: "${r.alerta.slice(0, 200)}".`);
        } else batidas++;
      });
      if (parar) break;
    }
    if (batidas === 0 && !secao()?.textContent?.match(/todas as marca/i)) return;
    await passo(ctx, 'O comprovante/lista de hoje mostra as marcações feitas', () => {
      const texto = rotulo(document.body);
      if (batidas > 0 && !/\d{2}:\d{2}/.test(texto)) throw new Error('ESPERADO: depois de bater o ponto, a tela deveria mostrar o horário registrado.');
    });
    if (batidas > 0) {
      await passo(ctx, 'Conferir sinal de marcação duplicada depois do clique duplo na primeira batida', () => {
        const linhas = todos('li, tr', secao() as Element ?? document.body).map(rotulo).filter((t) => /\d{2}:\d{2}/.test(t));
        const repetida = linhas.find((t, i) => linhas.indexOf(t) !== i);
        // So uma pista (pode ser texto repetido por acaso em outro lugar da tela): registra para o DEV conferir manualmente, sem acusar defeito sozinho.
        if (repetida) registrarAchado(ctx, 'Ponto: possível marcação duplicada', { gravidade: 'media', titulo: 'Inconclusivo: pode ter batido o ponto duas vezes no clique duplo', explicacao: `Depois do clique duplo de propósito, a linha "${repetida.slice(0, 120)}" aparece mais de uma vez na lista de hoje. Confira manualmente se o clique duplo criou duas marcações.` }, 'inconclusivo');
      });
    }
  },
};

export const blocoFerias: BlocoCenario = {
  nome: 'Solicitar férias',
  rodar: async (ctx) => {
    ctx.cenario = 'Solicitar férias';
    await passo(ctx, 'Abrir Férias', () => ir(ctx, tenantUrl(ctx, '/dashboard/vacations'), 'Abrindo Férias'));
    const nova = botaoTexto(/nova solicita[cç][aã]o/i);
    if (!nova) { naoTestado(ctx, 'Férias: nova solicitação', 'O botão "Nova solicitação" não apareceu para este perfil.'); return; }
    await passo(ctx, 'Pedir férias: escolher datas e enviar', async () => {
      await clicar(ctx, nova, 'botão Nova solicitação');
      const modal = await esperarAte(() => todos('[role="dialog"]').find((d) => /solicita[cç][aã]o de f[eé]rias/i.test(rotulo(d))), { descricao: 'a janela "Nova solicitação de férias"' });
      const funcionario = campoDe(modal, 'Funcionário');
      if (funcionario instanceof HTMLSelectElement && !funcionario.value) {
        const opcao = [...funcionario.options].find((o) => o.value);
        if (!opcao) throw new Error('Tempo esgotado: a lista de funcionários da solicitação veio vazia');
        setValor(funcionario, opcao.value); await dormir(500);
      }
      const inicio = new Date(); inicio.setDate(inicio.getDate() + 60); while ([0, 6].includes(inicio.getDay())) inicio.setDate(inicio.getDate() + 1);
      const fim = new Date(inicio); fim.setDate(fim.getDate() + 9);
      await preencherPorRotulo(ctx, modal, 'Início', iso(inicio));
      await preencherPorRotulo(ctx, modal, 'Fim', iso(fim));
      await esperarAssentar(400, 5000);
      const enviar = await esperarAte(() => botaoTexto(/^solicitar f[eé]rias/i, document), { descricao: 'o botão "Solicitar férias"' });
      if ((enviar as HTMLButtonElement).disabled) {
        registrarAchado(ctx, 'Férias: enviar solicitação', { gravidade: 'baixa', titulo: 'Inconclusivo: o botão "Solicitar férias" ficou desativado', explicacao: `O sistema não liberou o envio (${todos('[role="alert"]', modal).map(rotulo).join(' | ').slice(0, 200) || 'sem motivo na tela'}). Pode ser regra de saldo/tempo de casa e não defeito.` }, 'inconclusivo');
        const cancelar = botaoTexto(/^cancelar/i, modal); if (cancelar) await clicar(ctx, cancelar, 'botão Cancelar');
        const descartar = botaoTexto(/descartar/i); if (descartar) await clicar(ctx, descartar, 'botão Descartar');
        return;
      }
      await clicar(ctx, enviar, 'botão Solicitar férias');
      const r = await esperarAte(() => {
        const alerta = todos('[role="alert"]', document).map(rotulo).find((t) => t.length > 5);
        if (alerta) return { alerta };
        return todos('[role="dialog"]').some((d) => /solicita[cç][aã]o de f[eé]rias/i.test(rotulo(d))) ? null : { ok: true };
      }, { timeout: 15000, descricao: 'a confirmação do pedido de férias' });
      if ('alerta' in r) registrarAchado(ctx, 'Férias: enviar solicitação', { gravidade: 'baixa', titulo: 'Inconclusivo: o sistema recusou o pedido de férias', explicacao: `Mensagem do sistema: "${r.alerta.slice(0, 200)}". Se for regra de saldo ou prazo, está certo; se for erro técnico, é defeito.` }, 'inconclusivo');
    });
  },
};

export const blocoCriarCliente: BlocoCenario = {
  nome: 'Criar cliente (empresa)',
  rodar: async (ctx) => {
    ctx.cenario = 'Criar cliente (empresa)';
    const id = aleatorio();
    autorizarNome(`ROBO-QA Cliente ${id}`);
    await passo(ctx, 'Plataforma › Empresas › Nova empresa (cliente de teste, sem plano pago)', async () => {
      await ir(ctx, tenantUrl(ctx, '/dashboard/platform'), 'Abrindo a Plataforma');
      const nav = await esperarAte(() => document.querySelector('nav[aria-label="Seções da Plataforma"]'), { descricao: 'o menu de seções da Plataforma' });
      const aba = todos('button', nav).find((b) => rotulo(b) === 'Empresas');
      if (!aba) throw new Error('ESPERADO: a aba "Empresas" da Plataforma deveria existir para este perfil.');
      await clicar(ctx, aba, 'aba "Empresas"');
      await clicar(ctx, await esperarAte(() => botaoTexto(/nova empresa/i), { descricao: 'o botão "Nova empresa"' }), 'botão Nova empresa');
      const modal = await esperarAte(() => todos('div.fixed.inset-0').find((d) => /nova empresa/i.test(rotulo(d))), { descricao: 'a janela "Nova empresa"' });
      const senha = gerarSenhaForte(); registrarSegredo(senha);
      const campos = todos<HTMLInputElement>('input', modal);
      const porRotulo = (t: string) => todos('label', modal).filter((l) => rotulo(l).toLowerCase().startsWith(t.toLowerCase())).map((l) => l.querySelector('input')).find(Boolean) as HTMLInputElement | undefined;
      const nomeEmpresa = porRotulo('Nome da empresa');
      if (!nomeEmpresa || !campos.length) throw new Error('Tempo esgotado: não achei os campos da janela "Nova empresa"');
      await preencher(ctx, nomeEmpresa, `ROBO-QA Cliente ${id}`, 'campo Nome da empresa');
      const admin = todos('label', modal).filter((l) => /^nome\b/i.test(rotulo(l))).map((l) => l.querySelector('input')).find(Boolean) as HTMLInputElement | undefined;
      if (admin) await preencher(ctx, admin, `ROBO-QA Admin ${id}`, 'campo Nome do admin inicial');
      const email = porRotulo('E-mail');
      if (email) await preencher(ctx, email, `robo-qa.cliente.${id}@example.com`, 'campo E-mail do admin inicial');
      const sen = porRotulo('Senha');
      if (sen) await preencher(ctx, sen, senha, 'campo Senha do admin inicial');
      await clicar(ctx, await esperarAte(() => { const b = botaoTexto(/^criar empresa/i, modal) as HTMLButtonElement | null; return b && !b.disabled ? b : null; }, { descricao: 'o botão "Criar empresa" liberado' }), 'botão Criar empresa');
      const r = await esperarAte(() => {
        const erro = todos('p', modal).map(rotulo).find((t) => /erro|falha|n[aã]o foi poss/i.test(t));
        if (erro) return { erro };
        return todos('div.fixed.inset-0').some((d) => /nova empresa/i.test(rotulo(d))) ? null : { ok: true };
      }, { timeout: 20000, descricao: 'a empresa ser criada' });
      if ('erro' in r) throw new Error(`ESPERADO: a empresa deveria ser criada, mas a tela mostrou: "${r.erro.slice(0, 200)}".`);
    });
  },
};

export const blocoCriarPlanos: BlocoCenario = {
  nome: 'Criar planos (catálogo)',
  rodar: async (ctx) => {
    ctx.cenario = 'Criar planos (catálogo de Faturas)';
    await passo(ctx, 'Abrir Faturas › Planos', async () => {
      await ir(ctx, tenantUrl(ctx, '/dashboard/faturas'), 'Abrindo Faturas');
      const nav = await esperarAte(() => document.querySelector('nav[aria-label="Seções de Faturas"]'), { descricao: 'as abas de Faturas' });
      const aba = todos('button', nav).find((b) => rotulo(b) === 'Planos');
      if (!aba) throw new Error('ESPERADO: a aba "Planos" de Faturas deveria existir para este perfil.');
      await clicar(ctx, aba, 'aba "Planos"');
    });
    const id = aleatorio();
    // 3 planos de teste, SEMPRE gratuitos e ocultos: nunca viram cobranca real nem aparecem para clientes de verdade.
    for (const nome of ['Básico', 'Intermediário', 'Avançado']) {
      autorizarNome(`ROBO-QA ${nome} ${id}`);
      await passo(ctx, `Criar plano de teste "ROBO-QA ${nome} ${id}" (gratuito, oculto)`, async () => {
        await clicar(ctx, await esperarAte(() => acharPorTexto('button', /novo plano/i), { descricao: 'o botão "Novo Plano"' }), 'botão Novo Plano');
        const modal = await esperarAte(() => todos('div.fixed.inset-0').find((d) => /novo plano/i.test(rotulo(d))), { descricao: 'a janela "Novo Plano"' });
        const campoNome = await esperarAte(() => campoDe(modal, 'Nome do Plano'), { descricao: 'o campo "Nome do Plano"' });
        await preencher(ctx, campoNome, `ROBO-QA ${nome} ${id}`, 'campo Nome do Plano');
        const gratuito = todos('label', modal).find((l) => /plano gratuito/i.test(rotulo(l)))?.querySelector('input[type="checkbox"]') as HTMLInputElement | undefined;
        if (gratuito && !gratuito.checked) await clicar(ctx, gratuito, 'opção "Plano Gratuito"');
        const oculto = todos('label', modal).find((l) => /oculto/i.test(rotulo(l)))?.querySelector('input[type="checkbox"]') as HTMLInputElement | undefined;
        if (oculto && !oculto.checked) await clicar(ctx, oculto, 'opção "Oculto (Interno)"');
        await clicar(ctx, await esperarAte(() => { const b = acharPorTexto('button', /^salvar|^criar/i, modal) as HTMLButtonElement | null; return b && !b.disabled ? b : null; }, { descricao: 'o botão de salvar o plano, liberado' }), 'botão Salvar/Criar plano');
        const r = await esperarAte(() => {
          const erro = todos('p', modal).map(rotulo).find((t) => /erro|falha|n[aã]o foi poss/i.test(t));
          if (erro) return { erro };
          return todos('div.fixed.inset-0').some((d) => /novo plano/i.test(rotulo(d))) ? null : { ok: true };
        }, { timeout: 15000, descricao: 'o plano ser salvo' });
        if ('erro' in r) throw new Error(`ESPERADO: o plano deveria ser criado, mas a tela mostrou: "${r.erro.slice(0, 200)}".`);
      });
    }
  },
};

export const blocoEsqueciSenha: BlocoCenario = {
  nome: 'Esqueci minha senha',
  rodar: async (ctx) => {
    ctx.cenario = 'Recuperação de senha';
    const emailAtual = ctx.anfitriao.usuario()?.email ?? '';
    await passo(ctx, 'Pedir recuperação de senha pelo "Esqueci minha senha" (não troca a senha de verdade)', async () => {
      await ir(ctx, '/esqueci-senha', 'Abrindo "Esqueci minha senha"');
      const campo = await esperarAte(() => document.querySelector<HTMLInputElement>('#fp-email'), { descricao: 'o campo de e-mail' });
      await digitar(ctx, campo, emailAtual, 'campo E-mail');
      await clicar(ctx, await esperarAte(() => acharPorTexto('button', /solicitar c[oó]digo/i), { descricao: 'o botão "Solicitar código"' }), 'botão Solicitar código');
      await esperarAte(() => /solicita[cç][aã]o registrada/i.test(document.body.innerText ?? '') || todos('[role="alert"]').map(rotulo).find(Boolean), { timeout: 15000, descricao: 'a confirmação do pedido' });
      const alerta = todos('[role="alert"]').map(rotulo).find(Boolean);
      if (alerta) throw new Error(`ESPERADO: pedir a recuperação de senha deveria funcionar, mas a tela mostrou: "${alerta.slice(0, 200)}".`);
      if (!/solicita[cç][aã]o registrada/i.test(document.body.innerText ?? '')) throw new Error('ESPERADO: depois de pedir a recuperação, a tela deveria confirmar "Solicitação registrada".');
    }, { verificarTela: false });
  },
};

/** Cenarios de uso real por perfil (so no teste completo). */
export function cenariosDoPerfil(perfil: string): BlocoCenario[] {
  const blocos: BlocoCenario[] = [];
  if (['DEV', 'ADMIN', 'RH'].includes(perfil)) blocos.push(blocoCadastrarFuncionario);
  if (['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR'].includes(perfil)) blocos.push(blocoCriarVaga);
  // Criar empresa e criar planos NAO rodam mais: o robo usa a empresa que ja existe (cada rodada criava ~3 planos a mais).
  if (perfil === 'FUNCIONARIO') blocos.push(blocoEsqueciSenha); // uma vez basta: o fluxo e o mesmo pra qualquer perfil
  if (perfil === 'FUNCIONARIO') blocos.push(blocoPonto, blocoFerias);
  return blocos;
}
