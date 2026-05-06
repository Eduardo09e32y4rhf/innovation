import { WhatsAppClient } from '../client.js';
import type { WhatsappStatus } from './whatsapp.types.js';

export class WhatsappDomainService {
  private readonly client = new WhatsAppClient();

  getStatus(): WhatsappStatus & { description: string } {
    return {
      status: 'ok',
      module: 'whatsapp',
      adapter: 'safe-read-only',
      legacyCrm: 'preserved',
      description: this.client.describeIntegration(),
    };
  }
}
