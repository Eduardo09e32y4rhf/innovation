import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface UsageRecord {
  tenantId: string;
  actorId?: string;
  model?: string;
  feature?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
  source?: string;
  timestamp: Date;
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);
  private monthlyBudgetTokens: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Orçamento padrão mensal de tokens (ex: 500.000 tokens por mês)
    this.monthlyBudgetTokens = parseInt(
      this.configService.get<string>('OPENAI_MONTHLY_BUDGET') || '500000',
      10,
    );
  }

  /**
   * Registra o consumo de tokens no banco de dados (tabela ai_usage_logs).
   * Verifica se o orçamento mensal do tenant foi ultrapassado.
   *
   * @returns true se dentro do orçamento, false se estourou
   */
  public async recordUsage(
    tenantId: string,
    promptTokens: number,
    completionTokens: number,
    options: {
      actorId?: string;
      model?: string;
      feature?: string;
      estimatedCostUsd?: number;
      source?: string;
    } = {},
  ): Promise<boolean> {
    const totalTokens = promptTokens + completionTokens;
    const {
      actorId,
      model = 'gpt-4o-mini',
      feature = 'unknown',
      estimatedCostUsd = 0,
      source = 'OPENAI',
    } = options;

    try {
      await this.prisma.aiUsageLog.create({
        data: {
          tenantId: tenantId || 'GLOBAL',
          actorId,
          model,
          feature,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd,
          source,
        },
      });
    } catch (err) {
      // Não bloquear a chamada de IA por falha de log — apenas registrar
      this.logger.error(`[AI Usage] Falha ao persistir log de uso para tenant ${tenantId}`, err);
    }

    const currentMonthUsage = await this.getMonthlyUsage(tenantId);
    if (currentMonthUsage > this.monthlyBudgetTokens) {
      this.logger.warn(
        `[AI Budget Exceeded] Tenant ${tenantId} ultrapassou o orçamento mensal ` +
          `(${currentMonthUsage} / ${this.monthlyBudgetTokens} tokens).`,
      );
      return false; // Orçamento estourado
    }

    return true; // Dentro do orçamento
  }

  /**
   * Retorna o total de tokens consumidos no mês corrente para um tenant ou global.
   * Lê direto do banco — não usa cache em memória.
   */
  public async getMonthlyUsage(tenantId?: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const where: Record<string, unknown> = {
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    };

    if (tenantId) {
      where.tenantId = { in: [tenantId, 'GLOBAL'] };
    }

    const result = await this.prisma.aiUsageLog.aggregate({
      where,
      _sum: { totalTokens: true },
    });

    return result._sum.totalTokens ?? 0;
  }

  /**
   * Verifica se o tenant está liberado para consumir a API da OpenAI.
   */
  public async isBudgetAvailable(tenantId?: string): Promise<boolean> {
    const used = await this.getMonthlyUsage(tenantId);
    return used < this.monthlyBudgetTokens;
  }

  /**
   * Retorna estatísticas gerais de uso para exibição no console de operações.
   */
  public async getUsageSummary(tenantId?: string) {
    const currentMonthConsumed = await this.getMonthlyUsage(tenantId);
    return {
      monthlyBudgetTokens: this.monthlyBudgetTokens,
      currentMonthConsumed,
      remainingBudget: Math.max(0, this.monthlyBudgetTokens - currentMonthConsumed),
    };
  }
}
