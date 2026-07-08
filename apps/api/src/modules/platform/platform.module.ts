import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformController } from './platform.controller';
import { PlatformRepository } from './platform.repository';
import { PlatformService } from './platform.service';
import { GlobalPermissionsController } from './global-permissions.controller';
import { GlobalPermissionsService } from './global-permissions.service';
import { PlatformPlansController } from './plans.controller';
import { PlatformPlansService } from './plans.service';

@Module({
  imports: [AuthModule],
  controllers: [PlatformController, GlobalPermissionsController, PlatformPlansController],
  providers: [PlatformService, PlatformRepository, GlobalPermissionsService, PlatformPlansService],
  exports: [PlatformService, GlobalPermissionsService],
})
export class PlatformModule {}
