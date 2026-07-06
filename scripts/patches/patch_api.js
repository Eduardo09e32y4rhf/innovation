const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [target, replacement] of replacements) {
        content = content.split(target).join(replacement);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

const apiSrc = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src';

// Fix users.repository.ts
replaceInFile(path.join(apiSrc, 'modules/users/users.repository.ts'), [
    ['select: { maxUsers: true, maxEmployees: true, isActive: true },', 'select: { plan: true, status: true, billingStatus: true },']
]);

// Fix users.service.ts
replaceInFile(path.join(apiSrc, 'modules/users/users.service.ts'), [
    ['const maxUsers = limits?.maxUsers ?? 6;', 'const maxUsers = limits?.plan === \'PRO\' ? 9999 : limits?.plan === \'STARTER\' ? 20 : 6;'],
    ['return { used: count, max: limits?.maxUsers ?? 6 };', 'return { used: count, max: limits?.plan === \'PRO\' ? 9999 : limits?.plan === \'STARTER\' ? 20 : 6 };']
]);

// Fix platform.repository.ts
replaceInFile(path.join(apiSrc, 'modules/platform/platform.repository.ts'), [
    ['maxUsers: c.maxUsers,\n      maxEmployees: c.maxEmployees,\n      isActive: c.isActive,', 'plan: c.plan,\n      billingStatus: c.billingStatus,'],
    ['maxUsers: number;\n    maxEmployees: number;', 'plan?: string;\n    billingStatus?: string;'],
    ['maxUsers: params.maxUsers,\n          maxEmployees: params.maxEmployees,\n          commercialOwnerId: params.commercialOwnerId ?? null,\n          status: \'ACTIVE\',\n          isActive: true,', 'commercialOwnerId: params.commercialOwnerId ?? null,\n          status: \'ACTIVE\','],
    ['maxUsers: params.maxUsers,\n          maxEmployees: params.maxEmployees,\n          commercialOwnerId: params.commercialOwnerId ?? null,\n          status: \'ACTIVE\',', 'commercialOwnerId: params.commercialOwnerId ?? null,\n          status: \'ACTIVE\',']
]);

// Fix platform.service.ts
replaceInFile(path.join(apiSrc, 'modules/platform/platform.service.ts'), [
    ['maxUsers: dto.maxUsers ?? 6,\n      maxEmployees: dto.maxEmployees ?? 50,', 'plan: dto.plan,\n      billingStatus: dto.billingStatus,'],
    ['...(status ? { status, isActive: status === \'ACTIVE\' } : {}),', '...(status ? { status } : {}),'],
    ['if (count >= company.maxUsers) {', 'if (count >= (company.plan === \'PRO\' ? 9999 : company.plan === \'STARTER\' ? 20 : 6)) {'],
    ['throw new ForbiddenException(`Limite de ${company.maxUsers} usuarios atingido para esta empresa.`);', 'throw new ForbiddenException(`Limite de usuarios atingido para esta empresa.`);'],
    ['const status = dto.status ?? (dto.isActive === false ? \'SUSPENDED\' : dto.isActive === true ? \'ACTIVE\' : undefined);', 'const status = dto.status;']
]);

// Fix update-platform-company.dto.ts
replaceInFile(path.join(apiSrc, 'modules/platform/dto/update-platform-company.dto.ts'), [
    ['maxUsers?: number;', 'plan?: any;'],
    ['maxEmployees?: number;', 'billingStatus?: any;'],
    ['isActive?: boolean;', '']
]);

console.log('Done!');
