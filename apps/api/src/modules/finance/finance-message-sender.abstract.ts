/**
 * Abstração para envio de mensagens financeiras.
 * Evita dependência circular entre FinanceModule e CommunicationModule.
 */
export abstract class FinanceMessageSender {
  abstract sendWhatsapp(companyId: string, phone: string, message: string): Promise<void>;
}
