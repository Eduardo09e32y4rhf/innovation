const fs = require('fs');

const repoFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/companies/companies.repository.ts';
let repoCode = fs.readFileSync(repoFile, 'utf8');

repoCode = repoCode.replace(
  "type: h.type || 'NACIONAL',",
  "scope: h.scope || 'NATIONAL',\n            handling: h.handling || 'PAID_100',"
);

fs.writeFileSync(repoFile, repoCode);
console.log('Fixed companies.repository.ts');
