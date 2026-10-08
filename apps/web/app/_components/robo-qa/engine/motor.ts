import { clicar, digitar, falar, naoTestado, passo, registrarAchado } from './acoes';
import { drenarEventos, instalarColetor } from './coletor';
import { acharPorTexto, dormir, esperarAte, rotulo, todos } from './dom';
import { carregar, limpar, novoEstado, RITMOS, salvar, salvarConta, salvarRelatorio } from './estado';
import { registrarSegredo } from './seguranca';
import { htmlRelatorio, markdownRelatorio, veredito } from './relatorio';
import { tratarPortoes } from './portoes';
import { blocosDoTour } from './tour';
import { resumirAba } from './relatorio';
import type { Anfitriao, Contexto, Estado, Modo, Ritmo } from './tipos';
import { mostrarOverlay } from './ui';
import { criarUsuarioDeTeste } from './usuarios';
import { identidadeConfere } from './sessao';
import { limparRecursos, manifesto } from './recursos';
import { removerContasLimpas } from './estado';
import { criarFuncionarioComAcesso } from './cenarios';
import { QUEDA, telaCaiu } from './queda';

export interface Motor {
  iniciar(perfis: string[], ritmo: Ritmo, modo: Modo): void;
  pausar(): void;
  retomar(): void;
  cancelar(): void;
  continuar(): Promise<void>;
  estado(): Estado | null;
  aoMudar(ouvinte: () => void): () => void;
  rodando(): boolean;
}

const CANCELADO = 'CANCELADO';
const TEMPO_BLOCO = 'TEMPO_BLOCO';
/** Limite de tempo por tela/bloco: passou disso, a tela e marcada como bloqueada (inconclusivo) e o teste segue. */
const LIMITE_BLOCO_MS: Record<Modo, number> = { rapido: 90_000, completo: 240_000 };

