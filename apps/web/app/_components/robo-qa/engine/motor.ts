import { clicar, digitar, falar, passo, registrarAchado } from './acoes';
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
const LIMITE_BLOCO_MS: Record<Modo, number> = { rapido: 90_000, completo: 180_000 };

export function criarMotor(anfitriao: Anfitriao): Motor {
  let e: Estado | null = carregar();
  let emExecucao = false;
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
      if (anfitriao.usuario() && /\/(dashboard|ceo-onboarding|portal)(\/|$)/.test(anfitriao.caminhoAtual())) return 'entrou';
      if (/troque sua senha/i.test(document.body.innerText ?? '')) return 'entrou';
      return null;
    }, { timeout: 25000, descricao: 'o sistema abrir depois do login' }).catch(() => 'nada');
    if (desfecho === 'mfa') throw new Error('ESPERADO: este usuário exige o código do aplicativo autenticador (MFA). O robô não consegue passar dessa tela.');
    if (desfecho !== 'entrou') {
      const aviso = todos('[role="alert"], .text-rose-700, .text-red-600').map(rotulo).find(Boolean) ?? '';
      throw new Error(`ESPERADO: o login deveria entrar no sistema, mas ficou na tela de login.${aviso ? ` Mensagem na tela: "${aviso.slice(0, 160)}".` : ''}`);
    }
  }

  async function rodarTour(ctx: Contexto, perfil: string) {
    const estado = ctx.estado;
    const blocos = blocosDoTour(perfil, estado.modo);
    for (let i = estado.tourIdx; i < blocos.length; i++) {
      await ctx.checarControle();
      estado.tourIdx = i;
      salvar(estado);
      ctx.prazo = Date.now() + LIMITE_BLOCO_MS[estado.modo];
      const p0 = estado.passos.length; const a0 = estado.achados.length;
      try {
        await blocos[i].rodar(ctx);
      } catch (erro) {
        const mensagem = String((erro as Error)?.message ?? erro);
        if (mensagem === CANCELADO) throw erro;
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
      } finally {
        ctx.prazo = 0;
        (estado.abas ??= []).push(resumirAba(perfil, blocos[i].nome, estado.passos.slice(p0), estado.achados.slice(a0)));
        salvar(estado);
        ctx.atualizar();
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
      ctx.prazo = Date.now() + LIMITE_BLOCO_MS[estado.modo];
      try { await criarUsuarioDeTeste(ctx, usuario); }
      catch (erro) { if ((erro as Error)?.message === CANCELADO) throw erro; usuario.situacao = 'erro'; usuario.motivo = 'não foi possível criar o acesso de teste (etapa interrompida)'; }
      finally { ctx.prazo = 0; }
      if (usuario.criado) salvarConta(usuario.perfil, { email: usuario.email, nome: usuario.nome, senha: usuario.senha });
      salvar(estado);
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
          anfitriao.sair();
          await dormir(1500);
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
        if (!entrou && !anfitriao.usuario()) {
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
        if (!logado) {
          usuario.situacao = 'erro'; usuario.motivo = 'sessão perdida durante o teste';
        } else {
          if (logado.perfil !== usuario.perfil) registrarAchado(ctx, 'Perfil do usuário', { gravidade: 'alta', titulo: 'O perfil do usuário logado não é o que foi criado', explicacao: `O acesso foi criado como ${usuario.perfil}, mas ao entrar o sistema mostra o perfil ${logado.perfil}.` });
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
      if (e.fase !== 'fim') {
        const ctx = contexto('DEV');
        falar(ctx, 'Saindo para deixar o sistema como estava');
        salvar(e);
        finalizar();
        anfitriao.sair();
      } else if (e.ativo) finalizar();
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
      if (emExecucao) return;
      limpar();
      e = novoEstado(perfis, ritmo, anfitriao.tenant(), modo);
      salvar(e);
      avisar();
      void executar();
    },
    pausar() { if (e) { e.pausado = true; salvar(e); avisar(); } },
    retomar() { if (e) { e.pausado = false; salvar(e); avisar(); } },
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