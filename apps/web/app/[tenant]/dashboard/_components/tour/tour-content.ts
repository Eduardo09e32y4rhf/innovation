/** Roteiro do passo a passo (apresentacao) de cada perfil. Dados puros: nada aqui depende de tela. */

export type TourIcon = 'home' | 'clock' | 'calendar' | 'inbox' | 'palm' | 'help' | 'users' | 'key' | 'layers' | 'check' | 'wallet' | 'file' | 'chart' | 'building' | 'briefcase' | 'calculator';

export interface TourStep {
  title: string;
  /** Texto curto e direto, na ordem do que a pessoa faz. */
  text: string;
  /** Onde clicar, em palavras (igual ao nome no menu). */
  where?: string;
  /** Dica opcional. */
  tip?: string;
  /** Rota relativa ao tenant, ex.: /dashboard/escalas?view=ponto. */
  href?: string;
  icon: TourIcon;
}

export interface Tour { role: string; label: string; intro: string; steps: TourStep[] }

const PONTO = '/dashboard/escalas?view=ponto';
const CALENDARIO = '/dashboard/escalas?view=calendario';
const PEDIDOS = '/dashboard/escalas?view=solicitacoes';
const APROVACOES = '/dashboard/escalas?view=aprovacoes';
const MODELOS = '/dashboard/escalas?view=modelos';
const FECHAMENTO = '/dashboard/escalas?view=fechamento';
const RELATORIOS = '/dashboard/escalas?view=relatorios';

const supportStep: TourStep = { icon: 'help', title: 'Precisou de ajuda?', where: 'Menu › Suporte', text: 'Abra um chamado, acompanhe a resposta e veja o histórico. Para rever este passo a passo, clique em “Como usar” no topo da tela.', href: '/dashboard/support' };

const ESCALAS_PADRAO: TourStep = {
  icon: 'layers',
  title: 'Escalas já prontas: 5x2, 6x1 e 12x36',
  where: 'Escalas › Escalas e regras',
  text: 'Sua empresa já nasceu com as três escalas mais usadas. Você pode alterar horários e dias, duplicar ou criar uma nova. Depois, atribua a escala ao funcionário a partir da data que quiser.',
  tip: 'O 12x36 começa a alternar a partir do dia em que a empresa foi criada; ajuste a data de início se precisar.',
  href: MODELOS,
};

