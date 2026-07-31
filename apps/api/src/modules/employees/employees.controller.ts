import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';
import { EmployeeDocumentsService } from './employee-documents.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly service: EmployeesService,
    private readonly employeeDocuments: EmployeeDocumentsService,
  ) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.list(companyId, actor);
  }

  @Get(':id/dossier')
  dossier(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.dossier(companyId, actor, id);
  }

  @Roles('ADMIN', 'RH', 'DEV')
  @Get(':id/documents/point-sheet.pdf')
  pointSheetPdf(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Query('month') month: string,
    @Res() response: any,
  ) {
    return this.streamOfficialDocument(companyId, actor, id, 'POINT_SHEET', response, month);
  }

  @Roles('ADMIN', 'RH', 'DEV')
  @Get(':id/documents/occurrences.pdf')
  occurrencesPdf(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Query('month') month: string,
    @Res() response: any,
  ) {
    return this.streamOfficialDocument(companyId, actor, id, 'OCCURRENCES', response, month);
  }

  @Roles('ADMIN', 'RH', 'DEV')
  @Get(':id/documents/record.pdf')
  employeeRecordPdf(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Res() response: any,
  ) {
    return this.streamOfficialDocument(companyId, actor, id, 'EMPLOYEE_RECORD', response);
  }

  @Get(':id')
  get(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    if (id === 'swap-candidates') return this.service.listSwapCandidates(companyId, actor);
    return this.service.get(companyId, actor, id);
  }

  @Roles('ADMIN', 'RH')
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateEmployeeDto) {
    return this.service.create(companyId, dto);
  }

  @Roles('ADMIN', 'RH')
  @Patch(':id')
  update(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(companyId, actor, id, dto);
  }

  @Roles('ADMIN', 'RH')
  @Delete(':id/permanent')
  delete(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.delete(companyId, actor, id);
  }

  @Roles('ADMIN', 'RH')
  @Delete(':id')
  terminate(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.terminate(companyId, actor, id);
  }

  private async streamOfficialDocument(
    companyId: string,
    actor: JwtUser,
    employeeId: string,
    kind: 'POINT_SHEET' | 'OCCURRENCES' | 'EMPLOYEE_RECORD',
    response: any,
    month?: string,
  ) {
    const document = await this.employeeDocuments.generate(companyId, actor, employeeId, kind, month);
    response.header('Content-Type', 'application/pdf');
    response.header('Content-Disposition', `attachment; filename="${encodeURIComponent(document.filename)}"`);
    response.header('Content-Length', document.size);
    response.header('X-Document-Id', document.documentId);
    response.header('X-Document-Sha256', document.sha256);
    response.header('X-Document-Version', document.version);
    return response.send(document.stream);
  }
}

