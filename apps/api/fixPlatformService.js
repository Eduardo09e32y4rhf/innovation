const fs = require('fs');

const serviceFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/platform/platform.service.ts';
let code = fs.readFileSync(serviceFile, 'utf8');

// Update createCompanyWithAdmin
const trialEndsAtStr = `
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);
`;
code = code.replace(
  "const adminPasswordHash = await bcrypt.hash(dto.adminPassword, 12);",
  trialEndsAtStr + "\n    const adminPasswordHash = await bcrypt.hash(dto.adminPassword, 12);"
);

code = code.replace(
  "commercialOwnerId: actor.role === 'COMERCIAL' ? actor.sub : null,",
  "commercialOwnerId: actor.role === 'COMERCIAL' ? actor.sub : null,\n        plan: 'FREE',\n        billingStatus: 'TRIAL',\n        trialEndsAt,"
);

// Update updateCompany
code = code.replace(
  "const { name, document, ...rest } = dto;",
  "const { name, document, plan, billingStatus, trialEndsAt, ...rest } = dto;"
);

code = code.replace(
  "...(status === 'ACTIVE' ? { suspensionReason: null } : {}),",
  "...(status === 'ACTIVE' ? { suspensionReason: null } : {}),\n      ...(plan ? { plan } : {}),\n      ...(billingStatus ? { billingStatus } : {}),\n      ...(trialEndsAt !== undefined ? { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null } : {}),"
);

fs.writeFileSync(serviceFile, code);
console.log('Fixed platform.service.ts');
