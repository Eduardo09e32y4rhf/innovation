const fs = require('fs');

const repoFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/platform/platform.repository.ts';
let code = fs.readFileSync(repoFile, 'utf8');

code = code.replace(
  "commercialOwnerId?: string | null;",
  "commercialOwnerId?: string | null;\n      plan?: 'FREE' | 'STARTER' | 'PRO';\n      billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';\n      trialEndsAt?: Date;"
);

code = code.replace(
  "isActive: true,",
  "isActive: true,\n            plan: params.plan ?? 'FREE',\n            billingStatus: params.billingStatus ?? 'TRIAL',\n            trialEndsAt: params.trialEndsAt,"
);

fs.writeFileSync(repoFile, code);
console.log('Fixed platform.repository.ts');
