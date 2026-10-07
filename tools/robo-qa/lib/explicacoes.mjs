// Traduz erros tecnicos para linguagem simples. Gravidade: alta (bloqueia uso/seguranca), media, baixa.

export const GRAVIDADE_ORDEM = { alta: 0, media: 1, baixa: 2 };

const curto = (texto, max = 220) => (String(texto).length > max ? `${String(texto).slice(0, max)}…` : String(texto));
const caminho = (url) => { try { const u = new URL(url); return u.pathname + (u.search ? '?…' : ''); } catch { return curto(url, 90); } };

export function explicarEvento(evento, { perfil }) {
  switch (evento.tipo) {
    case 'pageerror':
      return { gravidade: 'alta', titulo: 'Erro de programação na tela', explicacao: `A tela quebrou por um erro interno (JavaScript). Para quem usa, normalmente algo trava, some ou não responde ao clique. Mensagem técnica: "${curto(evento.texto)}".` };
    case 'console':
      return { gravidade: 'baixa', titulo: 'Aviso de erro escondido no navegador', explicacao: `A tela funcionou, mas o navegador registrou um erro por baixo: "${curto(evento.texto)}". Costuma indicar algo mal feito que pode virar defeito visível.` };
    case 'rede':
      return { gravidade: 'media', titulo: 'Falha de comunicação com o servidor', explicacao: `Uma chamada para ${caminho(evento.alvo)} não chegou ao servidor (${evento.texto}). O usuário veria carregamento infinito ou dados faltando.` };
    case 'http': {
      const alvo = `${evento.metodo} ${caminho(evento.alvo)}`;
      if (evento.status >= 500) return { gravidade: 'alta', titulo: 'O servidor falhou (erro 500)', explicacao: `Ao usar esta tela, o servidor deu erro interno em "${alvo}". O usuário vê erro ou nada acontece. É defeito do sistema, não do usuário.` };
      if (evento.status === 404) return { gravidade: 'media', titulo: 'A tela pediu algo que não existe (404)', explicacao: `A tela chamou "${alvo}", que o servidor não reconhece. Costuma ser uma tela apontando para uma rota antiga ou um registro que sumiu.` };
      if (evento.status === 403) return { gravidade: 'media', titulo: 'Permissão negada em uma ação que a tela deixou tentar (403)', explicacao: `O perfil ${perfil} tentou "${alvo}" e o servidor recusou. Se a tela mostrou o botão ou carregou essa área para esse perfil, o correto é esconder, para não aparecer erro ao usuário.` };
      if (evento.status === 401) return { gravidade: 'media', titulo: 'Sessão não reconhecida (401)', explicacao: `O servidor não reconheceu a sessão em "${alvo}". Pode ser sessão expirada ou chamada feita sem estar logado.` };
      if (evento.status === 429) return { gravidade: 'baixa', titulo: 'Muitas requisições (429)', explicacao: `O servidor limitou chamadas em "${alvo}". Pode ser o próprio robô testando rápido, mas confira se a tela não dispara chamadas demais.` };
      return { gravidade: 'media', titulo: `Chamada recusada (erro ${evento.status})`, explicacao: `O servidor respondeu ${evento.status} em "${alvo}". A ação provavelmente não funcionou.` };
    }
    default:
      return { gravidade: 'baixa', titulo: 'Ocorrência', explicacao: curto(evento.texto || JSON.stringify(evento)) };
  }
}

export function explicarFalhaPasso(nome, erro) {
  const mensagem = String(erro?.message ?? erro).split('\n')[0];
  if (mensagem.startsWith('ESPERADO:')) return { gravidade: 'alta', titulo: 'Não é o que deveria aparecer', explicacao: mensagem.replace('ESPERADO:', '').trim() };
  if (/Timeout|waiting for/i.test(mensagem)) {
    return { gravidade: 'alta', titulo: 'Não foi possível fazer o passo (não achei ou não consegui clicar)', explicacao: `No passo "${nome}", o robô esperou e não encontrou o botão/campo ou ele estava bloqueado. Para um usuário real isso seria um botão que não aparece ou não responde. Detalhe técnico: ${curto(mensagem, 160)}` };
  }
  return { gravidade: 'alta', titulo: 'O passo falhou', explicacao: `No passo "${nome}" algo deu errado: ${curto(mensagem, 200)}` };
}

export const EXPLICACAO_TELA_BRANCA = { gravidade: 'alta', titulo: 'A tela abriu em branco', explicacao: 'A página carregou sem nenhum conteúdo visível. Para o usuário é uma tela vazia, sem saber o que fazer.' };
export const EXPLICACAO_ERRO_NEXT = { gravidade: 'alta', titulo: 'O sistema mostrou a tela de erro inesperado', explicacao: 'Apareceu a mensagem "Application error" ou o painel de erro do Next.js. A tela inteira caiu por causa de um erro de programação.' };
export const explicacaoAvisoDeErro = (texto) => ({ gravidade: 'media', titulo: 'A tela exibiu uma mensagem de erro ao usuário', explicacao: `O usuário viu o aviso: "${curto(texto, 200)}". Se foi só ao abrir a tela, algo carregou errado.` });
export const explicacaoRolagemLateral = (largura, janela) => ({ gravidade: 'media', titulo: 'A tela é mais larga que o aparelho (rolagem lateral)', explicacao: `O conteúdo tem ${largura}px de largura, mas a janela tem só ${janela}px. No celular o usuário teria que arrastar para o lado, e alguns botões ficariam escondidos.` });
export const explicacaoVazamento = (perfil, rota) => ({ gravidade: 'alta', titulo: 'SEGURANÇA: o perfil abriu uma área que deveria estar bloqueada', explicacao: `O perfil ${perfil} conseguiu abrir "${rota}", que não deveria ser permitida para ele. Mesmo que o servidor proteja os dados, o usuário não deveria nem ver essa tela.` });
export const explicacaoMenuFaltando = (perfil, item) => ({ gravidade: 'media', titulo: 'Item de menu que deveria aparecer não apareceu', explicacao: `O perfil ${perfil} deveria ver "${item}" no menu, mas não viu. O usuário não conseguiria chegar nessa função pelo menu.` });
export const explicacaoMenuSobrando = (perfil, item) => ({ gravidade: 'media', titulo: 'Item de menu aparece para quem não deveria', explicacao: `O perfil ${perfil} vê "${item}" no menu, mas não deveria ter essa função.` });