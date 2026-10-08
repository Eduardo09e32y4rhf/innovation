import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Post, Res, UseGuards } from '@nestjs/common';
import { contentDisposition } from '../../common/pdf/pdf-response';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateDocumentRequestDto, ReviewDocumentDto } from './recruitment-documents.dto';
import { RecruitmentDocumentsService } from './recruitment-documents.service';

/** Documentos de candidatura: RH e RH - R&S, com modulo e escopo de vaga. Nada aqui cria funcionario. */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH', 'RH_RS')
@Controller('jobs')
export class RecruitmentDocumentsController {
  constructor(private readonly service: RecruitmentDocumentsService) {}

  @Header('Cache-Control', 'no-store')
  @Post('applications/:id/document-requests')
  createRequest(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDocumentRequestDto) {
    return this.service.createRequest(companyId, actor, id, dto);
  }

  @Header('Cache-Control', 'no-store')
  @Get('applications/:id/documents')
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.listForApplication(companyId, actor, id);
  }

  @Post('applications/:id/select')
  select(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.select(companyId, actor, id);
  }

  @Post('applications/:id/forward')
  forward(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.forward(companyId, actor, id);
  }

  @Delete('document-requests/:requestId')
  revoke(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('requestId', ParseUUIDPipe) requestId: string) {
    return this.service.revokeRequest(companyId, actor, requestId);
  }

  @Post('documents/:documentId/review')
  review(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('documentId', ParseUUIDPipe) documentId: string, @Body() dto: ReviewDocumentDto) {
    return this.service.review(companyId, actor, documentId, dto);
  }

  @Get('documents/:documentId/download')
  async download(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('documentId', ParseUUIDPipe) documentId: string, @Res() reply: any) {
    const file = await this.service.download(companyId, actor, documentId);
    reply.header('Content-Type', file.type);
    reply.header('Content-Disposition', contentDisposition(file.name));
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Cache-Control', 'private, no-store');
    return reply.send(file.stream);
  }
}