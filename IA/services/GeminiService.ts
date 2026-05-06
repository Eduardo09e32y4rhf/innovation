// IA/services/GeminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class GeminiService {
  /**
   * Analisa um currículo e extrai dados estruturados.
   */
  static async parseResume(text: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Analise o currículo abaixo e retorne um JSON com nome, email, telefone e habilidades principais:\n\n${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Calcula o score de um candidato (0-100) baseado no currículo e requisitos da vaga.
   */
  static async calculateCandidateScore(resumeText: string, jobRequirements: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Compare o currículo com os requisitos da vaga e dê uma nota de 0 a 100 baseada na compatibilidade técnica.
    Retorne apenas o número (ex: 85).
    Requisitos: ${jobRequirements}
    Currículo: ${resumeText}`;
    
    const result = await model.generateContent(prompt);
    const scoreStr = (await result.response).text().trim();
    return parseInt(scoreStr) || 0;
  }

  /**
   * Gera uma resposta automática para um candidato via WhatsApp.
   */
  static async generateWhatsAppReply(context: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Gere uma resposta amigável e profissional para este contexto de chat: ${context}`;
    
    const result = await model.generateContent(prompt);
    return (await result.response).text();
  }
}
