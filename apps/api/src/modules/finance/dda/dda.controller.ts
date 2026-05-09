import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { DdaService } from './dda.service';
import { SupportedBank } from './dda.factory';

@ApiBearerAuth()
@ApiTags('finance-dda')
@UseGuards(JwtAuthGuard)
@Controller('finance/dda')
export class DdaController {
  constructor(private readonly ddaService: DdaService) {}

  @Get('providers')
  listProviders() {
    return this.ddaService.listProviders();
  }

  @Post('providers/:bank/connect')
  connectProvider(@Param('bank') bank: SupportedBank) {
    return this.ddaService.connectProvider(bank);
  }

  @Get('boletos')
  async listBoletos(
    @Query('bank') bank?: SupportedBank,
    @Query('document') document?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ddaService.listBoletos(bank, document, startDate, endDate);
  }

  @Post('boletos/:id/reconcile')
  async reconcileBoleto(
    @Param('id') boletoId: string,
    @Body('bank') bank: SupportedBank,
  ) {
    return this.ddaService.reconcileBoleto(bank, boletoId);
  }
}
