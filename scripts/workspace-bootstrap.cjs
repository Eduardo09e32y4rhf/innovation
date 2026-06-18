const fs = require('fs');
const path = require('path');

const dirs = [
  'apps',
  'apps/web',
  'apps/api',
  'docs',
  'infra',
  'scripts',
  'storage',
  'storage/whatsapp',
  'storage/whatsapp-media'
];

for (const dir of dirs) {
  fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
}

console.log('Workspace foundation directories verified.');
