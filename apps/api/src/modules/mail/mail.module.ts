import { Global, Module } from '@nestjs/common';
import { AccessCredentialsService } from './access-credentials.service';
import { MailService } from './mail.service';

@Global()
@Module({ providers: [MailService, AccessCredentialsService], exports: [MailService, AccessCredentialsService] })
export class MailModule {}
