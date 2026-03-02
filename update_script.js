const fs = require('fs');
const path = './frontend/app/(app)/rh/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// Ensure import if sed failed or didn't exist
if (!content.includes('import { BiometricPunch }')) {
    content = content.replace("import { Sidebar } from '@/components/Sidebar';", "import { Sidebar } from '@/components/Sidebar';\nimport { BiometricPunch } from '@/components/rh/BiometricPunch';");
}

// Update the type
content = content.replace(
    /useState<'ats' \| '360' \| 'pdi' \| 'timebank' \| 'payslips' \| 'gamification' \| 'pulse'>\('ats'\)/g,
    "useState<'ats' | '360' | 'pdi' | 'timebank' | 'payslips' | 'gamification' | 'pulse' | 'punch'>('ats')"
);

// Update TABS
content = content.replace(
    /{ key: 'timebank' as const, label: '⏱ Banco de Horas' },/g,
    "{ key: 'punch' as const, label: '📍 Ponto Biométrico' },\n        { key: 'timebank' as const, label: '⏱ Banco de Horas' },"
);

// Add component render
const renderBlock = `
                {/* BIOMETRIC PUNCH */}
                {activeTab === 'punch' && (
                    <div className="py-8">
                        <BiometricPunch />
                    </div>
                )}
`;

content = content.replace(
    /{\/\* ATS KANBAN \*\//,
    renderBlock + "\n                {/* ATS KANBAN */"
);

fs.writeFileSync(path, content, 'utf8');
