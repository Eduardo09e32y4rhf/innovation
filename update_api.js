const fs = require('fs');

const apiFile = 'frontend/services/api.ts';
let apiContent = fs.readFileSync(apiFile, 'utf8');

if (!apiContent.includes('export const CompanyService = {')) {
    apiContent += `\n
export const CompanyService = {
    getMyCompany: async () => {
        const res = await api.get('/api/companies/me');
        return res.data;
    },
    createCompany: async (data: Record<string, unknown>) => {
        const res = await api.post('/api/companies', data);
        return res.data;
    },
    updateCompany: async (id: string, data: Record<string, unknown>) => {
        const res = await api.put(\`/api/companies/\${id}\`, data);
        return res.data;
    }
};
`;
    fs.writeFileSync(apiFile, apiContent);
    console.log('CompanyService added.');
} else {
    console.log('CompanyService already exists.');
}
