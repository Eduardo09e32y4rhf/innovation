import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePlatformInvoiceDto, ListPlatformInvoicesDto, UpdatePlatformInvoiceDto } from './dto/platform-finance.dto';
import { PlatformFinanceService } from './platform-finance.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'COMERCIAL')
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: PlatformFinanceService) {}

  @Get('platform/summary')
  summary(@Query() query: ListPlatformInvoicesDto) {
    return this.service.summary(query);
  }

  @Get('platform/invoices')
  list(@Query() query: ListPlatformInvoicesDto) {
    return this.service.list(query);
  }

  @Post('platform/invoices')
  create(@Body() dto: CreatePlatformInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch('platform/invoices/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePlatformInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Post('platform/invoices/:id/sync')
  sync(@Param('id') id: string) {
    return this.service.sync(id);
  }

  @Delete('platform/invoices/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // Compatibility endpoint used by the company detail screen.
  @Post('charge/:companyId')
  createCompanyCharge(
    @Param('companyId') companyId: string,
    @Body() body: { amount: number; dueDate: string; description: string },
  ) {
    return this.service.create({
      companyId,
      amount: body.amount,
      dueDate: body.dueDate,
      description: body.description,
      billingType: 'UNDEFINED',
      sendToAsaas: true,
    });
  }
}