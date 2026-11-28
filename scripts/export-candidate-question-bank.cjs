// Private editorial export. Never place the answer key in public/ or a web bundle.
const fs = require('node:fs');
const path = require('node:path');
const { QUESTION_BANK, BANK_VERSION } = require('../apps/api/dist/modules/jobs/candidate-question-bank');
const directory = path.resolve(__dirname, '../storage/qa/portal-candidato');
fs.mkdirSync(directory, { recursive: true });
const quote = value => `"${String(value).replaceAll('"', '""')}"`;
const rows = [['ID', 'Matéria', 'Assunto', 'Enunciado', 'A', 'B', 'C', 'D', 'E', 'Gabarito', 'Explicação'], ...QUESTION_BANK.map(item => [item.id, item.subject === 'MATH' ? 'Matemática' : 'Português', item.topic, item.text, ...item.options, 'ABCDE'[item.correct], item.explanation])];
fs.writeFileSync(path.join(directory, `banco-500-gabarito-v${BANK_VERSION}.csv`), '\uFEFF' + rows.map(row => row.map(quote).join(';')).join('\r\n'), 'utf8');
console.log(`${QUESTION_BANK.length} questões exportadas para storage/qa/portal-candidato/banco-500-gabarito-v${BANK_VERSION}.csv`);
