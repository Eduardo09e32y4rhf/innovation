export type WhatsappConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE' | 'CONNECTED';

export interface IncomingWhatsappMessage {
  companyId: string;
  externalId?: string;
  phone: string;
  name?: string;
  body: string;
  fromMe: boolean;
  timestamp?: Date;
}

export interface WhatsappProviderEvents {
  onQrCode: (companyId: string, qrCode: string) => void | Promise<void>;
  onStatus: (companyId: string, status: WhatsappConnectionStatus) => void | Promise<void>;
  onMessage: (message: IncomingWhatsappMessage) => void | Promise<void>;
}
