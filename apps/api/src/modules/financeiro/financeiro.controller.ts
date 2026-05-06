import { Controller, Get } from '@nestjs/common';
import { FinanceiroDomainService } from '../../../../../modules/financeiro/src/financeiro.service';
import { mapFinanceiroSummary } from './financeiro.mapper';

@Controller('financeiro')
export class FinanceiroController {
  private readonly service = new FinanceiroDomainService();

  @Get('status')
  getStatus() {
    return this.service.getStatus();
  }

  @Get('summary')
  getSummary() {
    return mapFinanceiroSummary(this.service.getSummary());
  }
}
