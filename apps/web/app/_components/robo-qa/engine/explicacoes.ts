import type { Gravidade } from './tipos';

// Traduz erros tecnicos para linguagem simples. Gravidade: alta (bloqueia uso/seguranca), media, baixa.

export interface Explicacao { gravidade: Gravidade; titulo: string; explicacao: string }
export type Resultado = 'falha' | 'inconclusivo';

/** So vira FALHA quando ha evidencia de defeito. Nao achar botao/campo, tempo esgotado e recusas de permissao sao INCONCLUSIVOS. */
export function classificar(origem: string, explicacao: Explicacao, tecnico?: string): Resultado {
  if (origem === 'pageerror' || origem === 'tela' || origem === 'regra') return 'falha';
  if (origem === 'http') return /erro 500|\(erro 500\)/i.test(explicacao.titulo) ? 'falha' : 'inconclusivo';
  if (origem === 'passo') return /^ESPERADO:/i.test(tecnico ?? '') ? 'falha' : 'inconclusivo';
  return 'inconclusivo';
}
export const GRAVIDADE_ORDEM: Record<Gravidade, number> = { alta: 0, media: 1, baixa: 2 };

export interface EventoTecnico { tipo: 'pageerror' | 'console' | 'rede' | 'http'; texto?: string; status?: number; metodo?: string; alvo?: string }

const curto = (texto: unknown, max = 220) => (String(texto).length > max ? `${String(texto).slice(0, max)}…` : String(texto));
const caminho = (url?: string) => { try { const u = new URL(String(url), 'http://x'); return u.pathname + (u.search ? '?…' : ''); } catch { return curto(url, 90); } };

export function explicarEvento(evento: EventoTecnico, perfil: string): Explicacao {
  switch (evento.tipo) {
    case 'pageerror':
      return { gravidade: 'alta', titulo: 'Erro de programação na tela', explicacao: `A tela quebrou por um erro interno (JavaScript). Para quem usa, normalmente algo trava, some ou não responde ao clique. Mensagem técnica: "${curto(evento.texto)}".` };
    case 'console':
      return { gravidade: 'baixa', titulo: 'Aviso de erro escondido no navegador', explicacao: `A tela funcionou, mas o navegador registrou um erro por baixo: "${curto(evento.texto)}". Costuma indicar algo mal feito que pode virar defeito visível.` };
    case 'rede':
      return { gravidade: 'media', titulo: 'Falha de comunicação com o servidor', explicacao: `Uma chamada para ${caminho(evento.alvo)} não chegou ao servidor (${evento.texto}). O usuário veria carregamento infinito ou dados faltando.` };
    default: {
      const status = evento.status ?? 0;
      const alvo = `${evento.metodo ?? 'GET'} ${caminho(evento.alvo)}`;
      if (status >= 500) return { gravidade: 'alta', titulo: 'O servidor falhou (erro 500)', explicacao: `Ao usar esta tela, o servidor deu erro interno em "${alvo}". O usuário vê erro ou nada acontece. É defeito do sistema, não do usuário.` };
      if (status === 404) return { gravidade: 'media', titulo: 'A tela pediu algo que não existe (404)', explicacao: `A tela chamou "${alvo}", que o servidor não reconhece. Costuma ser uma tela apontando para uma rota antiga ou um registro que sumiu.` };
      if (status === 403) return { gravidade: 'media', titulo: 'Permissão negada em uma ação que a tela deixou tentar (403)', explicacao: `O perfil ${perfil} tentou "${alvo}" e o servidor recusou. Se a tela mostrou o botão ou carregou essa área para esse perfil, o correto é esconder, para não aparecer erro ao usuário.` };
      if (status === 401) return { gravidade: 'media', titulo: 'Sessão não reconhecida (401)', explicacao: `O servidor não reconheceu a sessão em "${alvo}". Pode ser sessão expirada ou chamada feita sem estar logado.` };
      if (status === 429) return { gravidade: 'baixa', titulo: 'Muitas requisições (429)', explicacao: `O servidor limitou chamadas em "${alvo}". Pode ser o próprio robô testando rápido, mas confira se a tela não dispara chamadas demais.` };
      return { gravidade: 'media', titulo: `Chamada recusada (erro ${status})`, explicacao: `O servidor respondeu ${status} em "${alvo}". A ação provavelmente não funcionou.` };
    }
  }
}

export function explicarFalhaPasso(nome: string, erro: unknown): Explicacao {
  const mensagem = String((erro as { message?: string })?.message ?? erro).split('\n')[0];
  if (mensagem.startsWith('ESPERADO:')) return { gravidade: 'alta', titulo: 'Não é o que deveria aparecer', explicacao: mensagem.replace('ESPERADO:', '').trim() };
  if (/Tempo esgotado|Timeout|n[aã]o achei/i.test(mensagem)) {
    return { gravidade: 'baixa', titulo: 'Inconclusivo: não achei o botão/campo ou a tela não carregou a tempo', explicacao: `No passo "${nome}", o robô esperou e não encontrou o botão/campo ou ele estava bloqueado. Para um usuário real isso seria um botão que não aparece ou não responde. Detalhe técnico: ${curto(mensagem, 160)}` };
  }
  return { gravidade: 'baixa', titulo: 'Inconclusivo: o passo não pôde ser concluído', explicacao: `No passo "${nome}" algo deu errado: ${curto(mensagem, 200)}` };
}

export const EXPLICACAO_TELA_BRANCA: Explicacao = { gravidade: 'alta', titulo: 'A tela abriu em branco', explicacao: 'A página carregou sem nenhum conteúdo visível. Para o usuário é uma tela vazia, sem saber o que fazer.' };
export const EXPLICACAO_ERRO_NEXT: Explicacao = { gravidade: 'alta', titulo: 'O sistema mostrou a tela de erro inesperado', explicacao: 'Apareceu a mensagem "Application error" ou o painel de erro do Next.js. A tela inteira caiu por causa de um erro de programação.' };
export const explicacaoAvisoDeErro = (texto: string): Explicacao => ({ gravidade: 'media', titulo: 'A tela exibiu uma mensagem de erro ao usuário', explicacao: `O usuário viu o aviso: "${curto(texto, 200)}". Se foi só ao abrir a tela, algo carregou errado.` });
export const explicacaoRolagemLateral = (largura: number, janela: number): Explicacao => ({ gravidade: 'media', titulo: 'A tela é mais larga que o aparelho (rolagem lateral)', explicacao: `O conteúdo tem ${largura}px de largura, mas a janela tem só ${janela}px. No celular o usuário teria que arrastar para o lado, e alguns botões ficariam escondidos.` });
export const explicacaoVazamento = (perfil: string, rota: string): Explicacao => ({ gravidade: 'alta', titulo: 'SEGURANÇA: o perfil abriu uma área que deveria estar bloqueada', explicacao: `O perfil ${perfil} conseguiu abrir "${rota}", que não deveria ser permitida para ele. Mesmo que o servidor proteja os dados, o usuário não deveria nem ver essa tela.` });
export const explicacaoMenuFaltando = (perfil: string, item: string): Explicacao => ({ gravidade: 'media', titulo: 'Item de menu que deveria aparecer não apareceu', explicacao: `O perfil ${perfil} deveria ver "${item}" no menu, mas não viu. O usuário não conseguiria chegar nessa função pelo menu.` });
export const explicacaoMenuSobrando = (perfil: string, item: string): Explicacao => ({ gravidade: 'media', titulo: 'Item de menu aparece para quem não deveria', explicacao: `O perfil ${perfil} vê "${item}" no menu, mas não deveria ter essa função.` });