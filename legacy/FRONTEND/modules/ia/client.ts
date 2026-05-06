/**
 * modules/ia/client.ts
 * Cliente de comunicação com provedores de IA (Gemini/Python Backend).
 */

import { AIResponse } from './types';

export class IAClient {
  private static instance: IAClient;
  private readonly pythonApiUrl = 'http://localhost:8000'; // Porta padrão do worker Python

  private constructor() {}

  static getInstance(): IAClient {
    if (!IAClient.instance) {
      IAClient.instance = new IAClient();
    }
    return IAClient.instance;
  }

  /**
   * Wrapper para chamadas seguras.
   */
  async request<T>(endpoint: string, payload: any): Promise<AIResponse<T>> {
    const start = Date.now();
    try {
      // Nota: Em produção, isso passaria por um proxy/api routes para não expor chaves.
      // Aqui simulamos a chamada ao backend Python ou API direta.
      console.log(`[IA Client] Requesting ${endpoint}...`, payload);
      
      // Simulação de delay de rede/processamento
      await new Promise(r => setTimeout(r, 1200));

      return {
        success: true,
        latencyMs: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown IA Error',
        latencyMs: Date.now() - start
      };
    }
  }
}
