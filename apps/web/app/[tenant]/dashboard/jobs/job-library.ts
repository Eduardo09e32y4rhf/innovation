/**
 * Modelos prontos do cadastro de vagas: cargos, perguntas de triagem com regras e criterios de avaliacao.
 * O RH escolhe e ajusta; nada precisa ser digitado do zero.
 */
import type { Question, QuestionType } from './types';

/** Valor de cada resposta: % da pergunta (100 ideal ... 0 nao pontua) ou 'X' = elimina. */
export type Level = 100 | 70 | 40 | 0 | 'X';
export const LEVELS: { value: Level; label: string; short: string; tone: string }[] = [
  { value: 100, label: 'Ideal (100%)', short: 'Ideal', tone: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { value: 70, label: 'Bom (70%)', short: 'Bom', tone: 'bg-lime-50 text-lime-800 border-lime-300' },
  { value: 40, label: 'Regular (40%)', short: 'Regular', tone: 'bg-amber-50 text-amber-800 border-amber-300' },
  { value: 0, label: 'Não pontua (0%)', short: 'Não pontua', tone: 'bg-zinc-100 text-zinc-700 border-zinc-300' },
  { value: 'X', label: 'Elimina', short: 'Elimina', tone: 'bg-rose-50 text-rose-800 border-rose-300' },
];
export const IMPORTANCE: { value: 0 | 1 | 2 | 3; label: string }[] = [
  { value: 0, label: 'Só informativa (não conta na nota)' },
  { value: 1, label: 'Importância normal' },
  { value: 2, label: 'Importante' },
  { value: 3, label: 'Muito importante' },
];

export interface LibraryQuestion {
  key: string; category: string; label: string; type: QuestionType; options?: string[];
  levels?: Record<string, Level>; weight?: 0 | 1 | 2 | 3; required?: boolean;
  /** NUMBER: faixa ideal (100%) e faixa aceita (fora dela elimina). */
  ideal?: { min?: number; max?: number }; accept?: { min?: number; max?: number };
}

const YES_IDEAL: Record<string, Level> = { Sim: 100, Não: 0 };
const YES_REQUIRED: Record<string, Level> = { Sim: 100, Não: 'X' };

export const QUESTION_LIBRARY: LibraryQuestion[] = [
  // Disponibilidade
  { key: 'inicio', category: 'Disponibilidade', label: 'Tem disponibilidade para começar imediatamente?', type: 'SELECT', options: ['Imediato', 'Em até 15 dias', 'Em até 30 dias', 'Mais de 30 dias'], levels: { Imediato: 100, 'Em até 15 dias': 70, 'Em até 30 dias': 40, 'Mais de 30 dias': 0 }, weight: 1, required: true },
  { key: 'escala', category: 'Disponibilidade', label: 'Tem disponibilidade para trabalhar em escala, inclusive fins de semana e feriados?', type: 'YESNO', levels: YES_REQUIRED, weight: 2, required: true },
  { key: 'turnos', category: 'Disponibilidade', label: 'Em quais turnos você pode trabalhar?', type: 'MULTI', options: ['Manhã', 'Tarde', 'Noite', 'Madrugada'], levels: { Manhã: 100, Tarde: 100, Noite: 100, Madrugada: 100 }, weight: 1, required: true },
  { key: 'viagens', category: 'Disponibilidade', label: 'Tem disponibilidade para viagens?', type: 'YESNO', levels: YES_IDEAL, weight: 1 },
  { key: 'horaextra', category: 'Disponibilidade', label: 'Tem disponibilidade para fazer hora extra quando necessário?', type: 'YESNO', levels: YES_IDEAL, weight: 1 },
  { key: 'distancia', category: 'Disponibilidade', label: 'Quanto tempo você leva de casa até o local de trabalho?', type: 'SELECT', options: ['Até 30 minutos', '30 minutos a 1 hora', '1 a 2 horas', 'Mais de 2 horas'], levels: { 'Até 30 minutos': 100, '30 minutos a 1 hora': 70, '1 a 2 horas': 40, 'Mais de 2 horas': 0 }, weight: 1, required: true },
  // Experiencia e formacao
  { key: 'experiencia', category: 'Experiência e formação', label: 'Quanto tempo de experiência você tem na função?', type: 'SELECT', options: ['Sem experiência', 'Menos de 6 meses', '6 meses a 2 anos', 'Mais de 2 anos'], levels: { 'Sem experiência': 0, 'Menos de 6 meses': 40, '6 meses a 2 anos': 70, 'Mais de 2 anos': 100 }, weight: 3, required: true },
  { key: 'experiencia-exigida', category: 'Experiência e formação', label: 'Você tem experiência comprovada em carteira na função?', type: 'YESNO', levels: YES_REQUIRED, weight: 2, required: true },
  { key: 'escolaridade', category: 'Experiência e formação', label: 'Qual sua escolaridade?', type: 'SELECT', options: ['Fundamental', 'Médio incompleto', 'Médio completo', 'Técnico', 'Superior incompleto', 'Superior completo', 'Pós-graduação'], levels: { Fundamental: 40, 'Médio incompleto': 40, 'Médio completo': 100, Técnico: 100, 'Superior incompleto': 100, 'Superior completo': 100, 'Pós-graduação': 100 }, weight: 1, required: true },
  { key: 'medio', category: 'Experiência e formação', label: 'Você concluiu o ensino médio?', type: 'YESNO', levels: YES_REQUIRED, weight: 1, required: true },
  { key: 'superior', category: 'Experiência e formação', label: 'Você tem curso superior na área?', type: 'SELECT', options: ['Não', 'Cursando', 'Completo'], levels: { Não: 0, Cursando: 70, Completo: 100 }, weight: 2, required: true },
  { key: 'lideranca', category: 'Experiência e formação', label: 'Já liderou equipe? De quantas pessoas?', type: 'SELECT', options: ['Nunca liderei', 'Até 5 pessoas', '6 a 15 pessoas', 'Mais de 15 pessoas'], levels: { 'Nunca liderei': 0, 'Até 5 pessoas': 70, '6 a 15 pessoas': 100, 'Mais de 15 pessoas': 100 }, weight: 2, required: true },
  // Habilidades
  { key: 'excel', category: 'Habilidades', label: 'Qual seu nível em Excel / planilhas?', type: 'SELECT', options: ['Nenhum', 'Básico', 'Intermediário', 'Avançado'], levels: { Nenhum: 0, Básico: 40, Intermediário: 100, Avançado: 100 }, weight: 1, required: true },
  { key: 'informatica', category: 'Habilidades', label: 'Sabe usar computador (e-mail, Word, internet)?', type: 'YESNO', levels: YES_IDEAL, weight: 1, required: true },
  { key: 'ingles', category: 'Habilidades', label: 'Qual seu nível de inglês?', type: 'SELECT', options: ['Nenhum', 'Básico', 'Intermediário', 'Avançado / fluente'], levels: { Nenhum: 0, Básico: 40, Intermediário: 70, 'Avançado / fluente': 100 }, weight: 1, required: true },
  { key: 'atendimento', category: 'Habilidades', label: 'Já trabalhou com atendimento ao público?', type: 'YESNO', levels: YES_IDEAL, weight: 2, required: true },
  { key: 'metas', category: 'Habilidades', label: 'Já trabalhou com metas de vendas?', type: 'YESNO', levels: YES_IDEAL, weight: 2, required: true },
  { key: 'sistema', category: 'Habilidades', label: 'Quais sistemas você já usou?', type: 'MULTI', options: ['ERP (SAP, TOTVS, outro)', 'CRM', 'Sistema de ponto de venda (PDV)', 'Planilhas', 'Nenhum'], levels: { 'ERP (SAP, TOTVS, outro)': 100, CRM: 100, 'Sistema de ponto de venda (PDV)': 100, Planilhas: 70, Nenhum: 0 }, weight: 1 },
  // Documentos e requisitos
  { key: 'cnh', category: 'Documentos e requisitos', label: 'Possui CNH? Qual categoria?', type: 'SELECT', options: ['Não possuo', 'A', 'B', 'AB', 'C', 'D', 'E'], levels: { 'Não possuo': 'X', A: 'X', B: 100, AB: 100, C: 100, D: 100, E: 100 }, weight: 3, required: true },
  { key: 'cnh-pesada', category: 'Documentos e requisitos', label: 'Possui CNH categoria C, D ou E?', type: 'SELECT', options: ['Não', 'C', 'D', 'E'], levels: { Não: 'X', C: 70, D: 100, E: 100 }, weight: 3, required: true },
  { key: 'ear', category: 'Documentos e requisitos', label: 'Sua CNH tem a observação EAR (exerce atividade remunerada)?', type: 'YESNO', levels: YES_IDEAL, weight: 1 },
  { key: 'veiculo', category: 'Documentos e requisitos', label: 'Possui veículo próprio?', type: 'SELECT', options: ['Não', 'Moto', 'Carro'], levels: { Não: 0, Moto: 100, Carro: 100 }, weight: 1 },
  { key: 'conselho', category: 'Documentos e requisitos', label: 'Possui registro ativo no conselho da profissão (COREN, CRC, CREA...)?', type: 'YESNO', levels: YES_REQUIRED, weight: 3, required: true },
  { key: 'nr10', category: 'Documentos e requisitos', label: 'Possui certificado NR-10 válido?', type: 'YESNO', levels: YES_REQUIRED, weight: 3, required: true },
  { key: 'nr35', category: 'Documentos e requisitos', label: 'Possui certificado NR-35 (trabalho em altura) válido?', type: 'YESNO', levels: YES_IDEAL, weight: 2 },
  { key: 'empilhadeira', category: 'Documentos e requisitos', label: 'Possui curso de operador de empilhadeira?', type: 'YESNO', levels: YES_IDEAL, weight: 2 },
  { key: 'manipulacao', category: 'Documentos e requisitos', label: 'Possui curso de boas práticas de manipulação de alimentos?', type: 'YESNO', levels: YES_IDEAL, weight: 1 },
  { key: 'maior', category: 'Documentos e requisitos', label: 'Você tem 18 anos ou mais?', type: 'YESNO', levels: YES_REQUIRED, weight: 0, required: true },
  // Remuneracao
  { key: 'pretensao', category: 'Remuneração', label: 'Qual sua pretensão salarial (R$ por mês)?', type: 'NUMBER', weight: 1, required: true },
  { key: 'faixa', category: 'Remuneração', label: 'A faixa salarial da vaga atende sua expectativa?', type: 'YESNO', levels: { Sim: 100, Não: 0 }, weight: 1, required: true },
  { key: 'clt', category: 'Remuneração', label: 'Aceita contratação no regime informado na vaga?', type: 'YESNO', levels: YES_REQUIRED, weight: 0, required: true },
  // Sobre voce
  { key: 'trabalha', category: 'Sobre você', label: 'Está trabalhando atualmente?', type: 'YESNO', weight: 0 },
  { key: 'bairro', category: 'Sobre você', label: 'Em qual bairro e cidade você mora?', type: 'TEXT', weight: 0, required: true },
  { key: 'porque', category: 'Sobre você', label: 'Por que você quer trabalhar conosco?', type: 'LONG', weight: 0 },
  { key: 'origem', category: 'Sobre você', label: 'Como ficou sabendo da vaga?', type: 'SELECT', options: ['Indicação', 'Redes sociais', 'Site de vagas', 'Placa / anúncio no local', 'Outro'], weight: 0 },
];

export const QUESTION_CATEGORIES = [...new Set(QUESTION_LIBRARY.map((item) => item.category))];
const LIB = new Map(QUESTION_LIBRARY.map((item) => [item.key, item]));

/** Converte o modelo em pergunta pronta, ja com as regras de nota (%) e eliminacao. */
export function questionFromLibrary(key: string, eliminate: 'FLAG' | 'REJECT' = 'REJECT'): Question {
  const item = LIB.get(key);
  if (!item) throw new Error(`Pergunta desconhecida: ${key}`);
  const options = item.type === 'YESNO' ? ['Sim', 'Não'] : item.options ?? [];
  const base: Question = { label: item.label, type: item.type, required: item.required ?? false, options: item.type === 'YESNO' ? [] : options, knockout: null, scoreRule: null };
  if (item.type === 'NUMBER') return applyNumberRules(base, item.weight ?? 0, item.ideal ?? {}, item.accept ?? {}, eliminate);
  return applyLevels(base, item.levels ?? {}, item.weight ?? 0, eliminate);
}

export function optionsOf(question: Pick<Question, 'type' | 'options'>) {
  return question.type === 'YESNO' ? ['Sim', 'Não'] : question.options;
}

/** Niveis por opcao + importancia -> scoreRule v2 (% da pergunta) e knockout (opcoes que eliminam). */
export function applyLevels(question: Question, levels: Record<string, Level>, weight: number, eliminate: 'FLAG' | 'REJECT'): Question {
  const options = optionsOf(question);
  const eliminated = options.filter((option) => levels[option] === 'X');
  const pct = Object.fromEntries(options.filter((option) => levels[option] !== 'X' && levels[option] !== undefined).map((option) => [option, levels[option] as number]));
  const scored = weight > 0 && Object.keys(pct).length > 0;
  return {
    ...question,
    scoreRule: scored ? { v: 2, weight, levels: pct } : null,
    knockout: eliminated.length && eliminated.length < options.length ? { acceptValues: options.filter((option) => !eliminated.includes(option)), action: eliminate } : null,
  };
}

/** Le de volta os niveis de uma pergunta salva (aceita o formato antigo de pontos livres). */
export function levelsOf(question: Question): Record<string, Level> {
  const options = optionsOf(question);
  const rule = question.scoreRule as { v?: number; levels?: Record<string, number>; points?: Record<string, number> } | null;
  const accepted = question.knockout?.acceptValues;
  const raw = rule?.v === 2 ? rule.levels ?? {} : rule?.points ?? {};
  const max = rule?.v === 2 ? 100 : Math.max(0, ...Object.values(raw).map(Number));
  const out: Record<string, Level> = {};
  for (const option of options) {
    if (accepted?.length && !accepted.includes(option)) { out[option] = 'X'; continue; }
    const value = Number(raw[option] ?? 0);
    const pct = max > 0 ? (value / max) * 100 : 0;
    out[option] = pct >= 85 ? 100 : pct >= 55 ? 70 : pct >= 20 ? 40 : 0;
  }
  return out;
}

export function weightOf(question: Question): 0 | 1 | 2 | 3 {
  const rule = question.scoreRule as { v?: number; weight?: number; levels?: object; points?: object; ranges?: unknown[] } | null;
  if (!rule) return 0;
  if (rule.v === 2) return Math.max(0, Math.min(3, Math.round(Number(rule.weight) || 0))) as 0 | 1 | 2 | 3;
  return 1;
}

/** NUMBER: faixa ideal vale 100% (fora dela 0%); fora da faixa aceita elimina. */
export function applyNumberRules(question: Question, weight: number, ideal: { min?: number; max?: number }, accept: { min?: number; max?: number }, eliminate: 'FLAG' | 'REJECT'): Question {
  const hasIdeal = ideal.min !== undefined || ideal.max !== undefined;
  const hasAccept = accept.min !== undefined || accept.max !== undefined;
  return {
    ...question,
    scoreRule: weight > 0 && hasIdeal ? { v: 2, weight, ranges: [{ min: ideal.min, max: ideal.max, pct: 100 }] } : null,
    knockout: hasAccept ? { min: accept.min, max: accept.max, action: eliminate } : null,
  };
}

export function numberRulesOf(question: Question) {
  const rule = question.scoreRule as { ranges?: { min?: number; max?: number }[] } | null;
  return { ideal: rule?.ranges?.[0] ?? {}, accept: { min: question.knockout?.min, max: question.knockout?.max } };
}

/** Quanto cada pergunta vale na nota final (soma 100%). Mesmo calculo do servidor. */
export function weightShares(questions: Question[]): number[] {
  const weights = questions.map((question) => (question.scoreRule ? weightOf(question) : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((weight) => (total ? Math.round((weight / total) * 100) : 0));
}

// ---------- criterios de avaliacao ----------
export const CRITERIA_LIBRARY: { name: string; weight: number }[] = [
  { name: 'Conhecimento técnico da função', weight: 3 }, { name: 'Experiência anterior', weight: 3 }, { name: 'Comunicação', weight: 2 },
  { name: 'Atendimento ao cliente', weight: 2 }, { name: 'Trabalho em equipe', weight: 2 }, { name: 'Organização', weight: 2 },
  { name: 'Proatividade', weight: 2 }, { name: 'Postura e apresentação', weight: 1 }, { name: 'Liderança', weight: 3 },
  { name: 'Foco em resultado', weight: 2 }, { name: 'Resolução de problemas', weight: 2 }, { name: 'Alinhamento com a cultura', weight: 2 },
  { name: 'Disponibilidade', weight: 1 }, { name: 'Pontualidade e assiduidade', weight: 1 }, { name: 'Negociação', weight: 2 }, { name: 'Raciocínio lógico', weight: 2 },
];

// ---------- cargos ----------
export interface RoleTemplate {
  id: string; label: string; keywords: string[]; department: string; titles: string[];
  summary: (title: string) => string; responsibilities: string[]; requirements: string[]; benefits: string[];
  questions: string[]; criteria: string[]; guide: string[]; employmentType?: string; workMode?: string;
}

const BASIC_BENEFITS = ['Vale-transporte', 'Vale-refeição ou alimentação', 'Plano de saúde', 'Seguro de vida'];
const BASE_GUIDE = ['Conte um pouco da sua trajetória e do que você faz hoje.', 'Por que esta vaga chamou sua atenção?', 'Conte uma situação difícil no trabalho e como você resolveu.', 'Qual sua disponibilidade de início e pretensão salarial?'];

export const ROLE_TEMPLATES: RoleTemplate[] = [
  { id: 'vendas', label: 'Vendas', keywords: ['vendedor', 'vendas', 'consultor de vendas', 'representante comercial', 'executivo de contas', 'comercial', 'promotor'], department: 'Comercial',
    titles: ['Vendedor', 'Vendedor Externo', 'Consultor de Vendas', 'Representante Comercial', 'Executivo de Contas', 'Promotor de Vendas', 'Supervisor de Vendas', 'Gerente Comercial'],
    summary: (t) => `Buscamos ${t} para atender clientes, apresentar nossos produtos e serviços e bater as metas de vendas da equipe.`,
    responsibilities: ['Atender e prospectar clientes', 'Apresentar produtos, negociar e fechar vendas', 'Acompanhar o pós-venda e manter a carteira ativa', 'Registrar as vendas no sistema e acompanhar as metas'],
    requirements: ['Experiência com vendas', 'Boa comunicação e facilidade de negociação', 'Ensino médio completo'], benefits: [...BASIC_BENEFITS, 'Comissão sobre vendas', 'Premiação por metas'],
    questions: ['experiencia', 'metas', 'atendimento', 'inicio', 'pretensao'], criteria: ['Negociação', 'Comunicação', 'Foco em resultado', 'Experiência anterior'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Conte a melhor venda que você já fez. Como foi?', 'Como você lida com um cliente que diz "está caro"?', 'Qual foi sua maior meta batida e como conseguiu?'] },
  { id: 'atendimento', label: 'Atendimento e varejo', keywords: ['atendente', 'recepcionista', 'operador de caixa', 'caixa', 'repositor', 'balconista', 'fiscal de loja', 'operador de loja', 'atendimento', 'sac', 'telemarketing'], department: 'Atendimento',
    titles: ['Atendente', 'Recepcionista', 'Operador de Caixa', 'Repositor', 'Balconista', 'Fiscal de Loja', 'Operador de Telemarketing', 'Atendente de SAC'],
    summary: (t) => `Procuramos ${t} com boa comunicação e gosto por atender pessoas, para garantir uma ótima experiência aos nossos clientes.`,
    responsibilities: ['Atender clientes com cordialidade e agilidade', 'Tirar dúvidas e resolver solicitações', 'Manter o ambiente organizado', 'Seguir os procedimentos da loja/empresa'],
    requirements: ['Ensino médio completo', 'Boa comunicação', 'Disponibilidade para trabalhar em escala'], benefits: [...BASIC_BENEFITS.slice(0, 2), 'Desconto em compras'],
    questions: ['atendimento', 'escala', 'medio', 'distancia', 'inicio'], criteria: ['Atendimento ao cliente', 'Comunicação', 'Postura e apresentação', 'Pontualidade e assiduidade'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Como você agiria com um cliente irritado?', 'O que é um bom atendimento para você?', 'Tem disponibilidade para fins de semana e feriados?'] },
  { id: 'administrativo', label: 'Administrativo', keywords: ['assistente administrativo', 'auxiliar administrativo', 'administrativo', 'secretaria', 'secretário', 'recepção', 'faturamento', 'compras', 'comprador'], department: 'Administrativo',
    titles: ['Auxiliar Administrativo', 'Assistente Administrativo', 'Analista Administrativo', 'Secretária', 'Assistente de Compras', 'Comprador', 'Assistente de Faturamento'],
    summary: (t) => `Vaga de ${t} para apoiar as rotinas administrativas, organizar documentos e controles e garantir que os processos internos funcionem bem.`,
    responsibilities: ['Organizar documentos, planilhas e arquivos', 'Atender telefone e e-mails', 'Lançar informações no sistema', 'Apoiar as áreas com rotinas administrativas'],
    requirements: ['Ensino médio completo (superior será um diferencial)', 'Pacote Office / planilhas', 'Organização e atenção aos detalhes'], benefits: BASIC_BENEFITS,
    questions: ['experiencia', 'excel', 'escolaridade', 'inicio', 'pretensao'], criteria: ['Organização', 'Conhecimento técnico da função', 'Comunicação', 'Proatividade'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Como você organiza uma rotina com muitas tarefas e prazos?', 'Quais controles ou planilhas você já montou?'] },
  { id: 'financeiro', label: 'Financeiro e contábil', keywords: ['financeiro', 'contas a pagar', 'contas a receber', 'contabil', 'contábil', 'contador', 'fiscal', 'tesouraria', 'controller', 'faturista'], department: 'Financeiro',
    titles: ['Assistente Financeiro', 'Analista Financeiro', 'Auxiliar de Contas a Pagar', 'Analista Contábil', 'Analista Fiscal', 'Contador', 'Controller'],
    summary: (t) => `Contratamos ${t} para cuidar das rotinas financeiras e contábeis com precisão, cumprindo prazos e apoiando as decisões da empresa.`,
    responsibilities: ['Lançar e conciliar contas a pagar e a receber', 'Acompanhar o fluxo de caixa', 'Emitir relatórios financeiros', 'Apoiar o fechamento mensal'],
    requirements: ['Superior em Contabilidade, Administração ou Economia (completo ou cursando)', 'Excel intermediário ou avançado', 'Experiência na área'], benefits: [...BASIC_BENEFITS, 'Participação nos lucros'],
    questions: ['experiencia', 'superior', 'excel', 'sistema', 'pretensao'], criteria: ['Conhecimento técnico da função', 'Organização', 'Raciocínio lógico', 'Experiência anterior'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Como é sua rotina de conciliação bancária?', 'Qual sistema financeiro/ERP você usou e o que fazia nele?'] },
  { id: 'rh', label: 'Recursos Humanos', keywords: ['rh', 'recursos humanos', 'departamento pessoal', 'dp', 'recrutador', 'recrutamento', 'folha de pagamento', 'business partner'], department: 'Recursos Humanos',
    titles: ['Assistente de RH', 'Analista de RH', 'Analista de Departamento Pessoal', 'Recrutador', 'Analista de Recrutamento e Seleção', 'Coordenador de RH'],
    summary: (t) => `Buscamos ${t} para cuidar das pessoas: rotinas de RH e DP, recrutamento, admissão e apoio aos gestores.`,
    responsibilities: ['Conduzir processos de recrutamento e seleção', 'Cuidar de admissões, desligamentos e documentos', 'Apoiar a folha de pagamento e benefícios', 'Atender colaboradores e gestores'],
    requirements: ['Superior em RH, Psicologia ou Administração (completo ou cursando)', 'Experiência na área', 'Conhecimento de legislação trabalhista'], benefits: BASIC_BENEFITS,
    questions: ['experiencia', 'superior', 'excel', 'inicio', 'pretensao'], criteria: ['Conhecimento técnico da função', 'Comunicação', 'Organização', 'Alinhamento com a cultura'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Como você conduz uma entrevista por competências?', 'Já lidou com um desligamento difícil? Como foi?'] },
  { id: 'logistica', label: 'Logística e estoque', keywords: ['estoquista', 'almoxarife', 'conferente', 'separador', 'auxiliar de logistica', 'logística', 'expedição', 'operador de empilhadeira', 'carga e descarga', 'armazém'], department: 'Logística',
    titles: ['Auxiliar de Logística', 'Estoquista', 'Almoxarife', 'Conferente', 'Separador de Mercadorias', 'Operador de Empilhadeira', 'Auxiliar de Carga e Descarga', 'Líder de Logística'],
    summary: (t) => `Contratamos ${t} para atuar no recebimento, armazenagem, separação e expedição de mercadorias com organização e segurança.`,
    responsibilities: ['Receber, conferir e armazenar mercadorias', 'Separar e expedir pedidos', 'Controlar o estoque e fazer inventários', 'Seguir as normas de segurança'],
    requirements: ['Ensino fundamental completo (médio será um diferencial)', 'Disponibilidade de horário', 'Experiência na função será um diferencial'], benefits: [...BASIC_BENEFITS.slice(0, 2), 'Cesta básica'],
    questions: ['experiencia', 'turnos', 'empilhadeira', 'distancia', 'inicio'], criteria: ['Experiência anterior', 'Organização', 'Trabalho em equipe', 'Pontualidade e assiduidade'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Como você evita erros na separação de pedidos?', 'Já trabalhou com coletor ou sistema de estoque?'] },
  { id: 'motorista', label: 'Motorista e entregas', keywords: ['motorista', 'entregador', 'motoboy', 'caminhoneiro', 'condutor', 'ajudante de motorista'], department: 'Logística',
    titles: ['Motorista', 'Motorista Entregador', 'Motorista de Caminhão', 'Motoboy', 'Ajudante de Motorista', 'Motorista Executivo'],
    summary: (t) => `Precisamos de ${t} responsável e cuidadoso para realizar entregas e transportes com segurança e pontualidade.`,
    responsibilities: ['Realizar entregas e transportes nas rotas definidas', 'Conferir mercadorias e documentos', 'Zelar pelo veículo e fazer checklist', 'Atender o cliente na entrega'],
    requirements: ['CNH compatível com o veículo', 'Experiência como motorista', 'Conhecimento da região'], benefits: [...BASIC_BENEFITS.slice(0, 2), 'Seguro de vida'],
    questions: ['cnh', 'ear', 'experiencia', 'distancia', 'inicio'], criteria: ['Experiência anterior', 'Pontualidade e assiduidade', 'Atendimento ao cliente', 'Organização'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Já teve multa ou acidente? O que aconteceu?', 'Como você planeja uma rota com várias entregas?'] },
  { id: 'producao', label: 'Produção e indústria', keywords: ['operador de produção', 'auxiliar de produção', 'produção', 'operador de máquina', 'montador', 'soldador', 'torneiro', 'industria', 'fábrica'], department: 'Produção',
    titles: ['Auxiliar de Produção', 'Operador de Produção', 'Operador de Máquinas', 'Montador', 'Soldador', 'Líder de Produção', 'Supervisor de Produção'],
    summary: (t) => `Vaga de ${t} para atuar na linha de produção seguindo padrões de qualidade, produtividade e segurança.`,
    responsibilities: ['Operar máquinas e equipamentos da linha', 'Seguir as instruções de trabalho e de segurança', 'Controlar a qualidade do que é produzido', 'Manter o posto de trabalho limpo e organizado'],
    requirements: ['Ensino fundamental completo', 'Disponibilidade para turnos', 'Experiência em indústria será um diferencial'], benefits: [...BASIC_BENEFITS, 'Refeição no local'],
    questions: ['experiencia', 'turnos', 'escala', 'distancia', 'inicio'], criteria: ['Experiência anterior', 'Trabalho em equipe', 'Pontualidade e assiduidade', 'Organização'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Quais máquinas você já operou?', 'O que você faz quando percebe um defeito na peça?'] },
  { id: 'manutencao', label: 'Manutenção e elétrica', keywords: ['eletricista', 'mecânico', 'mecanico', 'técnico de manutenção', 'manutenção', 'encanador', 'pedreiro', 'pintor', 'serralheiro', 'refrigeração'], department: 'Manutenção',
    titles: ['Eletricista', 'Eletricista de Manutenção', 'Mecânico', 'Técnico de Manutenção', 'Auxiliar de Manutenção', 'Pedreiro', 'Técnico em Refrigeração'],
    summary: (t) => `Contratamos ${t} para executar manutenções preventivas e corretivas, garantindo o funcionamento seguro de instalações e equipamentos.`,
    responsibilities: ['Fazer manutenção preventiva e corretiva', 'Diagnosticar e resolver falhas', 'Registrar os serviços realizados', 'Seguir as normas de segurança (NRs)'],
    requirements: ['Curso técnico ou experiência comprovada na área', 'NR-10 / NR-35 conforme a função', 'Disponibilidade para plantões'], benefits: [...BASIC_BENEFITS, 'Adicional de periculosidade (quando aplicável)'],
    questions: ['experiencia', 'nr10', 'nr35', 'escala', 'pretensao'], criteria: ['Conhecimento técnico da função', 'Experiência anterior', 'Resolução de problemas', 'Organização'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Conte a manutenção mais difícil que você resolveu.', 'Quais NRs você tem e quando vencem?'] },
  { id: 'limpeza', label: 'Limpeza e conservação', keywords: ['limpeza', 'auxiliar de limpeza', 'faxineira', 'zelador', 'copeira', 'servente', 'serviços gerais', 'camareira', 'jardineiro', 'porteiro'], department: 'Serviços Gerais',
    titles: ['Auxiliar de Limpeza', 'Auxiliar de Serviços Gerais', 'Copeira', 'Zelador', 'Porteiro', 'Camareira', 'Jardineiro'],
    summary: (t) => `Buscamos ${t} caprichoso e responsável para cuidar da limpeza, organização e conservação dos ambientes.`,
    responsibilities: ['Limpar e organizar os ambientes', 'Repor materiais de higiene e copa', 'Usar corretamente produtos e equipamentos', 'Comunicar necessidades de manutenção'],
    requirements: ['Ensino fundamental', 'Experiência na função será um diferencial', 'Disponibilidade de horário'], benefits: [...BASIC_BENEFITS.slice(0, 2), 'Cesta básica'],
    questions: ['experiencia', 'escala', 'distancia', 'inicio'], criteria: ['Experiência anterior', 'Organização', 'Pontualidade e assiduidade', 'Postura e apresentação'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Que produtos de limpeza você sabe usar com segurança?', 'Tem disponibilidade para fins de semana?'] },
  { id: 'alimentacao', label: 'Alimentação e cozinha', keywords: ['cozinheiro', 'auxiliar de cozinha', 'chapeiro', 'garçom', 'garcom', 'padeiro', 'confeiteiro', 'barista', 'pizzaiolo', 'açougueiro', 'nutricionista', 'cozinha', 'lanchonete', 'restaurante'], department: 'Cozinha',
    titles: ['Auxiliar de Cozinha', 'Cozinheiro', 'Chapeiro', 'Garçom', 'Padeiro', 'Confeiteiro', 'Barista', 'Pizzaiolo', 'Açougueiro'],
    summary: (t) => `Vaga de ${t} para preparar e servir com qualidade, higiene e agilidade, seguindo as boas práticas de manipulação de alimentos.`,
    responsibilities: ['Preparar alimentos conforme as fichas técnicas', 'Manter a higiene e a organização da cozinha', 'Controlar validade e armazenamento', 'Atender os pedidos no tempo certo'],
    requirements: ['Experiência na função', 'Curso de boas práticas será um diferencial', 'Disponibilidade para escala'], benefits: [...BASIC_BENEFITS.slice(0, 2), 'Refeição no local'],
    questions: ['experiencia', 'manipulacao', 'escala', 'distancia', 'inicio'], criteria: ['Experiência anterior', 'Organização', 'Trabalho em equipe', 'Pontualidade e assiduidade'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Como você organiza a cozinha num horário de pico?', 'Quais cuidados de higiene você segue sempre?'] },
  { id: 'saude', label: 'Saúde', keywords: ['enfermeiro', 'técnico de enfermagem', 'tecnico de enfermagem', 'auxiliar de enfermagem', 'cuidador', 'farmacêutico', 'farmaceutico', 'balconista de farmácia', 'recepcionista de clínica', 'fisioterapeuta', 'dentista', 'auxiliar de saúde bucal'], department: 'Saúde',
    titles: ['Técnico de Enfermagem', 'Enfermeiro', 'Cuidador de Idosos', 'Farmacêutico', 'Balconista de Farmácia', 'Auxiliar de Saúde Bucal', 'Fisioterapeuta'],
    summary: (t) => `Contratamos ${t} para prestar cuidado humanizado e seguro, seguindo os protocolos da instituição.`,
    responsibilities: ['Prestar assistência conforme os protocolos', 'Registrar os atendimentos', 'Zelar pela segurança do paciente', 'Trabalhar em conjunto com a equipe multiprofissional'],
    requirements: ['Formação na área', 'Registro ativo no conselho de classe', 'Disponibilidade para plantões'], benefits: [...BASIC_BENEFITS, 'Adicional de insalubridade'],
    questions: ['conselho', 'experiencia', 'escala', 'turnos', 'pretensao'], criteria: ['Conhecimento técnico da função', 'Experiência anterior', 'Comunicação', 'Trabalho em equipe'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Conte uma situação de emergência que você atendeu.', 'Como você lida com um paciente ou familiar nervoso?'] },
  { id: 'ti', label: 'Tecnologia', keywords: ['desenvolvedor', 'programador', 'dev', 'analista de sistemas', 'suporte técnico', 'técnico de informática', 'ti', 'dados', 'devops', 'qa', 'front-end', 'back-end', 'full stack', 'infraestrutura'], department: 'Tecnologia',
    titles: ['Desenvolvedor Full Stack', 'Desenvolvedor Front-end', 'Desenvolvedor Back-end', 'Analista de Suporte', 'Técnico de Informática', 'Analista de Dados', 'Analista de QA', 'Analista de Infraestrutura'],
    summary: (t) => `Buscamos ${t} para construir e manter nossas soluções de tecnologia com qualidade, segurança e foco no usuário.`,
    responsibilities: ['Desenvolver e manter sistemas / dar suporte aos usuários', 'Documentar o que foi feito', 'Corrigir falhas e propor melhorias', 'Trabalhar em equipe com as áreas de negócio'],
    requirements: ['Formação em TI (completa ou cursando) ou experiência equivalente', 'Experiência com as tecnologias da vaga', 'Inglês para leitura'], benefits: [...BASIC_BENEFITS, 'Trabalho híbrido ou remoto', 'Auxílio home office'],
    questions: ['experiencia', 'superior', 'ingles', 'pretensao'], criteria: ['Conhecimento técnico da função', 'Raciocínio lógico', 'Resolução de problemas', 'Comunicação'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Conte um projeto do qual você se orgulha. Qual foi sua parte?', 'Como você investiga um erro que só acontece em produção?'], workMode: 'HIBRIDO' },
  { id: 'marketing', label: 'Marketing', keywords: ['marketing', 'social media', 'designer', 'redator', 'mídias sociais', 'conteúdo', 'tráfego', 'trafego'], department: 'Marketing',
    titles: ['Assistente de Marketing', 'Analista de Marketing', 'Social Media', 'Designer Gráfico', 'Analista de Tráfego Pago', 'Redator'],
    summary: (t) => `Contratamos ${t} para fortalecer nossa marca, criar conteúdo e gerar resultados nos canais de comunicação.`,
    responsibilities: ['Planejar e criar conteúdos e campanhas', 'Acompanhar métricas e resultados', 'Cuidar das redes sociais e materiais', 'Apoiar a equipe comercial'],
    requirements: ['Superior em Marketing, Publicidade ou áreas afins (completo ou cursando)', 'Portfólio', 'Domínio de ferramentas da área'], benefits: [...BASIC_BENEFITS, 'Trabalho híbrido'],
    questions: ['experiencia', 'superior', 'pretensao'], criteria: ['Conhecimento técnico da função', 'Proatividade', 'Comunicação', 'Foco em resultado'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Mostre um trabalho do seu portfólio e explique o resultado.', 'Quais métricas você acompanha numa campanha?'] },
  { id: 'gestao', label: 'Gestão e liderança', keywords: ['gerente', 'coordenador', 'supervisor', 'líder', 'lider', 'encarregado', 'diretor', 'gestor', 'chefe'], department: 'Operações',
    titles: ['Supervisor', 'Coordenador', 'Gerente', 'Encarregado', 'Líder de Equipe', 'Gerente de Loja', 'Gerente de Operações'],
    summary: (t) => `Buscamos ${t} para liderar a equipe, acompanhar indicadores e garantir os resultados da área com foco nas pessoas.`,
    responsibilities: ['Liderar, desenvolver e acompanhar a equipe', 'Definir metas e acompanhar indicadores', 'Organizar escalas, processos e prioridades', 'Reportar resultados à diretoria'],
    requirements: ['Experiência em liderança', 'Superior completo (desejável)', 'Boa comunicação e tomada de decisão'], benefits: [...BASIC_BENEFITS, 'Participação nos lucros', 'Bônus por resultado'],
    questions: ['lideranca', 'experiencia', 'superior', 'pretensao'], criteria: ['Liderança', 'Foco em resultado', 'Comunicação', 'Resolução de problemas'],
    guide: [...BASE_GUIDE.slice(0, 2), 'Conte como você lidou com um funcionário com baixo desempenho.', 'Qual indicador você melhorou na sua última liderança e como?'] },
  { id: 'estagio', label: 'Estágio e jovem aprendiz', keywords: ['estagiário', 'estagiario', 'estágio', 'estagio', 'jovem aprendiz', 'aprendiz', 'trainee'], department: 'Administrativo',
    titles: ['Estagiário', 'Estagiário Administrativo', 'Jovem Aprendiz', 'Trainee'], employmentType: 'ESTAGIO',
    summary: (t) => `Vaga de ${t} para quem quer aprender na prática, com acompanhamento e desenvolvimento dentro da empresa.`,
    responsibilities: ['Apoiar a equipe nas rotinas da área', 'Aprender os processos e sistemas', 'Organizar documentos e informações', 'Participar de treinamentos'],
    requirements: ['Estar cursando (estágio) ou ter de 14 a 24 anos (jovem aprendiz)', 'Vontade de aprender', 'Disponibilidade de horário compatível com os estudos'], benefits: ['Bolsa-auxílio', 'Vale-transporte', 'Seguro de vida'],
    questions: ['escolaridade', 'informatica', 'turnos', 'porque'], criteria: ['Proatividade', 'Comunicação', 'Alinhamento com a cultura', 'Organização'],
    guide: ['O que você está estudando e o que mais gosta?', 'Por que quer começar por esta área?', 'Conte uma situação em que você aprendeu algo rápido.'] },
];

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Modelo do cargo pelo titulo (palavra-chave); null se nao reconhecer. */
export function templateForTitle(title: string): RoleTemplate | null {
  const value = ` ${fold(title)} `;
  let best: { template: RoleTemplate; size: number } | null = null;
  for (const template of ROLE_TEMPLATES) {
    for (const keyword of template.keywords) {
      const key = fold(keyword);
      // Comeco de palavra: "vendedor externo" casa com "vendedor"; "dev" nao casa dentro de "desenvolvedor".
      if (value.includes(` ${key} `) || (key.length > 4 && value.includes(` ${key}`))) {
        if (!best || key.length > best.size) best = { template, size: key.length };
      }
    }
  }
  return best?.template ?? null;
}

/** Catalogo de titulos (sugestoes do campo Cargo). */
export const TITLE_CATALOG: { title: string; family: string }[] = ROLE_TEMPLATES.flatMap((template) => template.titles.map((title) => ({ title, family: template.label })));

/** Texto pronto da vaga a partir do cargo (o RH so revisa). */
export function draftFromTemplate(title: string, template: RoleTemplate) {
  const description = [
    template.summary(title),
    '',
    'O que você vai fazer:',
    ...template.responsibilities.map((item) => `• ${item}`),
  ].join('\n');
  return {
    description,
    requirements: template.requirements,
    benefits: template.benefits,
    department: template.department,
    criteria: template.criteria.map((name) => CRITERIA_LIBRARY.find((item) => item.name === name) ?? { name, weight: 2 }),
    questions: template.questions,
    guide: template.guide,
    employmentType: template.employmentType,
    workMode: template.workMode,
  };
}

export const BENEFIT_SUGGESTIONS = ['Vale-transporte', 'Vale-refeição', 'Vale-alimentação', 'Plano de saúde', 'Plano odontológico', 'Seguro de vida', 'Participação nos lucros', 'Comissão', 'Cesta básica', 'Refeição no local', 'Auxílio home office', 'Gympass / Wellhub', 'Day off no aniversário', 'Convênio farmácia'];
