export interface SentimentInput {
  text: string;
  context?: 'email' | 'chat' | 'feedback' | 'resume' | 'other';
}

export interface SentimentResult {
  sentimento: 'Positivo' | 'Neutro' | 'Negativo';
  tom: string;
  engajamento: number;
  confidence?: number;
  status: string;
}
