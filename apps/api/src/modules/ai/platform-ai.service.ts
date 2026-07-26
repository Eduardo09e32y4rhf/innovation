import { Injectable, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiGuardrailsService } from './ai-guardrails.service';

export interface CompanySummaryResult {
  summaryText: string;
  keyHighlights: string[];
  statusClassification: 'NORMAL' | 'ATTENTION' | 'CRITICAL';
  source?: 'AI' | 'DETERMINISTIC_FALLBACK';
}

export interface RiskAnalysisResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  recommendations: string[];
  source?: 'AI' | 'DETERMINISTIC_FALLBACK';
}

export interface PlatformAssistantResult {
  answer: string;
  isReadOnlyVerified: boolean;
  source?: 'AI' | 'DETERMINISTIC_FALLBACK';
}

@Injectable()
export class PlatformAiService {
  private readonly logger = new Logger(PlatformAiService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly guardrails: AiGuardrailsService,
  ) {}

  /**
   * Gera um resumo executivo narrativo da situação de uma empresa no console SaaS.
   */
  public async generateCompanySummary(
    company: any,
    stats: { activeUsers: number; maxUsers: number; overdueInvoices: number; openTickets: number },
    actorId?: string,
  ): Promise<CompanySummaryResult> {
    const tenantId = company.id || 'GLOBAL';

    const fallbackText = `A empresa ${company.name || 'Cliente'} está ${company.status === 'ACTIVE' ? 'ativa' : 'suspensa/inativa'}, utilizando ${stats.activeUsers} de ${stats.maxUsers || 'ilimitadas'} licenças. Possui ${stats.overdueInvoices} cobrança(s) vencida(s) e ${stats.openTickets} chamado(s) aberto(s).`;
    const fallbackStatus = stats.overdueInvoices > 0 || stats.openTickets >= 3 ? 'CRITICAL' : (stats.activeUsers >= (stats.maxUsers || 999) * 0.9 ? 'ATTENTION' : 'NORMAL');

    const fallback: CompanySummaryResult = {
      summaryText: fallbackText,
      keyHighlights: [
        `Uso de licenças: ${stats.activeUsers}/${stats.maxUsers || 'ilimitado'}`,
        `Faturas em atraso: ${stats.overdueInvoices}`,
        `Chamados pendentes: ${stats.openTickets}`,
      ],
      statusClassification: fallbackStatus,
      source: 'DETERMINISTIC_FALLBACK',
    };

    const schema = {
      type: 'object',
      properties: {
        summaryText: { type: 'string', description: 'Resumo narrativo claro e profissional em 1 ou 2 frases sobre o estado da empresa.' },
        keyHighlights: { type: 'array', items: { type: 'string' }, description: 'Lista de até 3 pontos de destaque operacionais ou financeiros.' },
        statusClassification: { type: 'string', enum: ['NORMAL', 'ATTENTION', 'CRITICAL'] },
      },
      required: ['summaryText', 'keyHighlights', 'statusClassification'],
      additionalProperties: false,
    };

    const systemPrompt = `Você é um analista de Backoffice SaaS responsável por gerar diagnósticos executivos sobre empresas clientes. Baseie-se estritamente nos dados informados. Não invente números.`;
    const userPrompt = `Análise a seguinte empresa: Nome: ${company.name}, Status: ${company.status}, Licenças em uso: ${stats.activeUsers}/${stats.maxUsers}, Cobranças vencidas: ${stats.overdueInvoices}, Chamados abertos: ${stats.openTickets}.`;

    const result = await this.aiService.generateStructured<CompanySummaryResult>(
      systemPrompt,
      userPrompt,
      'CompanySummary',
      schema,
      { tenantId, actorId, fallbackData: fallback },
    );

    const resolved = result || fallback;
    return { ...resolved, source: result ? 'AI' : 'DETERMINISTIC_FALLBACK' };
  }

