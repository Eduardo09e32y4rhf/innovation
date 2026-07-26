import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface UsageRecord {
  tenantId: string;
  actorId?: string;
  model?: string;
  source?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
  timestamp: Date;
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);
  private readonly usageRecords: UsageRecord[] = [];
  private readonly monthlyBudgetTokens: number;
  private readonly inputTokenCostPer1K: number;
  private readonly outputTokenCostPer1K: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.monthlyBudgetTokens = parseInt(this.configService.get<string>('OPENAI_MONTHLY_BUDGET') || '500000', 10);
    this.inputTokenCostPer1K = Number(this.configService.get<string>('OPENAI_INPUT_COST_PER_1K') || '0.005');
    this.outputTokenCostPer1K = Number(this.configService.get<string>('OPENAI_OUTPUT_COST_PER_1K') || '0.015');
  }

  /**
   * Registra o consumo de tokens e verifica se o orçamento do mês foi ultrapassado.
   */
  public async recordUsage(
    tenantId: string,
    promptTokens: number,
    completionTokens: number,
    actorId?: string,
    model?: string,
    source?: string,
    requestType?: string,
  ): Promise<boolean> {
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = Number(
      (
        (promptTokens / 1000) * this.inputTokenCostPer1K +
        (completionTokens / 1000) * this.outputTokenCostPer1K
      ).toFixed(6),
    );
    const normalizedTenantId = tenantId || 'GLOBAL';
    const companyId = this.parseCompanyId(normalizedTenantId);

    this.usageRecords.push({
      tenantId: normalizedTenantId,
      actorId,
      model,
      source,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      timestamp: new Date(),
    });

    try {
      await this.prisma.aiUsageLog.create({
        data: {
          tenantId: normalizedTenantId,
          companyId,
          actorId,
          model,
          source,
          requestType,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost: new Prisma.Decimal(estimatedCost.toFixed(6)),
        },
      });
    } catch (err) {
      this.logger.warn(`Falha ao persistir uso de IA para ${normalizedTenantId}: ${String(err)}`);
    }

    const currentMonthUsage = await this.getMonthlyUsage(normalizedTenantId);
    if (currentMonthUsage > this.monthlyBudgetTokens) {
      this.logger.warn(
        `[AI Budget Exceeded] Tenant ${normalizedTenantId} ultrapassou o orçamento mensal (${currentMonthUsage} / ${this.monthlyBudgetTokens} tokens).`,
      );
      return false;
    }

    return true;
  }

  /**
   * Retorna o total de tokens consumidos no mês corrente para um tenant ou global.
   */
  public async getMonthlyUsage(tenantId?: string): Promise<number> {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const where: any = {
      createdAt: { gte: start, lt: end },
    };

    if (tenantId && tenantId !== 'GLOBAL') {
      where.OR = [{ tenantId }, { tenantId: 'GLOBAL' }];
    } else if (tenantId === 'GLOBAL') {
      where.tenantId = 'GLOBAL';
    }

    const [dbAggregate, inMemoryTotal] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({
        where,
        _sum: { totalTokens: true },
      }),
      Promise.resolve(
        this.usageRecords
          .filter((record) => {
            const sameMonth = record.timestamp >= start && record.timestamp < end;
            if (!tenantId) return sameMonth;
            if (tenantId === 'GLOBAL') return sameMonth && record.tenantId === 'GLOBAL';
            return sameMonth && (record.tenantId === tenantId || record.tenantId === 'GLOBAL');
          })
          .reduce((acc, current) => acc + current.totalTokens, 0),
      ),
    ]);

    return Number(dbAggregate._sum.totalTokens || 0) + inMemoryTotal;
  }

  /**
   * Verifica se o tenant está liberado para consumir a API da OpenAI.
   */
  public async isBudgetAvailable(tenantId?: string): Promise<boolean> {
    return (await this.getMonthlyUsage(tenantId)) < this.monthlyBudgetTokens;
  }

  /**
   * Retorna estatísticas gerais de uso para exibição no console de operações.
   */
  public async getUsageSummary() {
    const currentMonthConsumed = await this.getMonthlyUsage();
    return {
      monthlyBudgetTokens: this.monthlyBudgetTokens,
      currentMonthConsumed,
      remainingBudget: Math.max(0, this.monthlyBudgetTokens - currentMonthConsumed),
      totalRequestsRecorded: this.usageRecords.length,
    };
  }

  private parseCompanyId(tenantId: string): string | null {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)
      ? tenantId
      : null;
  }
}
