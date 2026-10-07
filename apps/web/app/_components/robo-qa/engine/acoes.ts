import { drenarEventos } from './coletor';
import { areaPrincipal, dormir, esperarAssentar, rotulo, setValor, visivel } from './dom';
import {
  EXPLICACAO_ERRO_NEXT, EXPLICACAO_TELA_BRANCA, explicacaoAvisoDeErro, explicacaoRolagemLateral,
  classificar, explicarEvento, explicarFalhaPasso, type Explicacao,
} from './explicacoes';
import type { Achado, Contexto, ResultadoPasso } from './tipos';
import { limpar } from './seguranca';
import { QUEDA, telaCaiu } from './queda';
import { destacar, faixa, moverCursor, onda } from './ui';

export function falar(ctx: Contexto, texto: string) {
  ctx.estado.agora = texto;
  faixa(`🤖 ${ctx.perfil} · ${texto}`);
  ctx.atualizar();
}

/** Vai para um endereco do app (navegacao do proprio Next, sem recarregar) e espera a tela assentar. */
export async function ir(ctx: Contexto, caminho: string, descricao?: string) {
  await ctx.checarControle();
  falar(ctx, descricao ?? `Abrindo ${caminho}`);
  ctx.anfitriao.navegar(caminho);
  await dormir(350);
  await esperarAssentar(500, 8000);
}

/** Clique "humano": cursor vai ate o botao, destaca, clica e mostra a onda. */
export async function clicar(ctx: Contexto, el: HTMLElement, descricao: string) {
  await ctx.checarControle();
  falar(ctx, `Clicando em: ${descricao}`);
  el.scrollIntoView({ block: 'center', inline: 'nearest' });
  await dormir(60);
  const caixa = el.getBoundingClientRect();
  const x = caixa.left + caixa.width / 2;
  const y = caixa.top + caixa.height / 2;
  moverCursor(x, y);
  destacar(caixa);
  await ctx.aguardar(ctx.ritmo.antes);
  el.focus?.({ preventScroll: true });
  el.click();
  onda(x, y);
  await ctx.aguardar(ctx.ritmo.depois);
  await esperarAssentar(300, 4000);
}

/** Clica duas vezes rapido no mesmo botao (duplo clique de verdade, sem querer): serve para achar cadastro duplicado/corrida. */
export async function cliqueDuplo(ctx: Contexto, el: HTMLElement, descricao: string) {
  await ctx.checarControle();
  falar(ctx, `Clicando duas vezes rápido (teste de clique duplo) em: ${descricao}`);
  el.scrollIntoView({ block: 'center', inline: 'nearest' });
  await dormir(60);
  const caixa = el.getBoundingClientRect();
  moverCursor(caixa.left + caixa.width / 2, caixa.top + caixa.height / 2);
  destacar(caixa);
  el.focus?.({ preventScroll: true });
  el.click();
  el.click();
  await ctx.aguardar(ctx.ritmo.depois);
  await esperarAssentar(300, 4000);
}

export async function digitar(ctx: Contexto, campo: HTMLInputElement | HTMLTextAreaElement, texto: string, descricao: string) {
  await ctx.checarControle();
  falar(ctx, `Digitando em: ${descricao}`);
  campo.scrollIntoView({ block: 'center' });
  const caixa = campo.getBoundingClientRect();
  moverCursor(caixa.left + 20, caixa.top + caixa.height / 2);
  destacar(caixa);
  campo.focus();
  await ctx.aguardar(ctx.ritmo.antes);
  setValor(campo, '');
  let atual = '';
  for (const letra of texto) { atual += letra; setValor(campo, atual); await dormir(ctx.ritmo.digitacao); }
  await ctx.aguardar(ctx.ritmo.antes);
}

/** O que a tela mostra de errado agora (sem depender de erro tecnico). */
export function verificarTela(ctx: Contexto): Array<Explicacao & { origem: string }> {
  const achados: Array<Explicacao & { origem: string }> = [];
  const texto = (document.body.innerText ?? '').replace(/\s+/g, ' ').trim();
  if (texto.length < 15) achados.push({ ...EXPLICACAO_TELA_BRANCA, origem: 'tela' });
  if (/Application error|Unhandled Runtime Error/i.test(texto) || telaCaiu()) achados.push({ ...EXPLICACAO_ERRO_NEXT, origem: 'tela' });
  const alertas = [...document.querySelectorAll('[role="alert"]')].filter(visivel).map((a) => (a as HTMLElement).innerText.trim()).filter(Boolean);
  for (const alerta of alertas.slice(0, 2)) {
    if (ctx.esperaNegado && /acesso restrito|sem permiss|n[aã]o tem (autoriza|permiss)/i.test(alerta)) continue;
    achados.push({ ...explicacaoAvisoDeErro(alerta), origem: 'tela' });
  }
  const largura = document.documentElement.scrollWidth;
  if (largura - window.innerWidth > 4) achados.push({ ...explicacaoRolagemLateral(largura, window.innerWidth), origem: 'tela' });
  return achados;
}

