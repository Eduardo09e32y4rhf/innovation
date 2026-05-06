import { Injectable } from '@nestjs/common';
import { WhatsappProvider } from './whatsapp.provider';

@Injectable()
export class WhatsappSessionService {
  constructor(private readonly provider: WhatsappProvider) {}

  connect(companyId: string) {
    return this.provider.connect(companyId);
  }

  disconnect(companyId: string) {
    return this.provider.disconnect(companyId);
  }
}
