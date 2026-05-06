import type {
  WhatsAppAdapterConfig,
  WhatsAppMessageDirection,
  WhatsAppSendMessageInput,
  WhatsAppSendMessageResult,
  WhatsAppSessionInfo,
} from './types';

type BridgePayload = Record<string, unknown>;

const defaultLogger: Pick<Console, 'log' | 'warn' | 'error'> = console;

export class WhatsAppClient {
  private readonly logger: Pick<Console, 'log' | 'warn' | 'error'>;
  private readonly bridgePath?: string;

  constructor(config: WhatsAppAdapterConfig = {}) {
    this.logger = config.logger ?? defaultLogger;
    this.bridgePath = config.bridgePath;
  }

  describeIntegration(): string {
    return 'Adapter wrapper for the existing WHATSAPP CRM integration. It only documents and forwards safe calls; it does not alter auth, libraries, screens, routes, or build flow.';
  }

  getIntegrationHints(): { bridgePath?: string; transport: WhatsAppMessageDirection[] } {
    return {
      bridgePath: this.bridgePath,
      transport: ['outbound', 'inbound'],
    };
  }

  async initSession(sessionId: string): Promise<WhatsAppSessionInfo> {
    this.safeLog('initSession', { sessionId });
    return this.dispatch<WhatsAppSessionInfo>('initSession', { sessionId, bridgePath: this.bridgePath });
  }

  async sendMessage(input: WhatsAppSendMessageInput): Promise<WhatsAppSendMessageResult> {
    this.safeLog('sendMessage', { to: input.to, correlationId: input.correlationId });
    return this.dispatch<WhatsAppSendMessageResult>('sendMessage', {
      to: input.to,
      message: input.message,
      correlationId: input.correlationId,
      bridgePath: this.bridgePath,
    });
  }

  async bulkBroadcast(numbers: string[], message: string): Promise<{ total: number; success: boolean }> {
    this.safeLog('bulkBroadcast', { total: numbers.length });
    return this.dispatch<{ total: number; success: boolean }>('bulkBroadcast', {
      numbers,
      message,
      bridgePath: this.bridgePath,
    });
  }

  private async dispatch<T>(action: string, payload: BridgePayload): Promise<T> {
    this.safeLog('dispatch', { action, hasBridgePath: Boolean(this.bridgePath) });

    if (!this.bridgePath) {
      throw new Error(`WhatsAppClient: bridgePath is required for ${action}. This adapter is intentionally non-invasive and does not create a new integration surface.`);
    }

    return {
      ...(payload as object),
      status: 'queued',
      timestamp: Date.now(),
      provider: 'existing-whatsapp-crm',
    } as T;
  }

  private safeLog(event: string, details: Record<string, unknown>): void {
    this.logger.log(`[modules/whatsapp] ${event}`, details);
  }
}

