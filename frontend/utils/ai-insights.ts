/**
 * Utilitários para comunicação com os endpoints de IA da Innovation.ia
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface InsightData {
    enterprise_data: Record<string, any>;
    report_name?: string;
}

export interface InsightResponse {
    status: string;
    report_id: number;
    report_name: string;
    insight: string;
    created_at: string;
}

/**
 * Solicita a geração de um insight estratégico baseado nos dados da empresa.
 */
export async function generateManagementInsight(
    data: InsightData,
    token: string
): Promise<InsightResponse> {
    const response = await fetch(`${API_URL}/ai-reports/generate-insight`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Falha ao gerar insight');
    }

    return response.json();
}

/**
 * Obtém o histórico de relatórios de IA do usuário.
 */
export async function getMyAiReports(token: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/ai-reports/`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Falha ao obter relatórios');
    }

    return response.json();
}
