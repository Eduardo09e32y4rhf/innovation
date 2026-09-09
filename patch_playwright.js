const fs = require('fs');
const file = 'tests-e2e/playwright.config.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "command: 'npm run dev:web -- --port 3000',",
  "command: 'npm --prefix ../apps/web run dev -- --port 3000',"
);
fs.writeFileSync(file, content);
console.log('Patched', file);
