const fs = require('fs');
const path = 'C:\\Users\\eduar\\.gemini\\antigravity\\brain\\a93dbdda-01e4-499a-b06b-2755d86d2cde\\escopo_innovation_ia.md';

let badUtf8 = fs.readFileSync(path, 'utf8');
let buffer = Buffer.from(badUtf8, 'latin1');
let fixed = buffer.toString('utf8');

fs.writeFileSync(path + '.fixed.md', fixed, 'utf8');
console.log('Fixed saved');
