const fs = require('node:fs');
const path = require('node:path');

const mojibake = /(?:Ã[^\x00-\x7F]|Â[\x80-\xFF]|�|â[€„‚™œ”—š])/;
const cp1252 = new Map(Object.entries({
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
  'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E,
  '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F,
}));

function bytesFromWindows1252(value) {
  return Buffer.from([...value].map((char) => cp1252.get(char) ?? char.charCodeAt(0) & 0xFF));
}

function filesChangedFromHead() {
  const output = require('node:child_process').execFileSync('git', ['diff', '--name-only', '--', 'apps/web', 'apps/api'], { encoding: 'utf8' });
  return output.split(/\r?\n/).filter(Boolean).filter((file) => /\.(ts|tsx|js|jsx|json|css|md)$/.test(file));
}

function repairToken(token) {
  let current = token;
  for (let pass = 0; pass < 4; pass += 1) {
    if (!mojibake.test(current)) break;
    const next = bytesFromWindows1252(current).toString('utf8');
    if (next === current || next.replace(mojibake, '').length === current.replace(mojibake, '').length) break;
    current = next;
  }
  return current;
}

let changedFiles = 0;
let changedTokens = 0;
for (const file of filesChangedFromHead()) {
    const relative = file.replaceAll('\\', '/');
    const before = require('node:child_process').execFileSync('git', ['show', `HEAD:${relative}`], { encoding: 'utf8' });
    const after = before.replace(/\S+/g, (token) => {
      const repaired = repairToken(token);
      if (repaired !== token) changedTokens += 1;
      return repaired;
    });
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changedFiles += 1;
      console.log(file);
    }
}
console.log(`Arquivos corrigidos: ${changedFiles}; trechos corrigidos: ${changedTokens}`);
