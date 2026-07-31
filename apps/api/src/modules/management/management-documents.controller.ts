import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AsoReferralPdfDto, LegalNoticePdfDto } from './dto/management-document.dto';
import { ManagementDocumentsService } from './management-documents.service';

@Controller('management/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManagementDocumentsController {
  constructor(private readonly service: ManagementDocumentsService) {}

  @Get('aso/:id/referral')
  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR')
  async asoReferral(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Res() response: any,
  ) {
    const generated = await this.service.createAsoReferralFromRecord(companyId, actor.sub, id);
    await this.service.stream(generated, actor, response);
  }

  @Post('aso/referral')
  @Roles('DEV', 'ADMIN', 'RH')
  async asoReferralPreview(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Body() body: AsoReferralPdfDto,
    @Res() response: any,
  ) {
    const generated = await this.service.createAsoReferralPreview(companyId, actor.sub, body);
    await this.service.stream(generated, actor, response);
  }

  @Get('notifications/:id/legal-notice')
  @Roles('DEV', 'ADMIN', 'RH')
  async notificationLegalNotice(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Res() response: any,
  ) {
    const generated = await this.service.createLegalNoticeFromNotification(companyId, actor.sub, id);
    await this.service.stream(generated, actor, response);
  }

  @Post('legal-notice')
  @Roles('DEV', 'ADMIN', 'RH')
  async legalNoticePreview(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Body() body: LegalNoticePdfDto,
    @Res() response: any,
  ) {
    const generated = await this.service.createLegalNoticePreview(companyId, actor.sub, body);
    await this.service.stream(generated, actor, response);
  }

  @Get('closings/:id')
  @Roles('DEV', 'ADMIN', 'RH')
  async closing(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Res() response: any,
  ) {
    const generated = await this.service.createClosingReport(companyId, actor.sub, id);
    await this.service.stream(generated, actor, response);
  }
}
