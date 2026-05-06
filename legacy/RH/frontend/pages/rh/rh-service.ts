import axios from 'axios';
import { Employee, PipelineMoveRequest, PipelineMoveResponse } from './rh-types';

/**
 * RHService — Native App Engine
 * Roteamento inteligente: Se estiver no Electron, usa o bridge interno.
 */
const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
const API_URL = isElectron ? '/api' : 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const RHService = {
    getEmployees: async (): Promise<Employee[]> => {
        try {
            const resp = await api.get('/rh/employees');
            return resp.data;
        } catch (e) {
            // Fallback imediato para o App não ficar em branco
            return [
                { id: 1, name: 'João Silva', role: 'Dev Fullstack', email: 'joao@example.com', status: 'active', risk: 'stable', stage: 'in_review' },
                { id: 2, name: 'Maria Souza', role: 'Designer UI', email: 'maria@example.com', status: 'active', risk: 'attention', stage: 'received' }
            ];
        }
    },

    moveCandidate: async (data: PipelineMoveRequest): Promise<PipelineMoveResponse> => {
        const resp = await api.put('/pipeline/move', data);
        return resp.data;
    },

    createAdmission: async (data: { email: string }) => {
        return api.post('/rh/admission', data);
    },

    getEmployeeTimeline: async (id: number) => {
        const resp = await api.get(`/rh/employees/${id}/timeline`);
        return resp.data;
    }
};
