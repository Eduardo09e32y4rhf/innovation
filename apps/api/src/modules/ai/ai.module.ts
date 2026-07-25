import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiGuardrailsService } from './ai-guardrails.service';
import { AiUsageService } from './ai-usage.service';
import { PlatformAiService } from './platform-ai.service';
import { SupportAiService } from './support-ai.service';
import { DatabaseModule } from '../../database/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiGuardrailsService,
    AiUsageService,
    PlatformAiService,
    SupportAiService,
  ],
  exports: [
    AiService,
    AiGuardrailsService,
    AiUsageService,
    PlatformAiService,
    SupportAiService,
  ],
})
export class AiModule {}
