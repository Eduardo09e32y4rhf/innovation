import { Global, Module } from '@nestjs/common';
import { TurnstileGuard } from './turnstile.guard';
import { TurnstileService } from './turnstile.service';

@Global()
@Module({ providers: [TurnstileService, TurnstileGuard], exports: [TurnstileService, TurnstileGuard] })
export class TurnstileModule {}