  /**
   * Combina regras determinísticas com explicação de IA para classificar risco financeiro/operacional.
   */
  public async analyzeOperationalRisk(
    company: any,
    invoices: any[],
    tickets: any[],
    actorId?: string,
  ): Promise<RiskAnalysisResult> {
    const tenantId = company.id || 'GLOBAL';

    const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;
    const criticalTickets = tickets.filter((t) => t.priority === 'CRITICAL' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const webhookFailures = company.metadata?.webhookFailures || 0;

    let calculatedRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    const reasons: string[] = [];
    const recommendations: string[] = [];

    if (overdueCount > 0) {
      calculatedRisk = 'HIGH';
      reasons.push(`${overdueCount} fatura(s) vencida(s) no Asaas/Sistema.`);
      recommendations.push('Entrar em contato com o responsável financeiro e verificar status no Asaas.');
    }
    if (criticalTickets > 0) {
      if (calculatedRisk !== 'HIGH') calculatedRisk = 'MEDIUM';
      reasons.push(`${criticalTickets} chamado(s) crítico(s) sem resolução.`);
      recommendations.push('Priorizar o atendimento dos tickets críticos com a engenharia.');
    }
    if (webhookFailures >= 3) {
      if (calculatedRisk !== 'HIGH') calculatedRisk = 'MEDIUM';
      reasons.push(`${webhookFailures} falhas recentes de webhook registradas.`);
      recommendations.push('Verificar logs do Asaas e conectividade do endpoint de webhook.');
    }
    if (reasons.length === 0) {
      reasons.push('Nenhum indicador de risco financeiro ou técnico detectado.');
      recommendations.push('Manter monitoramento de rotina.');
    }

    const fallback: RiskAnalysisResult = {
      riskLevel: calculatedRisk,
      reasons,
      recommendations,
      source: 'DETERMINISTIC_FALLBACK',
    };

    const schema = {
      type: 'object',
      properties: {
        riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        reasons: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
      required: ['riskLevel', 'reasons', 'recommendations'],
      additionalProperties: false,
    };

    const systemPrompt = `Você é um motor de inteligência operacional SaaS. Explique de forma estruturada os motivos do risco e dê recomendações de ação para o analista DEV ou Comercial. Mantenha a severidade do risco calculada pelo sistema (${calculatedRisk}).`;
    const userPrompt = `Empresa: ${company.name}, Risco Matemático Calculado: ${calculatedRisk}, Indicadores detectados: ${reasons.join(' | ')}.`;

    const result = await this.aiService.generateStructured<RiskAnalysisResult>(
      systemPrompt,
      userPrompt,
      'RiskAnalysis',
      schema,
      { tenantId, actorId, fallbackData: fallback },
    );

    const resolved = result || fallback;
    return { ...resolved, source: result ? 'AI' : 'DETERMINISTIC_FALLBACK' };
  }

  /**
   * Assistente operacional interativo (Estritamente Read-Only) para responder perguntas da frota.
   */
  public async askPlatformAssistant(
    question: string,
    fleetContextSummary: string,
    actorId?: string,
  ): Promise<PlatformAssistantResult> {
    const safety = this.guardrails.checkInputSafety(question);
    if (!safety.allowed) {
      return { answer: `Ação bloqueada: ${safety.reason}`, isReadOnlyVerified: true, source: 'DETERMINISTIC_FALLBACK' };
    }

    const systemPrompt = `Você é o Assistente Virtual do Console Operacional SaaS Innovation RH Connect.
Você tem acesso de leitura ao resumo do estado atual da frota de empresas.
RESPONDA COM CLAREZA, PRECISÃO E COM BASE APENAS NOS DADOS FORNECIDOS.
NUNCA sugira executar comandos SQL diretamente. NUNCA concorde em alterar dados sem confirmação humana.
Se perguntarem algo fora do contexto, informe que só pode analisar os dados operacionais fornecidos.`;

    const userPrompt = `Resumo Operacional Atual da Frota:\n${fleetContextSummary}\n\nPergunta do Administrador DEV: ${safety.sanitizedText}`;

    const schema = {
      type: 'object',
      properties: {
        answer: { type: 'string', description: 'Resposta clara, educada e analítica para o administrador.' },
      },
      required: ['answer'],
      additionalProperties: false,
    };

    const result = await this.aiService.generateStructured<{ answer: string }>(
      systemPrompt,
      userPrompt,
      'AssistantResponse',
      schema,
      { actorId, fallbackData: { answer: 'Não foi possível processar a pergunta via IA no momento. Por favor, consulte as tabelas e relatórios operacionais acima.' } },
    );

    return {
      answer: result?.answer || 'Assistente indisponível no momento.',
      isReadOnlyVerified: true,
      source: result ? 'AI' : 'DETERMINISTIC_FALLBACK',
    };
  }
}