const naTela = () => rotulo(areaPrincipal()).slice(0, 300);

type Item = Explicacao & { origem: string; tecnico?: string; resultado?: 'falha' | 'inconclusivo' | 'nao-testado' };

function guardar(ctx: Contexto, nome: string, itens: Item[], statusForcado?: ResultadoPasso) {
  const url = ctx.anfitriao.caminhoAtual();
  const tela = itens.length ? limpar(naTela()) : undefined;
  let temFalha = false;
  let temInconclusivo = false;
  for (const item of itens) {
    const resultado = item.resultado ?? classificar(item.origem, item, item.tecnico);
    if (resultado === 'falha') temFalha = true; else if (resultado === 'inconclusivo') temInconclusivo = true;
    const mensagemEsperado = /^ESPERADO:/i.test(item.tecnico ?? '') ? limpar((item.tecnico ?? '').replace(/^ESPERADO:\s*/i, '')) : undefined;
    ctx.estado.achados.push({
      ...item, resultado, perfil: ctx.perfil, cenario: ctx.cenario, passo: nome, url, naTela: tela,
      acao: nome,
      esperado: mensagemEsperado ?? `"${nome}" deveria funcionar sem erro`,
      obtido: limpar(item.explicacao),
      evidencia: limpar([item.tecnico, `endereço ${url}`, tela ? `na tela: ${tela}` : ''].filter(Boolean).join(' · ')),
    } as Achado);
  }
  const status: ResultadoPasso = statusForcado ?? (temFalha ? 'falha' : temInconclusivo ? 'inconclusivo' : 'ok');
  ctx.estado.passos.push({ perfil: ctx.perfil, cenario: ctx.cenario, nome, status, url, quando: Date.now() });
  if (ctx.estado.passos.length > 1500) ctx.estado.passos.splice(0, ctx.estado.passos.length - 1500);
  ctx.salvar();
  ctx.atualizar();
}

/** Um passo do teste: executa, olha a tela, junta os erros que apareceram por baixo e registra tudo. */
export async function passo(ctx: Contexto, nome: string, fn: () => Promise<void> | void, opcoes: { verificarTela?: boolean } = {}): Promise<boolean> {
  await ctx.checarControle();
  falar(ctx, nome);
  let erro: unknown = null;
  try { await fn(); } catch (e) { if (['CANCELADO', 'TEMPO_BLOCO', QUEDA].includes((e as Error)?.message)) throw e; erro = e; }
  await dormir(150);
  const itens: Item[] = [];
  if (erro) itens.push({ ...explicarFalhaPasso(nome, erro), origem: 'passo', tecnico: String((erro as Error)?.message ?? erro).split('\n')[0] });
  for (const evento of drenarEventos()) {
    if (ctx.esperaNegado && evento.tipo === 'http' && (evento.status === 401 || evento.status === 403)) continue;
    itens.push({ ...explicarEvento(evento, ctx.perfil), origem: evento.tipo, tecnico: evento.alvo ? `${evento.metodo ?? ''} ${evento.alvo} → ${evento.status ?? evento.texto}`.trim() : evento.texto });
  }
  if (opcoes.verificarTela !== false && !erro) itens.push(...verificarTela(ctx));
  guardar(ctx, nome, itens);
  // A tela caiu: ja foi registrado acima; nao adianta continuar clicando numa tela morta. O motor volta e testa a proxima.
  if (opcoes.verificarTela !== false && telaCaiu()) throw new Error(QUEDA);
  return itens.length === 0;
}

/** Registra um achado direto (ex.: vazamento de permissao), sem depender de erro tecnico. */
export function registrarAchado(ctx: Contexto, nome: string, explicacao: Explicacao, resultado: 'falha' | 'inconclusivo' = 'falha') {
  guardar(ctx, nome, [{ ...explicacao, origem: 'regra', resultado }]);
}

/** Algo que o robo nao chegou a testar (e por que). Nao e defeito. */
export function naoTestado(ctx: Contexto, nome: string, motivo: string) {
  guardar(ctx, nome, [{ gravidade: 'baixa', titulo: 'Não testado', explicacao: motivo, origem: 'regra', resultado: 'nao-testado' }], 'nao-testado');
}