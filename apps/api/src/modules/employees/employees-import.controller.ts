import { Controller, Post, Get, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployeesImportService } from './employees-import.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Employees Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees/import')
export class EmployeesImportController {
  constructor(private readonly importService: EmployeesImportService) {}

  @Post()
  @ApiOperation({ summary: 'Import employees from CSV/Excel file' })
  @ApiConsumes('multipart/form-data')
  async importFile(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const isMultipart = (req as any).isMultipart();
    if (!isMultipart) {
      throw new BadRequestException('Request must be multipart/form-data');
    }

    const file = await (req as any).file() as MultipartFile;
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.importService.processImport(file);
    return res.send(result);
  }

  @Get('template')
  @ApiOperation({ summary: 'Download import template' })
  async downloadTemplate(@Res() res: FastifyReply) {
    const template = await this.importService.generateTemplate();
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="import-template.csv"');
    return res.send(template);
  }
}