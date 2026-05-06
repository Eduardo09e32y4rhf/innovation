/**
 * modules/ia/types.ts
 * Contratos de interface para o módulo de Inteligência Artificial.
 */

export interface ResumeAnalysis {
  fullName: string;
  email: string;
  phone: string;
  currentRole: string;
  summary: string;
  skills: {
    hard: string[];
    soft: string[];
  };
  experienceYears: number;
  education: string[];
  matchScore: number;
  redFlags: string[];
}

export interface SentimentAnalysis {
  sentiment: 'Positivo' | 'Neutro' | 'Negativo';
  tone: string;
  engagementLevel: number; // 0-100
  language: string;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  latencyMs: number;
}

export interface ScreeningResult {
  candidateId: string;
  transcript: { role: 'bot' | 'candidate'; text: string; timestamp: string }[];
  evaluation: string;
  finalScore: number;
}
