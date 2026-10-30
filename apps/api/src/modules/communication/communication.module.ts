import { Module } from '@nestjs/common';
import { isFeatureEnabled } from '../../common/feature-flags';
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
    // Gateway so existe com FEATURE_COMMUNICATION ligada (SEG-14): desligada, nao ha namespace nem socket.io.
    ...(isFeatureEnabled('communication') ? [CommunicationGateway] : []),
    OmniusAdapterService,
    WhatsappProvider,
    WhatsappSessionService,
  ],
  exports: [CommunicationService, WhatsappProvider],
})
export class CommunicationModule {}
