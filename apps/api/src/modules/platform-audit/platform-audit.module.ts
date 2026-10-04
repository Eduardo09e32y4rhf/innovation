import { Global, Module } from '@nestjs/common';
import { AuditedInterceptor } from './audited.decorator';
import { PlatformAuditController } from './platform-audit.controller';
import { PlatformAuditService } from './platform-audit.service';

@Global()
@Module({
  controllers: [PlatformAuditController],
  providers: [PlatformAuditService, AuditedInterceptor],
  exports: [PlatformAuditService, AuditedInterceptor],
})
export class PlatformAuditModule {}
