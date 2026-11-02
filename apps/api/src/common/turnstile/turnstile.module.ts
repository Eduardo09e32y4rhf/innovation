import { Global, Module } from '@nestjs/common';
import { TurnstileGuard, TurnstileOptionalGuard } from './turnstile.guard';
import { TurnstileService } from './turnstile.service';

@Global()
@Module({ providers: [TurnstileService, TurnstileGuard, TurnstileOptionalGuard], exports: [TurnstileService, TurnstileGuard, TurnstileOptionalGuard] })
export class TurnstileModule {}
