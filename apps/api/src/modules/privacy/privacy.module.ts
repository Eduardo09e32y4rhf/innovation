import { Module, forwardRef } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PrivacyRepository } from './privacy.repository';
import { PrivacyService } from './privacy.service';

import { QueueModule } from '../queue/queue.module';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [forwardRef(() => QueueModule), SupportModule],
  controllers: [PrivacyController],
  providers: [PrivacyService, PrivacyRepository],
  exports: [PrivacyService],
})
export class PrivacyModule {}
