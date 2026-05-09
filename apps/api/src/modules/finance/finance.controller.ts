import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { FinanceService } from './finance.service';

@ApiBearerAuth()
@ApiTags('finance')
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get('summary') summary(@CurrentCompany() companyId: string) { return this.service.summary(companyId); }
  @Get('transactions') list(@CurrentCompany() companyId: string) { return this.service.list(companyId); }
  @Get('due') due(@CurrentCompany() companyId: string, @Query('days') days?: string) {
    return this.service.due(companyId, days ? Number(days) : 7);
  }
  @Post('transactions') create(@CurrentCompany() companyId: string, @Body() dto: CreateTransactionDto) { return this.service.create(companyId, dto); }
  @Get('transactions/:id') get(@CurrentCompany() companyId: string, @Param('id') id: string) { return this.service.get(companyId, id); }
  @Patch('transactions/:id') update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateTransactionDto) { return this.service.update(companyId, id, dto); }
  @Delete('transactions/:id') delete(@CurrentCompany() companyId: string, @Param('id') id: string) { return this.service.delete(companyId, id); }
}
