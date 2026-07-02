import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationRepository } from './communication.repository';
import { CommunicationService } from './communication.service';
import { CommunicationGateway } from './realtime/communication.gateway';
import { OmniusAdapterService } from './whatsapp/omnius-adapter.service';
import { WhatsappProvider } from './whatsapp/whatsapp.provider';
import { WhatsappSessionService } from './whatsapp/whatsapp-session.service';

@Module({
  controllers: [CommunicationController],
  providers: [
    CommunicationService,
    CommunicationRepository,
    CommunicationGateway,
    OmniusAdapterService,
    WhatsappProvider,
    WhatsappSessionService,
  ],
  exports: [CommunicationService],
})
export class CommunicationModule {}
