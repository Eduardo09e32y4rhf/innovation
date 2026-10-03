import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { RULE_TYPES, SaveRuleDto, SimulateDto, type RuleType } from './accounting.dto';

export const RULE_META: Record<RuleType, { label: string; description: string }> = {
  INSS: { label: 'INSS (empregado)', description: 'Faixas progressivas de contribuição. A última faixa define o teto de contribuição.' },
  IRRF: { label: 'IRRF', description: 'Faixas, dedução simplificada, dedução por dependente e redutor de isenção.' },
  FGTS: { label: 'FGTS (patronal)', description: 'Alíquota do depósito mensal sobre o bruto.' },
  PAYROLL_PARAMS: { label: 'Parâmetros de folha', description: 'Pisos de hora extra, adicional noturno e divisor mensal usados no cálculo.' },
};

const day = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
const key = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class AccountingRulesService implements OnModuleInit {
  private readonly logger = new Logger(AccountingRulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payroll: PayrollCalculationService,
  ) {}

  async onModuleInit() {
    try { await this.ensureDefaults(); }
    catch (error) { this.logger.warn(`Não foi possível semear as regras padrão: ${String(error)}`); }
  }

  /** Garante uma versão padrão ativa de cada regra (editável pela Contabilidade). */
  async ensureDefaults() {
    const D = PayrollCalculationService;
    const defaults: Record<RuleType, { brackets: any; parameters?: any }> = {
      INSS: { brackets: D.DEFAULT_INSS },
      IRRF: { brackets: D.DEFAULT_IRRF, parameters: D.DEFAULT_IRRF_PARAMETERS },
      FGTS: { brackets: [{ limit: null, rate: D.DEFAULT_FGTS_RATE }] },
      PAYROLL_PARAMS: { brackets: [{ limit: null, rate: 0 }], parameters: D.DEFAULT_RULE_PARAMS },
    };
    for (const type of RULE_TYPES) {
      const exists = await this.prisma.payrollTaxTable.count({ where: { taxType: type as any, active: true } });
      if (exists) continue;
      try {
        await this.prisma.payrollTaxTable.create({
          data: { taxType: type as any, version: 'PADRAO_2026', effectiveFrom: day('2026-01-01'), brackets: defaults[type].brackets, parameters: defaults[type].parameters ?? undefined, active: true },
        });
      } catch (error: any) {
        if (error?.code !== 'P2002') throw error;
      }
    }
  }

  async list(referenceDate = new Date()) {
    const tables = await this.prisma.payrollTaxTable.findMany({ orderBy: [{ taxType: 'asc' }, { effectiveFrom: 'desc' }] });
    const shape = (table: (typeof tables)[number]) => ({
      id: table.id, version: table.version, effectiveFrom: key(table.effectiveFrom), effectiveTo: table.effectiveTo ? key(table.effectiveTo) : null,
      active: table.active, brackets: table.brackets, parameters: table.parameters, updatedAt: table.updatedAt,
    });
    return {
      referenceDate: key(referenceDate),
      rules: RULE_TYPES.map((type) => {
        const history = tables.filter((table) => (table.taxType as string) === type);
        const current = history.find((table) => table.active && table.effectiveFrom <= referenceDate && (!table.effectiveTo || table.effectiveTo >= referenceDate));
        return { type, ...RULE_META[type], current: current ? shape(current) : null, history: history.map(shape) };
      }),
    };
  }

  private validate(dto: SaveRuleDto) {
    const fail = (message: string): never => { throw new BadRequestException(message); };
    switch (dto.taxType) {
      case 'INSS': {
        const brackets = dto.brackets ?? fail('Informe as faixas do INSS.');
        let previous = 0;
        brackets!.forEach((bracket, index) => {
          if (bracket.limit == null) fail('No INSS toda faixa precisa de um limite (a última define o teto).');
          if (bracket.limit! <= previous) fail(`Faixa ${index + 1}: os limites devem ser crescentes.`);
          if (bracket.rate > 0.2) fail(`Faixa ${index + 1}: alíquota acima de 20% — confira (use 0,075 para 7,5%).`);
          previous = bracket.limit!;
        });
        return { brackets: brackets!.map((item) => ({ limit: item.limit, rate: item.rate })), parameters: undefined };
      }
      case 'IRRF': {
        const brackets = dto.brackets ?? fail('Informe as faixas do IRRF.');
        let previous = 0;
        brackets!.forEach((bracket, index) => {
          const last = index === brackets!.length - 1;
          if (!last && bracket.limit == null) fail(`Faixa ${index + 1}: apenas a última faixa pode ficar sem limite.`);
          if (bracket.limit != null && bracket.limit <= previous) fail(`Faixa ${index + 1}: os limites devem ser crescentes.`);
          if (bracket.rate > 0.5) fail(`Faixa ${index + 1}: alíquota acima de 50% — confira.`);
          previous = bracket.limit ?? previous;
        });
        const p = dto.parameters ?? fail('Informe os parâmetros do IRRF.');
        const required = ['dependentDeduction', 'simplifiedDeduction', 'fullExemptionLimit', 'partialExemptionLimit', 'partialReductionBase', 'partialReductionFactor'];
        for (const field of required) if (!Number.isFinite(Number(p![field])) || Number(p![field]) < 0) fail(`Parâmetro inválido: ${field}.`);
        if (Number(p!.partialExemptionLimit) < Number(p!.fullExemptionLimit)) fail('O limite de redução parcial deve ser maior ou igual ao limite de isenção total.');
        return { brackets: brackets!.map((item) => ({ limit: item.limit ?? null, rate: item.rate, deduction: item.deduction ?? 0 })), parameters: Object.fromEntries(required.map((field) => [field, Number(p![field])])) };
      }
      case 'FGTS': {
        if (dto.rate == null) fail('Informe a alíquota do FGTS (ex.: 0,08).');
        return { brackets: [{ limit: null, rate: dto.rate }], parameters: undefined };
      }
      case 'PAYROLL_PARAMS': {
        const p = dto.parameters ?? fail('Informe os parâmetros de folha.');
        const parsed = {
          overtime50MinFactor: Number(p!.overtime50MinFactor), overtime100MinFactor: Number(p!.overtime100MinFactor),
          nightMinPercent: Number(p!.nightMinPercent), monthlyDivisorFactor: Number(p!.monthlyDivisorFactor),
        };
        if (!(parsed.overtime50MinFactor >= 1.5)) fail('O fator mínimo da hora extra 50% não pode ser menor que 1,5 (CLT).');
        if (!(parsed.overtime100MinFactor >= 2)) fail('O fator mínimo da hora extra 100% não pode ser menor que 2,0.');
        if (!(parsed.nightMinPercent >= 20)) fail('O adicional noturno mínimo é 20% (CLT).');
        if (!(parsed.monthlyDivisorFactor >= 4 && parsed.monthlyDivisorFactor <= 6)) fail('O fator do divisor mensal deve ficar entre 4 e 6 (padrão 5: 44h semanais → 220h).');
        return { brackets: [{ limit: null, rate: 0 }], parameters: parsed };
      }
    }
  }

  async saveVersion(actor: JwtUser, dto: SaveRuleDto) {
    const normalized = this.validate(dto)!;
    const from = day(dto.effectiveFrom);
    if (Number.isNaN(from.getTime())) throw new BadRequestException('Data de vigência inválida.');

    const later = await this.prisma.payrollTaxTable.findFirst({ where: { taxType: dto.taxType as any, active: true, effectiveFrom: { gte: from } } });
    if (later) throw new BadRequestException(`Já existe uma versão ativa que começa em ${key(later.effectiveFrom)}. Escolha uma vigência posterior ou desative aquela versão.`);

    const version = (dto.version?.trim() || `${key(from)}`);
    const taken = await this.prisma.payrollTaxTable.findFirst({ where: { taxType: dto.taxType as any, version } });
    if (taken) throw new BadRequestException(`Já existe a versão "${version}" desta regra. Use outro nome de versão.`);

    const created = await this.prisma.$transaction(async (tx) => {
      const dayBefore = new Date(from.getTime() - 86_400_000);
      await tx.payrollTaxTable.updateMany({
        where: { taxType: dto.taxType as any, active: true, effectiveFrom: { lt: from }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] },
        data: { effectiveTo: dayBefore },
      });
      const row = await tx.payrollTaxTable.create({
        data: { taxType: dto.taxType as any, version, effectiveFrom: from, brackets: normalized.brackets as any, parameters: (normalized.parameters ?? undefined) as any, active: true },
      });
      await tx.auditLog.create({ data: { companyId: await this.auditCompany(tx, actor), userId: actor.sub, action: 'ACCOUNTING_RULE_VERSION_CREATED', entity: 'PayrollTaxTable', entityId: row.id, metadata: { taxType: dto.taxType, version, effectiveFrom: key(from) } } });
      return row;
    });
    return { id: created.id, version: created.version };
  }

  private async auditCompany(tx: any, actor: JwtUser) {
    return actor.companyId;
  }

  async deactivate(actor: JwtUser, id: string) {
    const table = await this.prisma.payrollTaxTable.findUnique({ where: { id } });
    if (!table) throw new NotFoundException('Regra não encontrada.');
    const others = await this.prisma.payrollTaxTable.count({ where: { taxType: table.taxType, active: true, id: { not: id } } });
    if (!others) throw new BadRequestException('Mantenha ao menos uma versão ativa; crie uma nova versão antes de desativar esta.');
    await this.prisma.payrollTaxTable.update({ where: { id }, data: { active: false } });
    await this.prisma.auditLog.create({ data: { companyId: actor.companyId, userId: actor.sub, action: 'ACCOUNTING_RULE_VERSION_DEACTIVATED', entity: 'PayrollTaxTable', entityId: id, metadata: { taxType: table.taxType, version: table.version } } });
    return { id, active: false };
  }

  /** Simula um holerite com as regras vigentes na data (mostra exatamente o que o fechamento fará). */
  async simulate(dto: SimulateDto) {
    const date = dto.referenceDate ? day(dto.referenceDate) : new Date();
    const taxContext = await this.payroll.resolveTaxContext(date);
    const result = this.payroll.calculate({
      salary: dto.salary, weeklyMinutes: 2640,
      overtime50Minutes: dto.overtime50Minutes ?? 0, overtime100Minutes: dto.overtime100Minutes ?? 0, nightShiftMinutes: dto.nightShiftMinutes ?? 0,
      absenceMinutes: dto.absenceMinutes ?? 0, payableWorkdays: 22, paidRestDays: 4, dependents: dto.dependents ?? 0, taxContext,
    });
    return {
      referenceDate: key(date),
      result,
      rulesUsed: {
        inss: taxContext.inss.version, irrf: taxContext.irrf.version, fgts: taxContext.fgts?.version, params: taxContext.params?.version,
        fgtsRate: taxContext.fgts?.rate, builtin: taxContext.builtin ?? [],
      },
    };
  }
}