export const TOURS: Record<string, Tour> = {
  FUNCIONARIO: {
    role: 'FUNCIONARIO', label: 'Funcionário', intro: 'Em poucos passos você aprende a bater ponto, ver sua escala e fazer seus pedidos.',
    steps: [
      { icon: 'home', title: 'Seu painel', where: 'Menu › Dashboard', text: 'Ao entrar, o sistema diz se hoje é folga ou dia de trabalho. Abaixo você vê o seu saldo de horas e as últimas jornadas.', href: '/dashboard' },
      { icon: 'clock', title: 'Bater ponto', where: 'Escalas › Ponto', text: 'Toque em “Bater ponto” a cada entrada, intervalo e saída. Permita a localização quando o navegador pedir. Cada batida gera um comprovante em PDF.', tip: 'O horário é o do servidor: não dá para alterar na hora da batida.', href: PONTO },
      { icon: 'calendar', title: 'Sua escala e seu dia', where: 'Escalas › Calendário', text: 'Veja seus dias de trabalho e folga. Clique em um dia para ver o que o sistema validou: “Sem ocorrência”, atraso, saída antecipada ou falta.', href: CALENDARIO },
      { icon: 'inbox', title: 'Seus pedidos', where: 'Escalas › Solicitações', text: 'Troque uma folga, troque de turno com um colega, ajuste uma batida, justifique um atraso ou peça folga com banco de horas (se a sua empresa usa banco).', tip: 'A escala em si é combinada com a empresa e lançada pelo RH ou gestor. Para um dia ou mês específico, peça troca de folga ou de turno.', href: PEDIDOS },
      { icon: 'palm', title: 'Férias', where: 'Menu › Férias', text: 'Clique em “Nova solicitação”, escolha as datas e envie. Você vê só os seus dados e o saldo do seu período.', href: '/dashboard/vacations' },
      supportStep,
    ],
  },

  GESTOR: {
    role: 'GESTOR', label: 'Gestor', intro: 'Acompanhe sua equipe, aprove pedidos e hora extra e mantenha a escala em dia.',
    steps: [
      { icon: 'home', title: 'Visão da equipe', where: 'Menu › Dashboard', text: 'Mostra a sua equipe hoje: quem bateu ponto, pendências e alertas.', href: '/dashboard' },
      { icon: 'calendar', title: 'Escala da equipe', where: 'Escalas › Calendário', text: 'Veja quem trabalha e quem folga em cada dia. Clique em um dia para ver as batidas e a ocorrência.', href: CALENDARIO },
      { icon: 'check', title: 'Aprovar pedidos e hora extra', where: 'Escalas › Aprovações', text: 'Aprove ou recuse trocas, ajustes e hora extra da equipe. A hora extra só abate atraso ou saída antecipada depois que você autoriza.', tip: 'Recusar mantém o atraso inteiro no banco ou na folha do funcionário.', href: APROVACOES },
      ESCALAS_PADRAO,
      { icon: 'users', title: 'Sua equipe', where: 'Menu › Funcionários', text: 'Consulte os dados da equipe e acompanhe quem está sem gestor ou sem acesso.', href: '/dashboard/employees' },
      supportStep,
    ],
  },

  RH: {
    role: 'RH', label: 'RH', intro: 'Do cadastro ao fechamento: o caminho completo para colocar a empresa para rodar.',
    steps: [
      { icon: 'users', title: '1. Cadastre o funcionário', where: 'Menu › Funcionários › Novo funcionário', text: 'Preencha os dados, o salário e a jornada. O salário é necessário para o fechamento calcular a folha.', href: '/dashboard/employees/new' },
      { icon: 'key', title: '2. Crie o acesso', where: 'Menu › Usuários', text: 'O sistema gera uma senha provisória de 6 caracteres. No primeiro login a pessoa é obrigada a trocar por uma senha de, no mínimo, 10 caracteres.', tip: 'A senha provisória aparece uma única vez. Anote ou reenvie pelo próprio sistema.', href: '/dashboard/users' },
      ESCALAS_PADRAO,
      { icon: 'check', title: '4. Aprove pedidos e ajustes', where: 'Escalas › Aprovações', text: 'Trocas, ajustes de batida, justificativas e hora extra chegam aqui. Cada aprovação já recalcula o dia.', href: APROVACOES },
      { icon: 'wallet', title: '5. Escolha: pagar a extra ou banco de horas', where: 'Configurações › Hora extra e banco', text: 'Defina se a hora extra é paga na folha ou vira banco de horas (com validade em meses). Com pagamento na folha, o funcionário não pede folga de banco.', href: '/dashboard/settings' },
      { icon: 'file', title: '6. Feche o mês', where: 'Escalas › Fechamento', text: 'Gere o fechamento do período, confira e envie para revisão da contabilidade. O PDF sai no formato de holerite com o espelho de ponto.', href: FECHAMENTO },
      { icon: 'palm', title: '7. Férias', where: 'Menu › Férias', text: 'Aprove ou recuse as solicitações e registre o pagamento. O recibo oficial sai em PDF depois do pagamento.', href: '/dashboard/vacations' },
      supportStep,
    ],
  },

  ADMIN: {
    role: 'ADMIN', label: 'Administrador', intro: 'Controle completo da empresa: pessoas, escalas, fechamento e cobrança.',
    steps: [
      { icon: 'users', title: '1. Cadastre o funcionário', where: 'Menu › Funcionários › Novo funcionário', text: 'Preencha os dados, o salário e a jornada.', href: '/dashboard/employees/new' },
      { icon: 'key', title: '2. Crie o acesso', where: 'Menu › Usuários', text: 'O sistema gera uma senha provisória de 6 caracteres; no primeiro login a troca por uma de 10 ou mais é obrigatória.', href: '/dashboard/users' },
      ESCALAS_PADRAO,
      { icon: 'check', title: '4. Aprove pedidos e hora extra', where: 'Escalas › Aprovações', text: 'Autorize a hora extra e as solicitações. Só depois de autorizada a extra abate atraso ou saída antecipada.', href: APROVACOES },
      { icon: 'wallet', title: '5. Hora extra: pagar ou banco', where: 'Configurações › Hora extra e banco', text: 'Escolha se a extra é paga na folha ou vira banco de horas e defina a validade.', href: '/dashboard/settings' },
      { icon: 'file', title: '6. Fechamento do mês', where: 'Escalas › Fechamento', text: 'Gere, confira e envie para a contabilidade validar. Aprovado, a folha do funcionário já fica correta.', href: FECHAMENTO },
      { icon: 'wallet', title: '7. Plano e faturas', where: 'Menu › Faturas', text: 'Veja o plano contratado, pague por Pix, boleto ou cartão e baixe a nota fiscal. Para mais usuários ou vagas, altere a quantidade ali.', href: '/dashboard/faturas' },
      supportStep,
    ],
  },

  CEO: {
    role: 'CEO', label: 'CEO', intro: 'A visão do dono: clientes, caixa e operação.',
    steps: [
      { icon: 'home', title: 'Seu painel', where: 'Menu › Dashboard', text: 'Métricas globais da plataforma em um só lugar.', href: '/dashboard' },
      { icon: 'building', title: 'Plataforma', where: 'Menu › Plataforma', text: 'Empresas clientes, suporte e auditoria. Escolha uma empresa para ver tudo dela.', href: '/dashboard/platform' },
      { icon: 'calculator', title: 'Contabilidade', where: 'Menu › Contabilidade', text: 'Regras de cálculo, fechamentos e folhas de todas as empresas. Aprovar aqui valida a folha do funcionário.', href: '/dashboard/contabilidade' },
      { icon: 'wallet', title: 'Faturas', where: 'Menu › Faturas', text: 'Cobranças, planos, cupons e notas fiscais.', href: '/dashboard/faturas' },
      supportStep,
    ],
  },

  CONTABIL: {
    role: 'CONTABIL', label: 'Contabilidade', intro: 'Você valida os cálculos. Depois da sua aprovação, a folha do funcionário já fica correta.',
    steps: [
      { icon: 'calculator', title: 'Visão geral', where: 'Menu › Contabilidade', text: 'Veja os fechamentos e folhas por empresa. Use o filtro para escolher uma empresa e o mês.', href: '/dashboard/contabilidade' },
      { icon: 'layers', title: 'Regras de cálculo', where: 'Contabilidade › seção de regras', text: 'INSS, IRRF, FGTS e parâmetros de hora extra ficam aqui, com versão por data. Use “Nova versão” para mudar uma regra e “Simular” para testar o resultado antes.', href: '/dashboard/contabilidade' },
      { icon: 'check', title: 'Conferir e aprovar', where: 'Contabilidade › Fechamentos e Folhas', text: 'Confira horas extras, atrasos, descontos e líquido. Clique em “Aprovar”, ou em “Devolver ao RH” com o motivo para a empresa corrigir.', tip: 'Alterou uma regra? Use “Recalcular rascunhos” para atualizar o que ainda não foi aprovado.', href: '/dashboard/contabilidade' },
      { icon: 'wallet', title: 'Financeiro da plataforma', where: 'Menu › Faturas', text: 'Assinaturas, cobranças e notas fiscais.', href: '/dashboard/faturas' },
      supportStep,
    ],
  },

  COMERCIAL: {
    role: 'COMERCIAL', label: 'Comercial', intro: 'Sua carteira de clientes, propostas e contratos.',
    steps: [
      { icon: 'home', title: 'Seu painel', where: 'Menu › Dashboard', text: 'Atalhos para empresas, propostas e planos.', href: '/dashboard' },
      { icon: 'building', title: 'Empresas', where: 'Menu › Plataforma › Empresas', text: 'Veja sua carteira e abra uma empresa para ver o plano e a situação.', href: '/dashboard/platform' },
      { icon: 'file', title: 'Propostas e contratos', where: 'Plataforma › Comercial', text: 'Crie propostas, acompanhe o aceite e os contratos. Os planos são Premium, R&S e Básico.', href: '/dashboard/platform' },
      supportStep,
    ],
  },

  DEV: {
    role: 'DEV', label: 'Desenvolvedor', intro: 'Visão técnica e operacional de toda a plataforma.',
    steps: [
      { icon: 'building', title: 'Plataforma', where: 'Menu › Plataforma', text: 'Empresas, acessos, faturamento e saúde operacional.', href: '/dashboard/platform' },
      { icon: 'calculator', title: 'Contabilidade', where: 'Menu › Contabilidade', text: 'Regras de cálculo e conferência de fechamentos.', href: '/dashboard/contabilidade' },
      ESCALAS_PADRAO,
      { icon: 'wallet', title: 'Hora extra e banco', where: 'Configurações › Hora extra e banco', text: 'Política de hora extra por empresa: pagar na folha ou banco de horas.', href: '/dashboard/settings' },
      supportStep,
    ],
  },

  CONSULTA: {
    role: 'CONSULTA', label: 'Consulta', intro: 'Você acompanha os indicadores sem alterar nada.',
    steps: [
      { icon: 'home', title: 'Indicadores', where: 'Menu › Dashboard', text: 'Resumo da operação em modo somente leitura.', href: '/dashboard' },
      { icon: 'calendar', title: 'Escalas', where: 'Escalas › Calendário', text: 'Veja a escala e as batidas, sem poder alterar.', href: CALENDARIO },
      { icon: 'chart', title: 'Relatórios', where: 'Escalas › Relatórios', text: 'Horas, extras e atrasos por funcionário e departamento.', href: RELATORIOS },
      supportStep,
    ],
  },

  RH_RS: {
    role: 'RH_RS', label: 'RH - Recrutamento e Seleção', intro: 'Abra vagas e conduza candidatos do início à contratação.',
    steps: [
      { icon: 'home', title: 'Seu painel', where: 'Menu › Dashboard', text: 'Vagas abertas, candidatos e andamento do processo.', href: '/dashboard' },
      { icon: 'briefcase', title: 'Abra uma vaga', where: 'Menu › Vagas', text: 'Crie a vaga, defina perguntas e critérios e divulgue o link. No plano R&S, a quantidade contratada é o limite de vagas por mês.', href: '/dashboard/jobs' },
      { icon: 'users', title: 'Candidatos', where: 'Vagas › sua vaga', text: 'Acompanhe as candidaturas, mova de etapa e registre a contratação.', href: '/dashboard/jobs' },
      supportStep,
    ],
  },
};

/** Roteiro do perfil; perfis desconhecidos recebem o do funcionario (o mais restrito). */
export function tourFor(role?: string | null): Tour {
  return TOURS[String(role ?? '').toUpperCase()] ?? TOURS.FUNCIONARIO;
}
