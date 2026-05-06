export type WhatsAppMessageDirection = 'inbound' | 'outbound';

export type WhatsAppMessageStatus = 'queued' | 'sent' | 'failed';

export interface WhatsAppSendMessageInput {
  to: string;
  message: string;
  correlationId?: string;
}

export interface WhatsAppSendMessageResult {
  status: WhatsAppMessageStatus;
  timestamp: number;
  provider?: 'existing-whatsapp-crm';
  correlationId?: string;
}

export interface WhatsAppSessionInfo {
  sessionId: string;
  status: 'INITIALIZING' | 'READY' | 'DISCONNECTED';
  qrCode?: string;
}

export interface WhatsAppAdapterConfig {
  /**
   * Optional path to a file-based CRM bridge or Electron IPC endpoint.
   * The adapter never creates connections or changes auth on its own.
   */
  bridgePath?: string;
  /**
   * Optional logger used for safe diagnostics.
   */
  logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}


