import { Module } from '@nestjs/common';
import { PlatformHubController } from './platform-hub.controller';
import { PlatformHubService } from './platform-hub.service';

@Module({
  controllers: [PlatformHubController],
  providers: [PlatformHubService],
  exports: [PlatformHubService],
})
export class PlatformHubModule {}
