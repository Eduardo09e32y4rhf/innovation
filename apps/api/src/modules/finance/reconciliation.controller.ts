import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaymentReconciliationService } from './payment-reconciliation.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL')
@Controller('finance/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliation: PaymentReconciliationService) {}

  @Get('divergences')
  divergences() {
    return this.reconciliation.listOpenDivergences();
  }

  @Post('run')
  run() {
    return this.reconciliation.reconcile();
  }
}
