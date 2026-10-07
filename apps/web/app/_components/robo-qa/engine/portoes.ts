import { clicar, digitar, passo } from './acoes';
import { acharPorTexto, dormir, esperarAte, rotulo, todos, visivel } from './dom';
import { registrarSegredo } from './seguranca';
import type { Contexto } from './tipos';

// Telas obrigatorias que travam a navegacao de uma conta nova: troca de senha, termo de uso, boas-vindas, avisos, passo a passo.

export function gerarSenhaForte(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const alfabeto = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `Rb#${[...bytes].map((b) => alfabeto[b % alfabeto.length]).join('')}9a`;
}

const temTexto = (regra: RegExp) => regra.test(document.body.innerText ?? '');
const botao = (regra: RegExp) => acharPorTexto('button', regra);

function campoPorRotulo(regra: RegExp): HTMLInputElement | null {
  const rotuloEl = todos('label').find((l) => regra.test(rotulo(l)));
  if (!rotuloEl) return null;
  const direto = (rotuloEl as HTMLLabelElement).control as HTMLInputElement | null;
  if (direto) return direto;
  return rotuloEl.parentElement?.querySelector('input') ?? rotuloEl.querySelector('input');
}

async function trocarSenha(ctx: Contexto, atual: string, nova: string) {
  await passo(ctx, 'Tela obrigatória: trocar a senha provisória', async () => {
    const campoAtual = await esperarAte(() => campoPorRotulo(/senha atual/i), { descricao: 'o campo "Senha atual"' });
    await digitar(ctx, campoAtual, atual, 'campo Senha atual');
    const campoNova = await esperarAte(() => campoPorRotulo(/^nova senha/i), { descricao: 'o campo "Nova senha"' });
    await digitar(ctx, campoNova, nova, 'campo Nova senha');
    const campoConfirma = await esperarAte(() => campoPorRotulo(/confirmar nova senha/i), { descricao: 'o campo "Confirmar nova senha"' });
    await digitar(ctx, campoConfirma, nova, 'campo Confirmar nova senha');
    await clicar(ctx, await esperarAte(() => botao(/trocar senha|salvar senha/i), { descricao: 'o botão "Trocar senha"' }), 'botão Trocar senha');
    await esperarAte(() => !temTexto(/troque sua senha/i), { timeout: 15000, descricao: 'a tela de troca de senha sumir (a senha nova pode ter sido recusada)' }).catch(() => {
      const erro = todos('p').map(rotulo).find((t) => /senha|inv[aá]lid|atual|forte/i.test(t) && t.length < 200) ?? '';
      throw new Error(`ESPERADO: a senha nova deveria ser aceita e a tela fechar, mas ela continuou aberta. ${erro ? `Mensagem na tela: "${erro}".` : ''}`);
    });
  });
}

async function aceitarTermo(ctx: Contexto) {
  await passo(ctx, 'Tela obrigatória: aceitar o Termo de Uso e a Política de Privacidade', async () => {
    const rolagem = await esperarAte(() => todos('.fixed.inset-0 .overflow-y-auto, [role="dialog"] .overflow-y-auto').find((el) => el.scrollHeight > el.clientHeight) ?? todos('.fixed.inset-0 .overflow-y-auto')[0], { descricao: 'o texto do termo para rolar' });
    for (let i = 0; i < 12; i++) { rolagem.scrollTop = rolagem.scrollHeight; rolagem.dispatchEvent(new Event('scroll', { bubbles: true })); await dormir(150); }
    const caixa = await esperarAte(() => todos<HTMLInputElement>('.fixed.inset-0 input[type="checkbox"]').find((c) => !c.disabled), { timeout: 8000, descricao: 'a caixa "Li e concordo" liberar depois de rolar até o fim' });
    await clicar(ctx, caixa, 'caixa "Li e concordo"');
    await clicar(ctx, await esperarAte(() => botao(/assinar termo/i), { descricao: 'o botão "Assinar termo"' }), 'botão Assinar termo');
    await esperarAte(() => !temTexto(/termo de uso e pol[ií]tica de privacidade/i), { timeout: 15000, descricao: 'o termo fechar depois de assinar' });
  });
}

/** Resolve, em ordem, tudo o que bloqueia a tela. Devolve a senha nova se trocou. */
export async function tratarPortoes(ctx: Contexto, senhaProvisoria: string): Promise<{ senhaNova?: string }> {
  let senhaNova: string | undefined;
  let semNada = 0;
  for (let rodada = 0; rodada < 14 && semNada < 3; rodada++) {
    await dormir(500);
    if (temTexto(/troque sua senha/i)) { senhaNova = gerarSenhaForte(); registrarSegredo(senhaNova); await trocarSenha(ctx, senhaProvisoria, senhaNova); semNada = 0; continue; }
    if (temTexto(/termo de uso e pol[ií]tica de privacidade/i) && visivel(botao(/assinar termo/i) ?? null)) { await aceitarTermo(ctx); semNada = 0; continue; }
    const comecar = botao(/come[cç]ar agora/i);
    if (comecar) { await passo(ctx, 'Tela de boas-vindas do primeiro acesso', () => clicar(ctx, comecar, 'botão "Começar agora"')); semNada = 0; continue; }
    const aviso = botao(/^(entendi|estou ciente|obrigado!?)$/i);
    if (aviso) { await passo(ctx, 'Aviso da empresa na entrada', () => clicar(ctx, aviso, `botão "${rotulo(aviso)}"`)); semNada = 0; continue; }
    const pular = document.querySelector('[role="dialog"][aria-labelledby="tour-title"]') ? botao(/^pular$/i) : null;
    if (pular) { await passo(ctx, 'Passo a passo guiado do primeiro acesso', () => clicar(ctx, pular, 'botão "Pular"')); semNada = 0; continue; }
    semNada++;
  }
  return { senhaNova };
}