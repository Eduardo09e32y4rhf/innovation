import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PaymentProviderService } from './payment-provider.service';
import { Audited } from '../platform-audit/audited.decorator';

class SetProviderDto {
  @IsString()
  @IsIn(['ASAAS', 'MERCADOPAGO'])
  provider!: 'ASAAS' | 'MERCADOPAGO';
}

/** Painel de integrações de pagamento: mostra o que falta configurar e alterna o provedor ativo. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance/integrations')
export class IntegrationsController {
  constructor(private readonly providers: PaymentProviderService) {}

  @Roles('DEV', 'CEO', 'CONTABIL')
  @Get('health')
  health(@Query('test') test?: string) {
    return this.providers.health({ ping: test === '1' || test === 'true' });
  }

  @Roles('DEV', 'CEO')
  @Put('provider')
  @Audited({ action: 'PAYMENT_PROVIDER_CHANGED', entity: 'PlatformSetting' })
  setProvider(@CurrentUser() actor: JwtUser, @Body() dto: SetProviderDto) {
    return this.providers.setActive(dto.provider, actor.sub);
  }
}
