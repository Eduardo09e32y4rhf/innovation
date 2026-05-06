/**
 * rh-types.ts — Contrato de Interface Sincronizado v2
 */

// Estágios reais conforme pipeline_api.py
export type PipelineStage = 
    | 'received'    // Anteriormente 'applied'
    | 'in_review'   // Anteriormente 'screening'
    | 'interview' 
    | 'offer' 
    | 'approved'    // Anteriormente 'hired'
    | 'rejected';

export interface Employee {
    id: number;
    name: string;
    role: string;
    email: string;
    status: 'active' | 'vacation' | 'away';
    risk: 'stable' | 'attention' | 'critical';
    stage: PipelineStage;
    avatar?: string;
    time_balance?: number;
}

export interface PipelineMoveRequest {
    application_id: number;
    new_stage: PipelineStage;
    notes?: string;
}

// Mapeamento para exibição amigável na UI (Frontend)
export const STAGE_LABELS: Record<PipelineStage, string> = {
    'received': 'Recebido',
    'in_review': 'Em Análise',
    'interview': 'Entrevista',
    'offer': 'Proposta',
    'approved': 'Aprovado',
    'rejected': 'Rejeitado'
};