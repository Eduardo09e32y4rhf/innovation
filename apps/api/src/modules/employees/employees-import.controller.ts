import { BadRequestException, Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { EmployeesImportService } from './employees-import.service';

interface MultipartFastifyRequest extends FastifyRequest {
  isMultipart: () => boolean;
  file: () => Promise<MultipartFile | undefined>;
}

@ApiTags('Employees Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RH', 'DEV')
@Controller('employees/import')
export class EmployeesImportController {
  constructor(private readonly importService: EmployeesImportService) {}

  @Get('template')
  @ApiOperation({ summary: 'Download do modelo seguro de importação (.xlsx)' })
  downloadTemplate(@Res() reply: FastifyReply) {
    reply
      .header('Content-Disposition', 'attachment; filename="modelo_importacao_funcionarios.xlsx"')
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .send(this.importService.generateTemplate());
  }

  @Post('validate')
  @ApiConsumes('multipart/form-data')
  async validate(@Req() req: MultipartFastifyRequest) {
    const { companyId } = this.getActor(req);
    const file = await this.readFile(req);
    return this.importService.validate(companyId, file);
  }

  @Post('confirm')
  confirm(@Req() req: FastifyRequest, @CurrentUser() user: JwtUser, @Body() body: { importToken?: string }) {
    if (!body.importToken) throw new BadRequestException('importToken é obrigatório.');
    return this.importService.confirm(user.companyId, user.sub, body.importToken);
  }

  private getActor(req: FastifyRequest): JwtUser {
    const user = (req as any).user as JwtUser | undefined;
    if (!user?.companyId) throw new BadRequestException('Empresa não identificada.');
    return user;
  }

  private async readFile(req: MultipartFastifyRequest) {
    if (!req.isMultipart()) throw new BadRequestException('Requisição deve ser multipart/form-data.');
    const file = await req.file();
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return { filename: file.filename, mimetype: file.mimetype, buffer: await file.toBuffer() };
  }
}
