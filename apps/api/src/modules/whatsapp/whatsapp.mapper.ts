import type { WhatsappStatus } from '../../../../../modules/whatsapp/src/whatsapp.types';

export function mapWhatsappStatus(status: WhatsappStatus & { description?: string }) {
  return {
    ...status,
    service: 'innovation-api',
  };
}
