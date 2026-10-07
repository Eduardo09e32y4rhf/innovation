export type Gravidade = 'alta' | 'media' | 'baixa';

export type ResultadoPasso = 'ok' | 'falha' | 'inconclusivo' | 'nao-testado';
export type Modo = 'rapido' | 'completo';

export interface Achado {
  /** falha = defeito com evidencia; inconclusivo = nao deu para concluir (ex.: botao nao encontrado). */
  resultado: 'falha' | 'inconclusivo' | 'nao-testado';
  gravidade: Gravidade;
  titulo: string;
  explicacao: string;
  origem: string;
  tecnico?: string;
  perfil: string;
  cenario: string;
  passo: string;
  url: string;
  naTela?: string;
  acao: string;
  esperado: string;
  obtido: string;
  evidencia: string;
}

export interface PassoRegistro {
  perfil: string;
  cenario: string;
  nome: string;
  status: ResultadoPasso;
  url: string;
  quando: number;
}

/** Resumo de uma aba/etapa, pronto para copiar e colar. */
export interface ResumoAba {
  perfil: string;
  aba: string;
  passou: number;
  falhou: number;
  inconclusivo: number;
  naoTestado: number;
  texto: string;
}

export interface UsuarioTeste {
  perfil: string;
  nome: string;
  email: string;
  /** Provisoria ate o primeiro login; depois a senha nova definida pelo robo. */
  senha: string;
  criado: boolean;
  situacao: 'pendente' | 'testando' | 'testado' | 'erro';
  /** true quando a conta ja existia de uma execucao anterior (nao cria nem refaz o primeiro acesso). */
  reutilizada?: boolean;
  motivo?: string;
}

export type Fase = 'ocioso' | 'dev' | 'criando' | 'usuarios' | 'fim';
export type SubEtapa = 'sair' | 'login' | 'portoes' | 'tour' | 'concluido';
export type Ritmo = 'devagar' | 'normal' | 'rapido';

export interface Estado {
  versao: 1;
  ativo: boolean;
  pausado: boolean;
  cancelado: boolean;
  fase: Fase;
  ritmo: Ritmo;
  modo: Modo;
  inicio: number;
  fim?: number;
  perfis: string[];
  usuarios: UsuarioTeste[];
  idxUsuario: number;
  subEtapa: SubEtapa;
  tourIdx: number;
  passos: PassoRegistro[];
  achados: Achado[];
  abas?: ResumoAba[];
  agora: string;
  perfilAtual: string;
  tenant: string;
}

/** O que o motor precisa do app hospedeiro (Next.js) e que nao da para fazer so com o DOM. */
export interface Anfitriao {
  navegar(caminho: string): void;
  sair(): void;
  caminhoAtual(): string;
  usuario(): { nome: string; email: string; perfil: string } | null;
  tenant(): string;
}

export interface Contexto {
  anfitriao: Anfitriao;
  estado: Estado;
  salvar(): void;
  perfil: string;
  cenario: string;
  ritmo: { antes: number; depois: number; digitacao: number };
  esperaNegado: boolean;
  /** Limite de tempo do bloco atual (epoch ms). Passou disso: marca a tela como bloqueada e segue. */
  prazo: number;
  aguardar(ms: number): Promise<void>;
  /** Lanca se o usuario cancelou; espera enquanto pausado. */
  checarControle(): Promise<void>;
  atualizar(): void;
}