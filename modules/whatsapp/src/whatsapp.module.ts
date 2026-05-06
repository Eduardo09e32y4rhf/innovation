import { WhatsappDomainService } from './whatsapp.service.js';

export function createWhatsappModule() {
  return {
    name: 'whatsapp',
    service: new WhatsappDomainService(),
  };
}
