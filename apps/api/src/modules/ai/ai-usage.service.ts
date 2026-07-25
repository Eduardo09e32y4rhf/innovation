import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UsageRecord {
  tenantId: string;
  actorId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: Date;
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);
  private usageRecords: UsageRecord[] = [];
  private monthlyBudgetTokens: number;

  constructor(private readonly configService: ConfigService) {
    // Orçamento padrão mensal de tokens (ex: 500.000 tokens por mês por tenant)
    this.monthlyBudgetTokens = parseInt(this.configService.get<string>('OPENAI_MONTHLY_BUDGET') || '500000', 10);
  }

  /**
   * Registra o consumo de tokens e verifica se o orçamento do mês foi ultrapassado.
   */
  public recordUsage(tenantId: string, promptTokens: number, completionTokens: number, actorId?: string): boolean {
    const totalTokens = promptTokens + completionTokens;

    this.usageRecords.push({
      tenantId: tenantId || 'GLOBAL',
      actorId,
      promptTokens,
      completionTokens,
      totalTokens,
      timestamp: new Date(),
    });

    const currentMonthUsage = this.getMonthlyUsage(tenantId);
    if (currentMonthUsage > this.monthlyBudgetTokens) {
      this.logger.warn(`[AI Budget Exceeded] Tenant ${tenantId} ultrapassou o orçamento mensal (${currentMonthUsage} / ${this.monthlyBudgetTokens} tokens).`);
      return false; // Orçamento estourado
    }

    return true; // Dentro do orçamento
  }

  /**
   * Retorna o total de tokens consumidos no mês corrente para um tenant ou global.
   */
  public getMonthlyUsage(tenantId?: string): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return this.usageRecords
      .filter((r) => {
        const isSameMonth = r.timestamp.getMonth() === currentMonth && r.timestamp.getFullYear() === currentYear;
        if (!tenantId) return isSameMonth;
        return isSameMonth && (r.tenantId === tenantId || r.tenantId === 'GLOBAL');
      })
      .reduce((acc, curr) => acc + curr.totalTokens, 0);
  }

  /**
   * Verifica se o tenant está liberado para consumir a API da OpenAI.
   */
  public isBudgetAvailable(tenantId?: string): boolean {
    return this.getMonthlyUsage(tenantId) < this.monthlyBudgetTokens;
  }

  /**
   * Retorna estatísticas gerais de uso para exibição no console de operações.
   */
  public getUsageSummary() {
    return {
      monthlyBudgetTokens: this.monthlyBudgetTokens,
      currentMonthConsumed: this.getMonthlyUsage(),
      remainingBudget: Math.max(0, this.monthlyBudgetTokens - this.getMonthlyUsage()),
      totalRequestsRecorded: this.usageRecords.length,
    };
  }
}