export function criarMotor(anfitriao: Anfitriao): Motor {
  let e: Estado | null = carregar();
  let emExecucao = false;
  let emBloco = false; // dentro de um bloco do tour: se a tela cair, o bloco e abandonado e o teste segue
  const ouvintes = new Set<() => void>();
  const avisar = () => ouvintes.forEach((o) => { try { o(); } catch { /* ouvinte com defeito nao derruba o robo */ } });

  const tenantAtual = () => anfitriao.tenant() || e?.tenant || '';
  const anfitriaoComTenant: Anfitriao = { ...anfitriao, tenant: tenantAtual };

  function contexto(perfil: string): Contexto {
    const estado = e as Estado;
    estado.perfilAtual = perfil;
    const ctx: Contexto = {
      anfitriao: anfitriaoComTenant, estado, perfil, cenario: '', esperaNegado: false, ritmo: RITMOS[estado.ritmo], prazo: 0,
      salvar: () => salvar(estado), atualizar: avisar,
      aguardar: async (ms) => { await dormir(ms); },
      checarControle: async () => {
        for (;;) {
          if (estado.cancelado) throw new Error(CANCELADO);
          if (!estado.pausado) {
            if (ctx.prazo && Date.now() > ctx.prazo) throw new Error(TEMPO_BLOCO);
            if (emBloco && telaCaiu()) throw new Error(QUEDA);
            return;
          }
          ctx.prazo = ctx.prazo ? ctx.prazo + 250 : 0; // pausa nao conta como tempo gasto
          await dormir(250);
        }
      },
    };
    return ctx;
  }

  async function entrar(ctx: Contexto, email: string, senha: string) {
    const campoEmail = await esperarAte(() => document.querySelector<HTMLInputElement>('#login-email'), { descricao: 'o campo de e-mail do login' });
    await digitar(ctx, campoEmail, email, 'campo E-mail');
    const campoSenha = await esperarAte(() => document.querySelector<HTMLInputElement>('input[type="password"]'), { descricao: 'o campo de senha do login' });
    await digitar(ctx, campoSenha, senha, 'campo Senha');
    await clicar(ctx, await esperarAte(() => acharPorTexto('button', /^entrar/i), { descricao: 'o botão "Entrar"' }), 'botão Entrar');
    const desfecho = await esperarAte(() => {
      if (document.querySelector('input[aria-label="Código MFA"]')) return 'mfa';
      if (identidadeConfere(anfitriao.usuario(), { email, perfil: ctx.perfil }) && /\/(dashboard|ceo-onboarding|portal)(\/|$)/.test(anfitriao.caminhoAtual())) return 'entrou';
      if (identidadeConfere(anfitriao.usuario(), { email, perfil: ctx.perfil }) && /troque sua senha/i.test(document.body.innerText ?? '')) return 'entrou';
      return null;
    }, { timeout: 25000, descricao: 'o sistema abrir depois do login' }).catch(() => 'nada');
    if (desfecho === 'mfa') throw new Error('ESPERADO: este usuário exige o código do aplicativo autenticador (MFA). O robô não consegue passar dessa tela.');
    if (desfecho !== 'entrou') {
      const aviso = todos('[role="alert"], .text-rose-700, .text-red-600').map(rotulo).find(Boolean) ?? '';
      throw new Error(`ESPERADO: o login deveria entrar no sistema, mas ficou na tela de login.${aviso ? ` Mensagem na tela: "${aviso.slice(0, 160)}".` : ''}`);
    }
  }

  /** Depois de uma queda: volta ao painel; se a tela continuar caida, recarrega a pagina (o progresso ja esta salvo e o robo retoma). */
  async function recuperarDaQueda(ctx: Contexto) {
    falar(ctx, 'A tela caiu. Voltando ao início para testar a próxima etapa');
    const inicio = `/${tenantAtual()}/dashboard`;
    anfitriao.navegar(inicio);
    for (let t = 0; t < 40; t++) { // ate ~8 s
      await dormir(200);
      if (!telaCaiu() && (document.body?.innerText ?? '').trim().length > 15) return;
    }
    salvar(ctx.estado);
    window.location.assign(inicio);
    await dormir(10_000); // a pagina vai recarregar; ao voltar, "continuar" retoma da proxima etapa
  }

  async function rodarTour(ctx: Contexto, perfil: string) {
    const estado = ctx.estado;
    const blocos = blocosDoTour(perfil, estado.modo);
    for (let i = estado.tourIdx; i < blocos.length; i++) {
      await ctx.checarControle();
      const chave = `${perfil}:${i}:${blocos[i].nome}`;
      if (estado.blocoEmAndamento === chave) {
        naoTestado(ctx, blocos[i].nome, 'Interrompido durante execução anterior. Não repetido automaticamente para evitar cadastros duplicados.');
        estado.blocoEmAndamento = undefined;
        estado.tourIdx = i + 1; salvar(estado); continue;
      }
      estado.tourIdx = i;
      estado.blocoEmAndamento = chave;
      salvar(estado);
      ctx.prazo = Date.now() + LIMITE_BLOCO_MS[estado.modo];
      const p0 = estado.passos.length; const a0 = estado.achados.length;
      let caiu = false;
      try {
        emBloco = true;
        await blocos[i].rodar(ctx);
      } catch (erro) {
        const mensagem = String((erro as Error)?.message ?? erro);
        if (mensagem === CANCELADO) throw erro;
        if (mensagem === QUEDA) {
          // A tela caiu (tela de erro/branca): registra (se ainda nao registrado), abandona este bloco e VOLTA para testar o proximo.
          caiu = true;
          ctx.esperaNegado = false;
          if (!estado.achados.slice(a0).some((a) => a.origem === 'tela')) {
            registrarAchado(ctx, `Bloco "${blocos[i].nome}"`, { gravidade: 'alta', titulo: 'A tela caiu e mostrou erro', explicacao: `A etapa "${blocos[i].nome}" abriu uma tela de erro. O robo voltou ao inicio e seguiu para a proxima etapa.` });
          }
        } else {
        // Uma tela que nao carrega ou um erro inesperado NAO derruba o teste: registra e segue para a proxima.
        ctx.esperaNegado = false;
        const tempo = mensagem === TEMPO_BLOCO;
        registrarAchado(ctx, `Bloco "${blocos[i].nome}"`, {
          gravidade: 'baixa',
          titulo: tempo ? 'Inconclusivo: a tela demorou demais e foi marcada como bloqueada' : 'Inconclusivo: o robô tropeçou nesta etapa',
          explicacao: tempo
            ? `A etapa "${blocos[i].nome}" passou do limite de ${Math.round(LIMITE_BLOCO_MS[estado.modo] / 1000)} s. Pode ser lentidão ou travamento do sistema, ou do próprio robô. O teste seguiu para a próxima etapa.`
            : `Na etapa "${blocos[i].nome}" aconteceu algo inesperado do lado do robô (${mensagem.split('\n')[0].slice(0, 160)}). O teste seguiu para a próxima etapa.`,
        }, 'inconclusivo');
        }
      } finally {
        emBloco = false;
        estado.blocoEmAndamento = undefined;
        estado.tourIdx = i + 1;
        ctx.prazo = 0;
        (estado.abas ??= []).push(resumirAba(perfil, blocos[i].nome, estado.passos.slice(p0), estado.achados.slice(a0)));
        salvar(estado);
        ctx.atualizar();
      }
      if (caiu) {
        estado.tourIdx = i + 1; // se a pagina recarregar, retoma na proxima etapa e nao na que caiu
        salvar(estado);
        await recuperarDaQueda(ctx);
      }
    }
    estado.tourIdx = 0;
  }

  async function faseDev() {
    const estado = e as Estado;
    const ctx = contexto('DEV');
    ctx.cenario = 'Entrada';
    const usuario = anfitriao.usuario();
    if (!usuario || usuario.perfil !== 'DEV') {
      registrarAchado(ctx, 'Quem iniciou', { gravidade: 'alta', titulo: 'O robô só pode ser iniciado por um usuário DEV', explicacao: 'Para criar os usuários de teste é preciso estar logado como DEV. O teste foi interrompido.' });
      estado.fase = 'fim';
      return;
    }
    await rodarTour(ctx, 'DEV');
    estado.fase = 'criando';
    salvar(estado);
  }

  async function faseCriando() {
    const estado = e as Estado;
    const ctx = contexto('DEV');
    for (const usuario of estado.usuarios) {
      if (usuario.criado || usuario.situacao === 'erro') continue; // conta ja existe (reaproveitada): nao cria de novo
      if (usuario.criacaoIniciada) { usuario.situacao = 'erro'; usuario.motivo = 'criação interrompida: reconciliar antes de tentar novamente'; salvar(estado); continue; }
      usuario.criacaoIniciada = true; salvar(estado);
      if (estado.semLicencas) { usuario.situacao = 'erro'; usuario.motivo = 'a empresa não tem licenças livres'; continue; } // nao adianta tentar de novo: o limite ja foi atingido
      ctx.prazo = Date.now() + LIMITE_BLOCO_MS[estado.modo];
      const p0 = estado.passos.length; const a0 = estado.achados.length;
      try {
        // O funcionario de teste nasce com cadastro de verdade (para bater ponto e pedir ferias); se o cadastro falhar, cai no acesso simples.
        const comCadastro = usuario.perfil === 'FUNCIONARIO' && estado.modo === 'completo' && (await criarFuncionarioComAcesso(ctx, usuario));
        if (!comCadastro && !estado.semLicencas && !(usuario.perfil === 'FUNCIONARIO' && estado.modo === 'completo')) {
          await criarUsuarioDeTeste(ctx, usuario);
        }
      }
      catch (erro) {
        if ((erro as Error)?.message === CANCELADO) throw erro;
        usuario.situacao = 'erro'; usuario.motivo = 'não foi possível criar o acesso de teste (etapa interrompida)';
        if (!estado.achados.slice(a0).length) registrarAchado(ctx, `Criar acesso de teste (${usuario.perfil})`, { gravidade: 'alta', titulo: 'Não consegui criar o acesso de teste deste perfil', explicacao: `Erro inesperado ao criar "${usuario.nome}": ${String((erro as Error)?.message ?? erro).split('\n')[0]}` });
      }
      finally {
        ctx.prazo = 0;
        (estado.abas ??= []).push(resumirAba(usuario.perfil, `Criar acesso de teste (${usuario.perfil})`, estado.passos.slice(p0), estado.achados.slice(a0)));
        salvar(estado);
        ctx.atualizar();
      }
      if (usuario.criado) salvarConta(usuario.perfil, { email: usuario.email, nome: usuario.nome, senha: usuario.senha });
      salvar(estado);
    }
    if (estado.semLicencas) {
      const faltaram = estado.usuarios.filter((u) => !u.criado).map((u) => u.perfil).join(', ');
      naoTestado(ctx, 'Criar os acessos de teste', `A empresa usada no teste não tem licenças livres, então o robô não criou os acessos (${faltaram || 'nenhum perfil faltou'}) e esses perfis não foram testados. Não é defeito do sistema. Aumente as licenças da empresa de teste, ou cancele acessos "ROBO-QA" antigos em Usuários, e rode de novo.`);
    }
    estado.fase = 'usuarios';
    estado.idxUsuario = 0;
    estado.subEtapa = 'sair';
    salvar(estado);
  }

  async function faseUsuarios() {
    const estado = e as Estado;
    while (estado.idxUsuario < estado.usuarios.length) {
      const usuario = estado.usuarios[estado.idxUsuario];
      const ctx = contexto(usuario.perfil);
      if (!usuario.criado) { estado.idxUsuario++; estado.subEtapa = 'sair'; salvar(estado); continue; }

      if (estado.subEtapa === 'sair') {
        usuario.situacao = 'testando';
        ctx.cenario = 'Troca de usuário';
        if (anfitriao.usuario()) {
          falar(ctx, `Saindo do sistema para entrar como ${usuario.perfil}`);
          estado.subEtapa = 'login';
          salvar(estado);
          await anfitriao.sair();
          await esperarAte(() => !anfitriao.usuario() && anfitriao.caminhoAtual().startsWith('/login'), { timeout: 20000, descricao: 'encerramento confirmado da sessão anterior' });
        }
        estado.subEtapa = 'login';
        salvar(estado);
      }

      if (estado.subEtapa === 'login') {
        ctx.cenario = 'Entrada no sistema';
        if (!anfitriao.caminhoAtual().startsWith('/login')) { anfitriao.navegar('/login'); await dormir(800); }
        registrarSegredo(usuario.senha);
        const entrou = await passo(ctx, `Entrar no sistema como ${usuario.perfil} (${usuario.email})`, async () => {
          try { await entrar(ctx, usuario.email, usuario.senha); }
          catch (erro) {
            if (!usuario.reutilizada || (erro as Error)?.message === CANCELADO || (erro as Error)?.message === TEMPO_BLOCO) throw erro;
            // Conta salva de outra execucao: senha trocada/acesso cancelado nao e defeito do sistema.
            throw new Error('Não consegui entrar com a conta de teste salva (a senha pode ter sido alterada ou o acesso cancelado). Use "Recriar contas de teste" e rode de novo.');
          }
        }, { verificarTela: false });
        if (!entrou || !identidadeConfere(anfitriao.usuario(), usuario)) {
          usuario.situacao = 'erro'; usuario.motivo = usuario.reutilizada ? 'conta salva não entrou (recriar contas)' : 'não conseguiu entrar';
          estado.idxUsuario++; estado.subEtapa = 'sair'; salvar(estado);
          continue;
        }
        estado.subEtapa = 'portoes';
        salvar(estado);
      }

      if (estado.subEtapa === 'portoes') {
        ctx.cenario = 'Telas obrigatórias do primeiro acesso';
        const resultado = await tratarPortoes(ctx, usuario.senha);
        if (resultado.senhaNova) { usuario.senha = resultado.senhaNova; usuario.reutilizada = true; salvarConta(usuario.perfil, { email: usuario.email, nome: usuario.nome, senha: usuario.senha }); }
        estado.subEtapa = 'tour';
        estado.tourIdx = 0;
        salvar(estado);
      }

      if (estado.subEtapa === 'tour') {
        const logado = anfitriao.usuario();
        if (!identidadeConfere(logado, usuario)) {
          usuario.situacao = 'erro'; usuario.motivo = 'sessão perdida durante o teste';
        } else {
          await rodarTour(ctx, usuario.perfil);
          usuario.situacao = 'testado';
        }
        estado.idxUsuario++;
        estado.subEtapa = 'sair';
        estado.tourIdx = 0;
        salvar(estado);
      }
    }
  }

  function finalizar(motivo?: string) {
    const estado = e as Estado;
    estado.ativo = false;
    estado.fim = Date.now();
    estado.fase = 'fim';
    estado.agora = motivo ?? 'terminou';
    for (const u of estado.usuarios) {
      u.senha = '';
      if (u.situacao === 'testando' || u.situacao === 'pendente') { u.situacao = 'erro'; u.motivo ??= 'não chegou a ser testado'; }
    }
    salvarRelatorio({ quando: Date.now(), html: htmlRelatorio(estado), markdown: markdownRelatorio(estado), usuarios: estado.usuarios.filter((u) => u.criado).map((u) => u.email), resumo: veredito(estado).texto });
    salvar(estado);
    mostrarOverlay(false);
    avisar();
  }

  async function faseLimpeza() {
    const estado = e as Estado;
    const ctx = contexto('DEV');
    if (!manifesto().recursos.some((r) => r.status === 'pendente')) { finalizar(); return; }
    if (anfitriao.usuario()?.perfil !== 'DEV') {
      estado.agora = 'Limpeza pendente: entre como DEV nesta aba e clique Continuar. Nenhuma nova criação será iniciada.';
      estado.pausado = true; salvar(estado); avisar();
      if (anfitriao.usuario()) await anfitriao.sair();
      return;
    }
    if (!anfitriao.limparRecurso) throw new Error('O aplicativo não oferece limpeza autenticada.');
    const erros = await limparRecursos(anfitriao.limparRecurso);
    if (erros.length) {
      naoTestado(ctx, 'Limpeza dos dados de teste', `Exclusões pendentes: ${erros.join(', ')}. Corrija a permissão/dependência e clique Continuar.`);
      estado.pausado = true; salvar(estado); avisar(); return;
    }
    removerContasLimpas(manifesto().recursos.filter((r) => r.status === 'removido' && ['/users', '/employees'].includes(r.rota)).map((r) => r.nome));
    finalizar('Testes encerrados; limpeza executada (empresas excluídas logicamente, sem purge).');
  }

  async function executar() {
    if (!e || !e.ativo || emExecucao) return;
    emExecucao = true;
    instalarColetor();
    drenarEventos();
    mostrarOverlay(true);
    avisar();
    try {
      if (e.fase === 'dev') await faseDev();
      if (e.fase === 'criando') await faseCriando();
      if (e.fase === 'usuarios') await faseUsuarios();
      if (e.fase === 'usuarios') { e.fase = 'limpeza'; salvar(e); }
      if (e.fase === 'limpeza') await faseLimpeza();
      else if (e.fase === 'fim' && e.ativo) finalizar();
    } catch (erro) {
      if ((erro as Error)?.message === CANCELADO) { finalizar('cancelado pelo usuário'); }
      else {
        const ctx = contexto(e.perfilAtual || 'DEV');
        registrarAchado(ctx, 'O robô travou', { gravidade: 'alta', titulo: 'O robô não conseguiu terminar o teste', explicacao: `Aconteceu um problema inesperado durante o teste: ${String((erro as Error)?.message ?? erro).split('\n')[0]}. O que vinha depois não foi testado.` });
        finalizar('interrompido por erro');
      }
    } finally { emExecucao = false; avisar(); }
  }

  return {
    iniciar(perfis, ritmo, modo) {
      if (emExecucao || e?.ativo) return;
      limpar();
      e = novoEstado(perfis, ritmo, anfitriao.tenant(), modo);
      if (manifesto().recursos.some((r) => r.status === 'pendente')) e.fase = 'limpeza';
      salvar(e);
      avisar();
      void executar();
    },
    pausar() { if (e) { e.pausado = true; salvar(e); avisar(); } },
    retomar() { if (e) { e.pausado = false; salvar(e); avisar(); void executar(); } },
    cancelar() { if (e) { e.cancelado = true; e.pausado = false; salvar(e); avisar(); } },
    async continuar() {
      if (emExecucao) return; // ja esta rodando: nunca troca o estado em memoria por uma copia antiga do armazenamento
      e = carregar() ?? e;
      if (e?.ativo) await executar();
    },
    estado: () => e,
    aoMudar(ouvinte) { ouvintes.add(ouvinte); return () => ouvintes.delete(ouvinte); },
    rodando: () => emExecucao,
  };
}
