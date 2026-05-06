import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';

@Module({
  controllers: [WhatsappController],
})
export class WhatsappApiModule {}
