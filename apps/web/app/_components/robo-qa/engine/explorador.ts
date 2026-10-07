import { clicar, passo } from './acoes';
import { areaPrincipal, dormir, rotulo, todos, visivel } from './dom';
import type { Contexto } from './tipos';

// O robo NUNCA aperta nada que crie, altere, apague, cobre ou envie algo (so cria os usuarios de teste, por um fluxo proprio).
const PERIGOSO = /(excluir|apagar|remover|arquivar|cancelar (assinatura|contrato|empresa|acesso)|purg|suspender|bloquear|desativar|revogar|encerrar|sair|logout|resetar|redefinir|reemitir|emitir|pagar|cobrar|reembolsar|enviar|salvar|confirmar|aprovar|devolver|contratar|encaminhar|selecionar candidato|gerar link|criar|importar|baixar|exportar|assinar|checkout|acesso assistido|ghost|robo|robô)/i;

const SELETOR = 'button, [role="tab"], summary, [role="button"]';

function candidatos(): HTMLElement[] {
  return todos(SELETOR, areaPrincipal()).filter((el) => !el.closest('#robo-qa-raiz'));
}

async function fecharJanelas(ctx: Contexto) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const aberta = () => todos('[role="dialog"], .fixed.inset-0').filter((d) => !d.closest('#robo-qa-raiz'));
    if (!aberta().length) return;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await dormir(250);
    if (!aberta().length) return;
    const fechar = aberta().flatMap((d) => todos('button', d)).find((b) => /cancelar|fechar|voltar|^×$|^x$/i.test(rotulo(b)));
    if (fechar) { fechar.click(); await dormir(250); }
  }
}

/** Passeia pela tela atual apertando o que e seguro (abas, filtros, abrir detalhes, "Novo ..." sem salvar). */
export async function explorarPagina(ctx: Contexto, nomePagina: string, max = 14): Promise<number> {
  const inicio = ctx.anfitriao.caminhoAtual();
  const vistos = new Set<string>();
  let feitos = 0;
  const lista = candidatos().map((el, i) => ({ i, texto: rotulo(el), desabilitado: (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true' }));
  for (const item of lista) {
    if (feitos >= max) break;
    if (!item.texto || item.desabilitado || PERIGOSO.test(item.texto)) continue;
    const chave = item.texto.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    feitos++;
    await passo(ctx, `${nomePagina}: clicar em "${item.texto.slice(0, 50)}"`, async () => {
      const atual = candidatos()[item.i];
      if (!visivel(atual) || rotulo(atual) !== item.texto) return; // a tela mudou de lugar: nao clica no botao errado
      await clicar(ctx, atual, `"${item.texto.slice(0, 50)}"`);
    });
    await fecharJanelas(ctx);
    if (ctx.anfitriao.caminhoAtual().split('#')[0] !== inicio.split('#')[0]) {
      const mesma = ctx.anfitriao.caminhoAtual().split('?')[0] === inicio.split('?')[0];
      if (!mesma) { ctx.anfitriao.navegar(inicio); await dormir(500); }
    }
  }
  return feitos;
}