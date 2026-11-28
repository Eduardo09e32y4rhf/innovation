// Server-only, original educational items. Never import this file from the web app.
export type BankQuestion = { id: string; subject: 'PORTUGUESE' | 'MATH'; topic: string; text: string; options: string[]; correct: number; explanation: string };
export const BANK_VERSION = 1;
const bank: BankQuestion[] = [];
function add(subject: BankQuestion['subject'], topic: string, text: string, answer: string, distractors: string[], explanation: string) {
  const index = bank.length;
  const options = [...new Set(distractors.filter(value => value !== answer))].slice(0, 4);
  if (options.length !== 4) throw new Error(`Four distinct distractors required: ${text}`);
  const correct = index % 5;
  options.splice(correct, 0, answer);
  bank.push({ id: `${subject}-${String(index + 1).padStart(3, '0')}`, subject, topic, text, options, correct, explanation });
}

// Each row includes the answer and four deliberately incorrect alternatives.
const grammar: [string, string, string, string[]][] = [
  ['Ortografia', 'Qual palavra está escrita corretamente?', 'exceção', ['excessão', 'esceção', 'exseção', 'exeção']],
  ['Ortografia', 'Qual é a grafia correta do verbo que significa pesquisar?', 'pesquisar', ['pesquizar', 'pezquisar', 'peskisar', 'pesqisar']],
  ['Ortografia', 'Qual é a grafia correta do substantivo que indica uma viagem de exploração?', 'expedição', ['espedição', 'expedissão', 'expedissãu', 'expedizão']],
  ['Ortografia', 'Qual é a grafia correta do substantivo que indica uma autorização?', 'permissão', ['permição', 'permissam', 'permisão', 'permizão']],
  ['Ortografia', 'Qual palavra designa corretamente uma pessoa que analisa?', 'analista', ['analizta', 'annalista', 'anallista', 'analhista']],
  ['Acentuação', 'Qual palavra é proparoxítona?', 'lâmpada', ['café', 'papel', 'mesa', 'jardim']],
  ['Acentuação', 'Qual palavra é oxítona?', 'café', ['árvore', 'mesa', 'lápis', 'médico']],
  ['Acentuação', 'Qual palavra é paroxítona?', 'cadeira', ['sofá', 'cipó', 'médico', 'lâmpada']],
  ['Acentuação', 'Qual forma está corretamente acentuada?', 'saúde', ['sáude', 'saudé', 'sâude', 'saudê']],
  ['Acentuação', 'Qual é a grafia atual correta?', 'ideia', ['idéia', 'idêia', 'ídeia', 'ideía']],
  ['Concordância', 'Complete: As propostas ___ prontas.', 'estão', ['está', 'estamos', 'estou', 'estavas']],
  ['Concordância', 'Complete: Nós ___ o relatório ontem.', 'entregamos', ['entregou', 'entregaram', 'entreguei', 'entregas']],
  ['Concordância', 'Complete: ___ duas horas que aguardamos.', 'Faz', ['Fazem', 'Fazemos', 'Faço', 'Fazes']],
  ['Concordância', 'Complete: ___ muitos documentos na sala.', 'Há', ['Hão', 'Havemos', 'Hei', 'Hás']],
  ['Concordância', 'Complete: Seguem ___ as notas fiscais.', 'anexas', ['anexo', 'anexado', 'anexa', 'anexos']],
  ['Crase', 'Complete: A reunião começa ___ oito horas.', 'às', ['as', 'a', 'à', 'há']],
  ['Crase', 'Complete: Entreguei o documento ___ diretora.', 'à', ['há', 'às', 'as', 'aos']],
  ['Crase', 'Complete: Começamos ___ trabalhar cedo.', 'a', ['à', 'às', 'há', 'as']],
  ['Crase', 'Complete: O atendimento funciona de segunda ___ sexta.', 'a', ['à', 'às', 'há', 'as']],
  ['Crase', 'Complete: Ela saiu ___ pressas.', 'às', ['as', 'a', 'há', 'à']],
  ['Porquês', 'Complete a pergunta: ___ você chegou cedo?', 'Por que', ['Porque', 'Porquê', 'Por quê', 'Pôrque']],
  ['Porquês', 'Complete: Cheguei cedo ___ havia uma reunião.', 'porque', ['por que', 'porquê', 'por quê', 'pôrque']],
  ['Porquês', 'Complete: Não entendi o ___ da mudança.', 'porquê', ['porque', 'por que', 'por quê', 'pôrque']],
  ['Porquês', 'Complete: Você saiu cedo ___?', 'por quê', ['porque', 'porquê', 'por que', 'pôrque']],
  ['Uso das palavras', 'Complete: Ela se sentiu ___ depois da refeição.', 'mal', ['mau', 'maus', 'más', 'má']],
  ['Uso das palavras', 'Complete: O equipamento apresentou ___ funcionamento.', 'mau', ['mal', 'má', 'más', 'maus']],
  ['Uso das palavras', 'Complete: Quero participar, ___ não posso hoje.', 'mas', ['mais', 'más', 'maís', 'mãs']],
  ['Uso das palavras', 'Complete: Precisamos de ___ tempo para terminar.', 'mais', ['mas', 'más', 'maís', 'mãs']],
  ['Uso das palavras', 'Complete: Daqui ___ dois dias teremos reunião.', 'a', ['há', 'à', 'às', 'as']],
  ['Uso das palavras', 'Complete: Trabalho aqui ___ dois anos.', 'há', ['a', 'à', 'às', 'as']],
  ['Plural', 'Qual é o plural de cidadão?', 'cidadãos', ['cidadões', 'cidadães', 'cidadãoses', 'cidadãoes']],
  ['Plural', 'Qual é o plural de papel?', 'papéis', ['papels', 'papeis', 'papeles', 'papéls']],
  ['Plural', 'Qual é o plural de animal?', 'animais', ['animals', 'animales', 'animáls', 'animãos']],
  ['Plural', 'Qual é o plural de mês?', 'meses', ['mêses', 'mês', 'mêsesos', 'mesis']],
  ['Plural', 'Qual é o plural de ação?', 'ações', ['açãos', 'açães', 'açãoes', 'açõens']],
  ['Classes de palavras', 'Em “A equipe trabalhou rapidamente”, qual palavra é advérbio?', 'rapidamente', ['A', 'equipe', 'trabalhou', 'Nenhuma']],
  ['Classes de palavras', 'Em “O relatório está completo”, qual palavra é adjetivo?', 'completo', ['O', 'relatório', 'está', 'Nenhuma']],
  ['Classes de palavras', 'Em “Nós organizamos os arquivos”, qual palavra é pronome?', 'Nós', ['organizamos', 'os', 'arquivos', 'Nenhuma']],
  ['Classes de palavras', 'Em “A gerente revisou tudo”, qual palavra é verbo?', 'revisou', ['A', 'gerente', 'tudo', 'Nenhuma']],
  ['Classes de palavras', 'Em “Ana e Bruno chegaram”, qual palavra é conjunção?', 'e', ['Ana', 'Bruno', 'chegaram', 'Nenhuma']],
  ['Pontuação', 'Qual frase usa corretamente a vírgula para separar o vocativo?', 'Maria, envie o relatório.', ['Maria envie, o relatório.', 'Maria envie o, relatório.', 'Maria envie o relatório,', 'Maria envie o relatório.']],
  ['Pontuação', 'Qual frase evita separar sujeito e verbo por vírgula?', 'A equipe concluiu o projeto.', ['A equipe, concluiu o projeto.', 'A, equipe concluiu o projeto.', 'A equipe concluiu, o projeto.', 'A equipe concluiu o, projeto.']],
  ['Verbos', 'Qual forma indica uma ação futura?', 'entregaremos', ['entregamos ontem', 'entregávamos', 'entreguei', 'entregaram ontem']],
  ['Verbos', 'Qual forma está no infinitivo?', 'organizar', ['organizo', 'organizou', 'organizam', 'organizamos']],
  ['Verbos', 'Complete: Se eu ___ tempo, revisaria o texto.', 'tivesse', ['tenho', 'terei', 'teve', 'tivemos']],
  ['Coesão', 'Qual expressão introduz uma conclusão?', 'portanto', ['embora', 'apesar de', 'enquanto', 'caso']],
  ['Coesão', 'Qual palavra introduz uma condição?', 'se', ['portanto', 'porém', 'também', 'logo']],
  ['Coesão', 'Qual palavra expressa oposição?', 'porém', ['portanto', 'também', 'pois', 'logo']],
  ['Semântica', 'Qual é o antônimo de provisório?', 'permanente', ['temporário', 'passageiro', 'transitório', 'momentâneo']],
  ['Semântica', 'Qual é o sinônimo de conciso?', 'sucinto', ['extenso', 'confuso', 'prolixo', 'demorado']],
];
for (const [topic, text, answer, distractors] of grammar) add('PORTUGUESE', topic, text, answer, distractors, `A forma adequada neste contexto é “${answer}”.`);

