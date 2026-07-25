import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiGuardrailsService } from './ai-guardrails.service';
import { AiUsageService } from './ai-usage.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;
  private isEnabled = false;
  private modelFast: string;
  private modelReasoning: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly guardrails: AiGuardrailsService,
    private readonly usageService: AiUsageService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    const enabledEnv = this.configService.get<string>('OPENAI_AI_ENABLED') || 'true';

    this.modelFast = this.configService.get<string>('OPENAI_MODEL_FAST') || 'gpt-4o-mini';
    this.modelReasoning = this.configService.get<string>('OPENAI_MODEL_REASONING') || 'gpt-4o';

    if (apiKey && apiKey.trim().length > 0 && enabledEnv.toLowerCase() === 'true') {
      try {
        this.openai = new OpenAI({ apiKey: apiKey.trim() });
        this.isEnabled = true;
        this.logger.log('Módulo OpenAI inicializado com sucesso no backend.');
      } catch (err) {
        this.logger.error('Erro ao inicializar SDK OpenAI:', err);
      }
    } else {
      this.logger.warn('OpenAI desativada ou OPENAI_API_KEY não encontrada. O sistema operará no modo determinístico / fallback de IA.');
    }
  }

  public isAiActive(): boolean {
    return this.isEnabled && this.openai !== null;
  }

  /**
   * Executa moderação de texto para barrar conteúdos impróprios antes do processamento.
   */
  public async moderateText(text: string): Promise<{ flagged: boolean; reason?: string }> {
    if (!this.isAiActive() || !text) return { flagged: false };

    try {
      const modResponse = await this.openai!.moderations.create({ input: text });
      const result = modResponse.results[0];
      if (result && result.flagged) {
        return { flagged: true, reason: 'O conteúdo falhou nas políticas de moderação automática da plataforma.' };
      }
      return { flagged: false };
    } catch (err) {
      this.logger.error('Erro ao consultar moderação OpenAI:', err);
      return { flagged: false }; // Em erro de rede na moderação, segue para análise de guardrail local
    }
  }

  /**
   * Gera resposta estruturada (Structured Outputs via JSON Schema) com controle de guardrail, timeout e orçamento.
   */
  public async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schemaName: string,
    jsonSchema: any,
    options?: {
      tenantId?: string;
      actorId?: string;
      useReasoningModel?: boolean;
      fallbackData?: T;
    },
  ): Promise<T | null> {
    const tenantId = options?.tenantId || 'GLOBAL';
    const fallback = options?.fallbackData || null;

    // 1. Verificação de Segurança de Input (Guardrails Locais)
    const safetyCheck = this.guardrails.checkInputSafety(userPrompt);
    if (!safetyCheck.allowed) {
      this.logger.warn(`Prompt abortado por Guardrail para tenant ${tenantId}: ${safetyCheck.reason}`);
      return fallback;
    }

    // 2. Verificação de Orçamento Mensal
    if (!this.usageService.isBudgetAvailable(tenantId)) {
      this.logger.warn(`Orçamento mensal de IA excedido para tenant ${tenantId}. Retornando fallback determinístico.`);
      return fallback;
    }

    // 3. Fallback se IA estiver desativada no ambiente
    if (!this.isAiActive()) {
      return fallback;
    }

    const model = options?.useReasoningModel ? this.modelReasoning : this.modelFast;

    try {
      const response = await this.openai!.chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: safetyCheck.sanitizedText },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: schemaName,
              strict: true,
              schema: jsonSchema,
            },
          },
          temperature: 0.2,
        },
        { timeout: 15000 }, // 15s timeout
      );

      const choice = response.choices[0];
      if (response.usage) {
        this.usageService.recordUsage(
          tenantId,
          response.usage.prompt_tokens || 0,
          response.usage.completion_tokens || 0,
          options?.actorId,
        );
      }

      if (choice?.message?.content) {
        const parsed = JSON.parse(choice.message.content) as T;
        return parsed;
      }
    } catch (err: any) {
      this.logger.error(`Erro na chamada OpenAI Structured Output (${schemaName}):`, err?.message || err);
    }

    return fallback;
  }
}
