const fs = require('fs');

const apiFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/web/app/lib/api.ts';
let code = fs.readFileSync(apiFile, 'utf8');

// Interface
code = code.replace(
  "subscriptionStartedAt?: string; suspensionReason?: string | null;",
  "subscriptionStartedAt?: string; suspensionReason?: string | null;\n    plan?: 'FREE' | 'STARTER' | 'PRO';\n    billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';\n    trialEndsAt?: string | null;"
);

// Method signature
code = code.replace(
  "updateCompany: (id: string, input: Partial<Omit<CreatePlatformCompanyInput, 'adminName' | 'adminEmail' | 'adminPassword'>> & { isActive?: boolean; status?: CompanyStatus; suspensionReason?: string | null }) =>",
  "updateCompany: (id: string, input: Partial<Omit<CreatePlatformCompanyInput, 'adminName' | 'adminEmail' | 'adminPassword'>> & { isActive?: boolean; status?: CompanyStatus; suspensionReason?: string | null; plan?: 'FREE' | 'STARTER' | 'PRO'; billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'; trialEndsAt?: string }) =>"
);

fs.writeFileSync(apiFile, code);
console.log('Fixed api.ts');