// Forty original notices, five reading tasks per notice. Information is explicit;
// no external knowledge, personal beliefs or ambiguous inference is scored.
const notices = [
  ['biblioteca', 'devolver os livros', 'balcão de empréstimos', 'organizar o acervo'],
  ['oficina', 'conferir as ferramentas', 'bancada principal', 'preparar o atendimento'],
  ['escola', 'entregar os materiais', 'secretaria', 'montar os kits'],
  ['loja', 'separar os pedidos', 'área de expedição', 'agilizar as entregas'],
  ['escritório', 'revisar os relatórios', 'sala de reuniões', 'preparar a apresentação'],
  ['restaurante', 'conferir os ingredientes', 'cozinha', 'planejar o cardápio'],
  ['centro esportivo', 'guardar as bolas', 'depósito', 'liberar a quadra'],
  ['museu', 'organizar os folhetos', 'recepção', 'orientar os visitantes'],
];
const names = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa'];
for (let context = 0; context < notices.length; context++) for (let variant = 0; variant < 5; variant++) {
  const [place, action, location, purpose] = notices[context];
  const day = 10 + context + variant;
  const hour = 8 + variant;
  const person = names[variant];
  const passage = `Leia o aviso: “No dia ${day}, às ${hour} horas, ${person} deverá ${action} na unidade ${context + 1} (${place}). A atividade acontecerá no local indicado: ${location}. O objetivo é ${purpose}. Somente ${person} ficará responsável pela atividade.”`;
  add('PORTUGUESE', 'Interpretação: responsável', `${passage}\nQuem é responsável pela atividade?`, person, names.filter(name => name !== person), `O aviso atribui a responsabilidade somente a ${person}.`);
  add('PORTUGUESE', 'Interpretação: data', `${passage}\nEm que dia a atividade ocorrerá?`, `Dia ${day}`, [1, 2, 3, 4].map(n => `Dia ${day + n}`), `O texto informa “No dia ${day}”.`);
  add('PORTUGUESE', 'Interpretação: horário', `${passage}\nQual é o horário informado?`, `${hour} horas`, [1, 2, 3, 4].map(n => `${hour + n} horas`), `O horário explícito é ${hour} horas.`);
  add('PORTUGUESE', 'Interpretação: finalidade', `${passage}\nQual é a finalidade declarada?`, purpose, notices.filter((_, i) => i !== context).slice(0, 4).map(row => row[3]), `O objetivo declarado é ${purpose}.`);
  add('PORTUGUESE', 'Interpretação: local', `${passage}\nEm qual local específico acontecerá a atividade?`, location, notices.filter((_, i) => i !== context).slice(0, 4).map(row => row[2]), `O local indicado é ${location}.`);
}

