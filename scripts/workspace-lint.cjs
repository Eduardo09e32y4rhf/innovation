const fs = require('fs');
const path = require('path');

const required = [
  'package.json',
  'tsconfig.base.json',
  'tsconfig.json',
  '.npmrc',
  'scripts/workspace-bootstrap.cjs'
];

let missing = 0;
for (const file of required) {
  if (!fs.existsSync(path.join(process.cwd(), file))) {
    console.error(`Missing required file: ${file}`);
    missing += 1;
  }
}

if (missing > 0) process.exit(1);
console.log('Root workspace foundation files are present.');
