import { Controller, Post, Get, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployeesImportService } from './employees-import.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';

interface MultipartFastifyRequest extends FastifyRequest {
  isMultipart: () => boolean;
  file: () => Promise<MultipartFile | undefined>;
}

@ApiTags('Employees Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees/import')
export class EmployeesImportController {
  constructor(private readonly importService: EmployeesImportService) {}

  @Get('template')
  @ApiOperation({ summary: 'Download do modelo de importação de funcionários (.xlsx)' })
  async downloadTemplate(@Res() reply: FastifyReply) {
    const buffer = this.importService.generateTemplate();
    reply
      .header('Content-Disposition', 'attachment; filename="modelo_importacao_funcionarios.xlsx"')
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .send(buffer);
  }

  @Post()
  @ApiOperation({ summary: 'Importa funcionários via arquivo .xlsx' })
  @ApiConsumes('multipart/form-data')
  async importEmployees(@Req() req: MultipartFastifyRequest) {
    if (!req.isMultipart()) {
      throw new BadRequestException('Requisição deve ser multipart/form-data');
    }

    const data = await req.file();
    if (!data) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const buffer = await data.toBuffer();
    const companyId = (req as any).user?.companyId;

    if (!companyId) {
      throw new BadRequestException('Empresa não identificada');
    }

    return this.importService.importEmployees(companyId, buffer);
  }
}
