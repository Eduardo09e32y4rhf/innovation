import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PrivacyRepository } from './privacy.repository';
import { PrivacyService } from './privacy.service';

@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService, PrivacyRepository],
})
export class PrivacyModule {}
