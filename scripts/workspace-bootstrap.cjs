const fs = require('fs');
const path = require('path');

const dirs = [
  'packages',
  'packages/apps',
  'packages/libs',
  'packages/shared',
  'apps',
  'apps/web',
  'apps/desktop',
  'apps/api',
  'tools'
];

for (const dir of dirs) {
  fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
}

console.log('Workspace foundation directories verified.');
