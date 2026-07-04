const fs = require('fs');

const repoFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/platform/platform.repository.ts';
let code = fs.readFileSync(repoFile, 'utf8');

// 1. Update listCompanies
code = code.replace(
  "subscriptionStartedAt: c.subscriptionStartedAt,",
  "subscriptionStartedAt: c.subscriptionStartedAt,\n      plan: c.plan,\n      billingStatus: c.billingStatus,\n      trialEndsAt: c.trialEndsAt,"
);

// 2. Update createCompanyWithAdmin params
code = code.replace(
  "commercialOwnerId?: string | null;\n  }) {",
  "commercialOwnerId?: string | null;\n    plan?: 'FREE' | 'STARTER' | 'PRO';\n    billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';\n    trialEndsAt?: Date;\n  }) {"
);

// 3. Update company creation data
code = code.replace(
  "commercialOwnerId: params.commercialOwnerId ?? null,\n          status: 'ACTIVE',\n          isActive: true,",
  "commercialOwnerId: params.commercialOwnerId ?? null,\n          status: 'ACTIVE',\n          isActive: true,\n          plan: params.plan ?? 'FREE',\n          billingStatus: params.billingStatus ?? 'TRIAL',\n          trialEndsAt: params.trialEndsAt,"
);

fs.writeFileSync(repoFile, code);
console.log('Fixed platform.repository.ts natively');
