/** Marca que as telas de erro do sistema (error.tsx / global-error.tsx) colocam no HTML para o robô reconhecer uma queda. */
export const MARCA_QUEDA = 'data-robo-queda';
export const QUEDA = 'QUEDA';

/** A tela caiu: erro inesperado do Next.js ("Application error"), painel de erro ou a tela de erro do próprio sistema. */
export function telaCaiu(): boolean {
  try {
    if (document.querySelector(`[${MARCA_QUEDA}]`) || document.querySelector('nextjs-portal')) return true;
    return /Application error: a client-side exception/i.test(document.body?.innerText ?? '');
  } catch { return false; }
}

const CHAVE = 'roboQa.v1';

/**
 * Última linha de defesa: quando a queda derruba o sistema inteiro (nem o robô sobrevive), esta função roda
 * fora do React, anota a queda no progresso salvo, pula a etapa que caiu e devolve o endereço para recarregar.
 * Retorna null se o robô não está rodando.
 */
export function recuperarDeQuedaTotal(mensagem: string): string | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    const e = bruto ? JSON.parse(bruto) : null;
    if (!e || e.versao !== 1 || !e.ativo || e.cancelado) return null;
    const url = window.location.pathname + window.location.search;
    e.achados.push({
      resultado: 'falha', gravidade: 'alta', titulo: 'A tela caiu e o sistema inteiro ficou em branco',
      explicacao: 'Um erro inesperado derrubou a página toda (mensagem "Application error"). O robô voltou ao início e seguiu para a próxima etapa.',
      origem: 'tela', tecnico: mensagem.slice(0, 300), perfil: e.perfilAtual ?? '', cenario: 'Queda da tela', passo: 'Abrir a tela',
      url, acao: 'Abrir a tela', esperado: 'a tela deveria abrir sem erro', obtido: 'a página inteira caiu', evidencia: `endereço ${url} · ${mensagem.slice(0, 200)}`,
    });
    e.passos.push({ perfil: e.perfilAtual ?? '', cenario: 'Queda da tela', nome: 'Abrir a tela', status: 'falha', url, quando: Date.now() });
    if (e.subEtapa === 'tour' || e.fase === 'dev') e.tourIdx = (e.tourIdx ?? 0) + 1;
    e.pausado = false;
    localStorage.setItem(CHAVE, JSON.stringify(e));
    return e.tenant ? `/${e.tenant}/dashboard` : '/';
  } catch { return null; }
}
