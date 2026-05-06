import { Controller, Get } from '@nestjs/common';
import { WhatsappDomainService } from '../../../../../modules/whatsapp/src/whatsapp.service';
import { mapWhatsappStatus } from './whatsapp.mapper';

@Controller('whatsapp')
export class WhatsappController {
  private readonly service = new WhatsappDomainService();

  @Get('status')
  getStatus() {
    return mapWhatsappStatus(this.service.getStatus());
  }
}
