const { execSync } = require('child_process');
const fs = require('fs');

const oldSchema = execSync('git show 576257e4:apps/api/prisma/schema.prisma').toString();
fs.writeFileSync('C:/Users/eduar/Desktop/innovation.ia/apps/api/prisma/schema.old.prisma', oldSchema);
console.log('Old schema dumped');
