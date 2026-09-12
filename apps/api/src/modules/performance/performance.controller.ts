import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PerformanceService } from './performance.service';

@UseGuards(JwtAuthGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  @Get('reviews')
  listReviews(@CurrentCompany() companyId: string) {
    return this.service.listReviews(companyId);
  }

  @Get('okrs')
  listOKRs(@CurrentCompany() companyId: string) {
    return this.service.listOKRs(companyId);
  }
}
