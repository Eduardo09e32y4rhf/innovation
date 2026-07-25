import { Injectable, Logger, ForbiddenException } from '@nestjs/common';

export interface GuardrailCheckResult {
  allowed: boolean;
  reason?: string;
  sanitizedText: string;
}

@Injectable()
export class AiGuardrailsService {
  private readonly logger = new Logger(AiGuardrailsService.name);

  // Palavras-chave ou padrões que indicam tentativa de exfiltração, SQL injection livre ou alteração de estado autônoma
  private readonly forbiddenPatterns = [
    /DROP\s+TABLE/i,
    /DELETE\s+FROM/i,
    /UPDATE\s+.*\s+SET/i,
    /INSERT\s+INTO/i,
    /ALTER\s+TABLE/i,
    /GRANT\s+ALL/i,
    /ignore\s+previous\s+instructions/i,
    /ignore\s+all\s+rules/i,
    /system\s+prompt\s+override/i,
    /execute\s+raw\s+sql/i,
  ];

  /**
   * Valida se uma entrada do usuário ou instrução é segura para ser processada pelo modelo de IA.
   */
  public checkInputSafety(input: string): GuardrailCheckResult {
    if (!input || typeof input !== 'string') {
      return { allowed: true, sanitizedText: '' };
    }

    const trimmed = input.trim();

    for (const pattern of this.forbiddenPatterns) {
      if (pattern.test(trimmed)) {
        this.logger.warn(`[Guardrail Violation] Padrão proibido detectado no prompt: ${pattern}`);
        return {
          allowed: false,
          reason: 'O texto informado contém padrões ou comandos não permitidos pela política de segurança da IA.',
          sanitizedText: '[CONTEÚDO BLOQUEADO POR SEGURANÇA]',
        };
      }
    }

    // Sanitização básica contra strings excessivamente longas que possam causar DoS no modelo
    const maxLength = 10000;
    const sanitizedText = trimmed.length > maxLength ? trimmed.substring(0, maxLength) + '... [TRUNCADO]' : trimmed;

    return { allowed: true, sanitizedText };
  }

  /**
   * Valida se a ação solicitada à IA não tenta executar operações mutacionais proibidas.
   * A IA NUNCA pode alterar dinheiro, senhas, planos ou status físicos autônomanente.
   */
  public enforceReadOnlyOperation(operationName: string): void {
    const forbiddenMutations = [
      'mark_invoice_paid',
      'create_charge_unconfirmed',
      'change_plan',
      'suspend_company',
      'reset_password',
      'close_ticket_automatically',
      'delete_record',
      'execute_free_sql',
      'access_cross_tenant',
    ];

    if (forbiddenMutations.includes(operationName.toLowerCase())) {
      this.logger.error(`[Guardrail Violation] Tentativa de execução de operação proibida pela IA: ${operationName}`);
      throw new ForbiddenException(
        `A IA não tem permissão para executar a operação mutacional '${operationName}'. Apenas usuários humanos autenticados e autorizados podem realizar esta ação.`
      );
    }
  }

  /**
   * Verifica se o ator tem escopo para consultar informações de uma empresa via IA.
   */
  public validateCompanyScope(actor: any, targetCompanyId: string, companyCommercialOwnerId?: string): boolean {
    if (!actor) return false;
    const role = String(actor.profile || actor.role || '').toUpperCase();

    // DEV e ADMIN GLOBALS têm acesso a tudo no escopo técnico
    if (role === 'DEV' || role === 'ADMIN_GLOBAL' || role === 'SUPER_ADMIN') {
      return true;
    }

    // COMERCIAL só acessa se for o dono comercial da empresa
    if (role === 'COMERCIAL') {
      const actorId = actor.sub || actor.id;
      return companyCommercialOwnerId === actorId;
    }

    // Usuário da própria empresa acessa apenas a própria empresa
    if (actor.companyId && actor.companyId === targetCompanyId) {
      return true;
    }

    return false;
  }
}