const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2, useGrouping: false });
function math(topic: string, text: string, result: number, explanation: string, unit = '') {
  const answer = `${number(result)}${unit}`;
  add('MATH', topic, text, answer, [-2, -1, 1, 2].map(offset => `${number(result + offset)}${unit}`), explanation);
}
for (let n = 1; n <= 10; n++) {
  math('Adição', `Um estoque tinha ${30 + n} caixas e recebeu ${12 + n}. Quantas caixas há agora?`, 42 + 2 * n, `Some ${30 + n} e ${12 + n}.`);
  math('Subtração', `Havia ${80 + n} unidades. Foram vendidas ${20 + n}. Quantas restaram?`, 60, `Subtraia ${20 + n} de ${80 + n}.`);
  math('Multiplicação', `Há ${n + 2} pacotes com 12 peças cada. Quantas peças há ao todo?`, (n + 2) * 12, `Multiplique ${n + 2} por 12.`);
  math('Divisão', `${(n + 3) * 8} peças serão divididas igualmente em 8 caixas. Quantas peças ficam em cada caixa?`, n + 3, `Divida ${(n + 3) * 8} por 8.`);
  math('Porcentagem', `Quanto é 10% de ${n * 100 + 200}?`, n * 10 + 20, 'Divida o total por 10.');
  math('Desconto', `Um produto custa R$ ${n * 20 + 100} e recebe desconto de 25%. Qual é o preço final em reais?`, (n * 20 + 100) * .75, 'Multiplique o preço por 0,75.');
  math('Acréscimo', `Um serviço de R$ ${n * 50 + 200} terá acréscimo de 10%. Qual será o valor em reais?`, (n * 50 + 200) * 1.1, 'Multiplique o valor por 1,10.');
  math('Média', `Qual é a média aritmética de ${n + 4}, ${n + 6} e ${n + 8}?`, n + 6, 'Some os três valores e divida por 3.');
  math('Mediana', `Qual é a mediana de ${n + 1}, ${n + 3}, ${n + 9}, ${n + 10} e ${n + 20}?`, n + 9, 'Em cinco valores ordenados, a mediana é o terceiro.');
  math('Proporção', `Se 3 cadernos custam R$ 24, quanto custam ${n + 4} cadernos iguais, em reais?`, (n + 4) * 8, 'Cada caderno custa 24 ÷ 3 = 8 reais.');
  math('Tempo', `Uma atividade dura ${n + 1} horas e 15 minutos. Quantos minutos são?`, (n + 1) * 60 + 15, 'Multiplique as horas por 60 e acrescente 15.');
  math('Comprimento', `Uma fita mede ${n + 2} metros. Quantos centímetros ela mede?`, (n + 2) * 100, 'Cada metro corresponde a 100 centímetros.');
  math('Área', `Um retângulo mede ${n + 2} metros de largura e 5 metros de comprimento. Qual é a área em metros quadrados?`, (n + 2) * 5, 'A área é largura × comprimento.');
  math('Perímetro', `Um retângulo tem lados de ${n + 3} metros e 4 metros. Qual é o perímetro em metros?`, 2 * (n + 7), 'Some os quatro lados: 2 × (largura + comprimento).');
  math('Volume', `Uma caixa mede ${n + 1} cm por 3 cm por 4 cm. Qual é o volume em centímetros cúbicos?`, (n + 1) * 12, 'Multiplique comprimento, largura e altura.');
  math('Equação', `Resolva: x + ${n + 3} = ${n * 3 + 15}. Qual é x?`, n * 2 + 12, `Subtraia ${n + 3} dos dois lados.`);
  math('Equação', `Resolva: 3x = ${(n + 2) * 3}. Qual é x?`, n + 2, 'Divida os dois lados por 3.');
  math('Frações', `Quanto é a metade de ${2 * (n + 10)} somada a 3?`, n + 13, 'Divida o número por 2 e acrescente 3.');
  math('Frações', `Quanto é três quartos de ${4 * (n + 5)}?`, 3 * (n + 5), 'Divida o total por 4 e multiplique por 3.');
  math('Troco', `Uma compra custa R$ ${n + 25}. O pagamento foi de R$ 50. Qual é o troco em reais?`, 25 - n, 'Subtraia o preço pago de 50.');
  math('Velocidade média', `Um veículo percorre ${n * 20 + 100} km em 2 horas. Qual é a velocidade média em km/h?`, n * 10 + 50, 'Divida a distância pelo tempo.');
  math('Juros simples', `Um capital de R$ ${n * 100 + 500} rende juros simples de 2% ao mês durante 3 meses. Qual é apenas o valor dos juros, em reais?`, (n * 100 + 500) * .06, 'Juros simples = capital × 0,02 × 3.');
  math('Probabilidade', `Uma caixa contém ${n + 2} bolas azuis e ${n + 2} bolas vermelhas. Qual é a probabilidade percentual de tirar uma bola azul ao acaso?`, 50, 'Metade das bolas é azul; a probabilidade é 50%.', '%');
  math('Sequência', `Qual número vem a seguir na sequência ${n}, ${n + 3}, ${n + 6}, ${n + 9}, ...?`, n + 12, 'A sequência aumenta de 3 em 3.');
  math('Produtividade', `Uma máquina faz ${n + 5} peças por minuto, em ritmo constante. Quantas peças fará em 6 minutos?`, (n + 5) * 6, 'Multiplique a produção por minuto por 6.');
}
if (bank.length !== 500) throw new Error(`Expected 500 questions; found ${bank.length}`);
export const QUESTION_BANK: readonly BankQuestion[] = bank;
