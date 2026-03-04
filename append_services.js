const fs = require('fs');

const apiFile = 'frontend/services/api.ts';
let apiContent = fs.readFileSync(apiFile, 'utf8');

const servicesToAdd = `

export const UsersService = {
    getProfile: async () => {
        const res = await api.get('/api/users/me');
        return res.data;
    },
    updateProfile: async (data: Record<string, unknown>) => {
        const res = await api.put('/api/users/me', data);
        return res.data;
    }
};

export const AnalyticsService = {
    getOverview: async () => {
        const res = await api.get('/api/analytics/overview');
        return res.data;
    }
};

export const SubscriptionsService = {
    getMySubscription: async () => {
        const res = await api.get('/api/subscriptions/me');
        return res.data;
    }
};
`;

if (!apiContent.includes('export const UsersService = {')) {
    apiContent += servicesToAdd;
    fs.writeFileSync(apiFile, apiContent);
    console.log('Missing services added to api.ts');
} else {
    console.log('Services already exist in api.ts');
}
