// IA/services/ScreeningBot.ts
import { GeminiService } from './GeminiService';
import { WBotService } from '../../WHATSAPP/services/WBotService';

export class ScreeningBot {
  /**
   * Conduz uma entrevista inicial automática via WhatsApp.
   */
  static async conductInitialScreening(candidatePhone: string, candidateName: string, role: string) {
    console.log(`🤖 Iniciando triagem IA para ${candidateName} (Vaga: ${role})`);

    const firstQuestion = `Olá ${candidateName}! Sou a assistente da Innovation.ia. Notei seu interesse na vaga de ${role}. Poderia me contar brevemente sobre sua experiência com as tecnologias principais dessa vaga?`;
    
    await WBotService.sendAutomatedMessage(candidatePhone, firstQuestion);
    return { status: 'SCREENING_STARTED' };
  }

  /**
   * Analisa a resposta do candidato e atribui um score de sentimento e relevância.
   */
  static async analyzeResponse(answer: string) {
    // Usamos o Gemini para entender se a resposta é técnica e qual o sentimento
    const analysis = await GeminiService.generateWhatsAppReply(`Analise se esta resposta de um candidato é tecnicamente relevante e qual o tom: ${answer}`);
    
    return {
      relevanceScore: Math.random() * 100, // Aqui integraria com a nota real
      sentiment: analysis
    };
  }
}
