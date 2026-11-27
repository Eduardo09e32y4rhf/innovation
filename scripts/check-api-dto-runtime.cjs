// Load emitted decorator metadata, which type checking alone cannot validate.
// No bootstrap, database connection or environment files are needed.
require('reflect-metadata');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');

const dist = path.resolve(__dirname, '../apps/api/dist');
function findDtos(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? findDtos(file) : entry.name.endsWith('.dto.js') ? [file] : [];
  });
}
const files = findDtos(dist);
assert.ok(files.length > 0, 'Build the API before checking its DTOs');
for (const file of files) require(file);

const { QuestionInputDto } = require(path.join(dist, 'modules/jobs/dto/recruitment.dto.js'));
const valid = plainToInstance(QuestionInputDto, {
  label: 'Pergunta', type: 'SELECT',
  translations: { en: { label: 'Question', options: ['Yes'] }, es: { label: 'Pregunta' } },
});
assert.deepEqual(validateSync(valid), []);
assert.equal(Reflect.getMetadata('design:type', QuestionInputDto.prototype, 'translations'), valid.translations.constructor);
for (const language of ['en', 'es']) {
  const invalid = plainToInstance(QuestionInputDto, {
    label: 'Pergunta', type: 'SELECT', translations: { [language]: { label: 123, options: [123] } },
  });
  const errors = validateSync(invalid);
  const nested = errors.find((error) => error.property === 'translations')?.children
    ?.find((error) => error.property === language)?.children;
  assert.ok(nested?.some((error) => error.property === 'label'));
  assert.ok(nested?.some((error) => error.property === 'options'));
}
console.log(`API runtime: ${files.length} compiled DTO files loaded; nested translations validated.`);
