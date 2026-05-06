// IA/services/AIService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class AIService {
  /**
   * Realiza OCR e Extração de Skills de um currículo (PDF, Imagem ou Texto).
   */
  static async extractSkills(fileData: string, mimeType: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Analise este currículo e extraia:
    1. Lista de Soft Skills
    2. Lista de Hard Skills (Tecnologias, idiomas, etc.)
    3. Experiência total em anos.
    4. Resumo profissional.
    Retorne apenas um JSON estruturado.`;

    const result = await model.generateContent([
      { inlineData: { data: fileData, mimeType } },
      { text: prompt }
    ]);
    
    return JSON.parse(result.response.text());
  }

  /**
   * Algoritmo de Match % entre Candidato e Vaga.
   */
  static calculateMatch(candidateSkills: string[], jobSkills: string[]) {
    const matched = candidateSkills.filter(skill => 
      jobSkills.some(js => js.toLowerCase() === skill.toLowerCase())
    );
    return Math.round((matched.length / jobSkills.length) * 100);
  }

  /**
   * Detecta "Red Flags" no perfil do candidato.
   */
  static async detectRedFlags(resumeText: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Identifique possíveis sinais de alerta (Red Flags) neste currículo, como:
    - Gaps de tempo inexplicáveis
    - Inconsistências de datas
    - Falta de progressão de carreira
    Retorne uma lista de alertas ou "Nenhum detectado".
    Texto: ${resumeText}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
