import { Injectable, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiGuardrailsService } from './ai-guardrails.service';

export interface TicketClassificationResult {
  category: string;
  suggestedPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  summary: string;
  source?: 'AI' | 'DETERMINISTIC_FALLBACK';
}

export interface TicketSummaryResult {
  summary: string;
  keyPoints: string[];
  pendingActionFrom: 'DEV' | 'CUSTOMER' | 'NONE';
  source?: 'AI' | 'DETERMINISTIC_FALLBACK';
}

export interface SuggestedReplyResult {
  suggestedReply: string;
  isReadyToSend: boolean; // Sempre FALSE por política de segurança (requer aprovação do atendente DEV)
  source?: 'AI' | 'DETERMINISTIC_FALLBACK';
}

export interface RootCauseDraftResult {
  rootCauseDraft: string;
  preventionTips: string[];
  source?: 'AI' | 'DETERMINISTIC_FALLBACK';
}

@Injectable()
export class SupportAiService {
  private readonly logger = new Logger(SupportAiService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly guardrails: AiGuardrailsService,
  ) {}

  /**
   * Classifica automaticamente categoria e sugere prioridade para um chamado recém-aberto.
   */
  public async classifyTicket(title: string, description: string): Promise<TicketClassificationResult> {
    const fallback: TicketClassificationResult = {
      category: 'OTHER',
      suggestedPriority: 'NORMAL',
      summary: `${title}: ${description ? description.substring(0, 100) : ''}...`,
    };

    const schema = {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['BUG', 'LOGIN_ISSUE', 'FINANCIAL', 'PERFORMANCE', 'SECURITY', 'INTEGRATION', 'OTHER'],
        },
        suggestedPriority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] },
        summary: { type: 'string', description: 'Resumo técnico do problema relatado em 1 frase.' },
      },
      required: ['category', 'suggestedPriority', 'summary'],
      additionalProperties: false,
    };

    const systemPrompt = `Você é um motor de triagem de chamados de suporte técnico de software RH. Analise o título e a descrição e classifique corretamente. Se envolver parada total ou perda de dados, sugira CRITICAL. Se envolver dificuldade simples sem bloqueio, sugira NORMAL ou LOW.`;
    const userPrompt = `Título: ${title}\nDescrição: ${description}`;

    const result = await this.aiService.generateStructured<TicketClassificationResult>(
      systemPrompt,
      userPrompt,
      'TicketClassification',
      schema,
      { fallbackData: fallback },
    );

    const resolved = result || fallback;
    return { ...resolved, source: result ? 'AI' : 'DETERMINISTIC_FALLBACK' };
  }

  /**
   * Resume o histórico de um chamado e indica de quem é a bola da vez (DEV ou Cliente).
   */
  public async summarizeTicket(ticket: any, messages: any[]): Promise<TicketSummaryResult> {
    const fallback: TicketSummaryResult = {
      summary: `Chamado #${ticket.ticketNumber || ticket.id} - ${ticket.title} (${ticket.status})`,
      keyPoints: [`Mensagens na thread: ${messages.length}`, `Status atual: ${ticket.status}`],
      pendingActionFrom: ['NEW', 'TRIAGE', 'IN_PROGRESS', 'WAITING_DEPLOY'].includes(ticket.status) ? 'DEV' : 'CUSTOMER',
    };

    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        keyPoints: { type: 'array', items: { type: 'string' } },
        pendingActionFrom: { type: 'string', enum: ['DEV', 'CUSTOMER', 'NONE'] },
      },
      required: ['summary', 'keyPoints', 'pendingActionFrom'],
      additionalProperties: false,
    };

    const conversationText = messages
      .map((m) => `[${m.visibility}] ${m.senderName || 'Ator'}: ${m.message}`)
      .join('\n');

    const systemPrompt = `Você é um assistente de suporte técnico Nível 3. Resuma o histórico da solicitação para o engenheiro DEV rapidamente.`;
    const userPrompt = `Chamado: ${ticket.title}\nStatus: ${ticket.status}\nHistórico:\n${conversationText}`;

    const result = await this.aiService.generateStructured<TicketSummaryResult>(
      systemPrompt,
      userPrompt,
      'TicketSummary',
      schema,
      { fallbackData: fallback },
    );

    const resolved = result || fallback;
    return { ...resolved, source: result ? 'AI' : 'DETERMINISTIC_FALLBACK' };
  }

  /**
   * Sugere um rascunho de resposta para o DEV revisar antes de responder ao cliente.
   * A IA NUNCA responde automaticamente.
   */
  public async suggestReply(ticket: any, messages: any[], internalNotes?: string): Promise<SuggestedReplyResult> {
    const fallback: SuggestedReplyResult = {
      suggestedReply: `Olá! Recebemos sua solicitação sobre "${ticket.title}" e nossa equipe técnica está analisando os logs do sistema. Retornaremos com uma atualização em breve.`,
      isReadyToSend: false,
    };

    const schema = {
      type: 'object',
      properties: {
        suggestedReply: { type: 'string', description: 'Rascunho educado, empático e técnico para ser enviado ao cliente.' },
        isReadyToSend: { type: 'boolean', enum: [false] }, // Estritamente falso
      },
      required: ['suggestedReply', 'isReadyToSend'],
      additionalProperties: false,
    };

    const systemPrompt = `Você é um assistente que redige rascunhos de resposta para analistas de suporte técnico. SEJA CLARO, CORTÊS E PROFISSIONAL. Nunca prometa datas arbitrárias de correção sem autorização.`;
    const userPrompt = `Chamado: ${ticket.title}\nÚltima mensagem do cliente: ${messages[messages.length - 1]?.message || ''}\nNotas internas técnicas: ${internalNotes || 'Nenhuma nota adicional'}`;

    const result = await this.aiService.generateStructured<SuggestedReplyResult>(
      systemPrompt,
      userPrompt,
      'SuggestedReply',
      schema,
      { fallbackData: fallback },
    );

    if (result) {
      result.isReadyToSend = false; // Garante programaticamente que a resposta nunca sai marcada como envio automático
    }

    const resolved = result || fallback;
    return { ...resolved, source: result ? 'AI' : 'DETERMINISTIC_FALLBACK' };
  }

  /**
   * Gera um rascunho de análise de causa raiz para encerramento ou documentação interna do chamado.
   */
  public async draftRootCause(ticket: any, messages: any[]): Promise<RootCauseDraftResult> {
    const fallback: RootCauseDraftResult = {
      rootCauseDraft: `Análise preliminar do chamado #${ticket.ticketNumber || ticket.id}: ${ticket.title}. Requer investigação detalhada de logs pelo engenheiro responsável.`,
      preventionTips: ['Implementar log estruturado para esta ocorrência', 'Adicionar teste de regressão automatizado'],
    };

    const schema = {
      type: 'object',
      properties: {
        rootCauseDraft: { type: 'string' },
        preventionTips: { type: 'array', items: { type: 'string' } },
      },
      required: ['rootCauseDraft', 'preventionTips'],
      additionalProperties: false,
    };

    const systemPrompt = `Você é um engenheiro de software sênior escrevendo um relatório de Causa Raiz (Root Cause Analysis / Postmortem) para um problema técnico resolvido.`;
    const userPrompt = `Chamado: ${ticket.title}\nDescrição: ${ticket.description}\nDiscussão Técnica:\n${messages.map((m) => m.message).join('\n')}`;

    const result = await this.aiService.generateStructured<RootCauseDraftResult>(
      systemPrompt,
      userPrompt,
      'RootCauseDraft',
      schema,
      { fallbackData: fallback },
    );

    const resolved = result || fallback;
    return { ...resolved, source: result ? 'AI' : 'DETERMINISTIC_FALLBACK' };
  }
}
