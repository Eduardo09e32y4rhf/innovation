const fs = require('fs');

const apiFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/web/app/lib/api.ts';
let code = fs.readFileSync(apiFile, 'utf8');

code = code.replace(
  "subscriptionStartedAt?: string; suspensionReason?: string | null;",
  "subscriptionStartedAt?: string; suspensionReason?: string | null;\n  plan?: 'FREE' | 'STARTER' | 'PRO';\n  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';\n  trialEndsAt?: string | null;"
);

fs.writeFileSync(apiFile, code);
console.log('Fixed api.ts');
