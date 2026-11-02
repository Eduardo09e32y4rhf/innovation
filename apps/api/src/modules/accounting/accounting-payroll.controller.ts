import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { contentDisposition, EXPOSED_HEADERS } from '../../common/pdf/pdf-response';
import type { JwtUser } from '../../common/types/auth.types';
import { PayrollItemDto, RemoveItemQueryDto } from './accounting-payroll.dto';
import { AccountingPayrollDataService } from './accounting-payroll-data.service';
import { AccountingPayrollExportService } from './accounting-payroll-export.service';
import { AccountingPayrollItemsService } from './accounting-payroll-items.service';

/** Folha manual da contabilidade (editar linhas, validar, baixar). Somente DEV, CEO e CONTABIL; CONTABIL só nas empresas que atende. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL')
@Controller('accounting')
export class AccountingPayrollController {
  constructor(
    private readonly data: AccountingPayrollDataService,
    private readonly items: AccountingPayrollItemsService,
    private readonly exporter: AccountingPayrollExportService,
  ) {}

  @Get('companies/:companyId/payroll/:month/sheet')
  sheet(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Param('month') month: string) {
    return this.data.sheet(actor, companyId, month);
  }

  @Get('companies/:companyId/payroll/:month/validation')
  validation(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Param('month') month: string) {
    return this.data.validate(actor, companyId, month);
  }

  @Get('companies/:companyId/payroll/:month/fiscal-summary')
  fiscalSummary(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Param('month') month: string) {
    return this.data.fiscalSummary(actor, companyId, month);
  }

  @Get('companies/:companyId/payroll/:month/export.csv')
  async exportCsv(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Param('month') month: string, @Res() res: any) {
    const file = await this.exporter.csv(actor, companyId, month);
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', contentDisposition(file.filename));
    res.header('Cache-Control', 'private, no-store');
    res.header('Access-Control-Expose-Headers', EXPOSED_HEADERS);
    return res.send(file.content);
  }

  @Get('companies/:companyId/payroll/:month/export.pdf')
  exportPdf(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Param('month') month: string, @Res() res: any) {
    return this.exporter.pdf(actor, companyId, month, res);
  }

  @Post('payroll/:id/items')
  addItem(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PayrollItemDto) {
    return this.items.add(actor, id, dto);
  }

  @Put('payroll/:id/items/:itemId')
  updateItem(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Param('itemId', ParseUUIDPipe) itemId: string, @Body() dto: PayrollItemDto) {
    return this.items.update(actor, id, itemId, dto);
  }

  @Delete('payroll/:id/items/:itemId')
  removeItem(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Param('itemId', ParseUUIDPipe) itemId: string, @Query() query: RemoveItemQueryDto) {
    return this.items.remove(actor, id, itemId, query.reason);
  }
}
