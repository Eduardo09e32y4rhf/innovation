import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationStatusDto } from './dto/update-vacation-status.dto';
import { VacationsService } from './vacations.service';
import { CreateMedicalCertificateDto } from './dto/create-medical-certificate.dto';
import { RecordVacationPaymentDto } from './dto/record-vacation-payment.dto';
import { UpdateMedicalCertificateStatusDto } from './dto/update-medical-certificate-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA', 'DEV')
@Controller('vacations')
export class VacationsController {
  constructor(private readonly service: VacationsService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.list(companyId, actor);
  }

  @Get('employee/:employeeId')
  listByEmployee(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('employeeId') employeeId: string) {
    return this.service.listByEmployee(companyId, actor, employeeId);
  }

  @Get('employee/:employeeId/entitlements')
  listEntitlements(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('employeeId') employeeId: string) {
    return this.service.listEntitlements(companyId, actor, employeeId);
  }

  @Get('medical-certificates')
  listMedicalCertificates(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.listMedicalCertificates(companyId, actor);
  }

  @Get('medical-certificates/employee/:employeeId')
  listEmployeeMedicalCertificates(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.service.listMedicalCertificates(companyId, actor, employeeId);
  }

  @Post('medical-certificates')
  createMedicalCertificate(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Body() dto: CreateMedicalCertificateDto,
  ) {
    return this.service.createMedicalCertificate(companyId, actor, dto);
  }

  @Roles('ADMIN', 'RH', 'DEV')
  @Patch('medical-certificates/:id/status')
  updateMedicalCertificateStatus(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateMedicalCertificateStatusDto,
  ) {
    return this.service.updateMedicalCertificateStatus(companyId, actor, id, dto);
  }

  @Get(':id/receipt.pdf')
  async receiptPdf(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Res() response: any,
  ) {
    const receipt = await this.service.generateReceiptPdf(companyId, actor, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(receipt.filename)}"`);
    response.setHeader('Content-Length', receipt.buffer.length);
    response.setHeader('X-Document-Id', receipt.documentId);
    response.setHeader('X-Document-Sha256', receipt.sha256);
    response.setHeader('X-Document-Version', receipt.version);
    return response.send(receipt.buffer);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: CreateVacationDto) {
    return this.service.create(companyId, actor, dto);
  }

  @Roles('ADMIN', 'RH', 'DEV')
  @Patch(':id/status')
  updateStatus(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdateVacationStatusDto) {
    return this.service.updateStatus(companyId, actor, id, dto);
  }

  @Roles('ADMIN', 'RH', 'DEV')
  @Post(':id/payments')
  recordPayment(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: RecordVacationPaymentDto,
  ) {
    return this.service.recordPayment(companyId, actor, id, dto);
  }
}
