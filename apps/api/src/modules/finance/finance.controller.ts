import { Controller, Post, Body, Get, UseGuards, Req, Param, ForbiddenException } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(
     private readonly asaasService: AsaasService,
     private readonly prisma: PrismaService
  ) {}

  @Post('test-customer')
  async testCustomer(@Body() body: { name: string; cpfCnpj: string; email: string }) {
    return this.asaasService.createCustomer(body);
  }

  @Post('test-charge')
  async testCharge(@Body() body: { customerId: string; value: number; dueDate: string; description: string }) {
    return this.asaasService.createCharge(body.customerId, {
      value: body.value,
      dueDate: body.dueDate,
      description: body.description,
    });
  }

  @Post('charge/:companyId')
  async generateCharge(@Req() req: any, @Param('companyId') companyId: string, @Body() body: { amount: number; dueDate: string; description: string }) {
    // Basic permissions check could be done via roles guard but inline for simplicity
    if (req.user?.role !== 'DEV' && req.user?.role !== 'COMERCIAL') {
       throw new ForbiddenException('Sem permissão');
    }

    // Na vida real a gente puxaria o customerId pelo companyId (usando a injeção do Prisma que falta adicionar no construtor mas já está disponível no módulo que exporta o serviço se injetarmos Prisma)
    const asaasServiceAny = this.asaasService as any;
    // However, if PrismaService is not injected here directly, let's inject it.

    // Since I added PrismaService to constructor...
    const company = await this.prisma.company.findUnique({ where: { id: companyId }});
    if (!company || !company.asaasCustomerId) {
       throw new ForbiddenException('Empresa não possui customerId no Asaas');
    }

    const charge = await this.asaasService.createCharge(company.asaasCustomerId, {
      value: body.amount,
      dueDate: body.dueDate,
      description: body.description,
    });

    // Save local invoice copy
    await this.prisma.platformInvoice.create({
       data: {
         companyId: company.id,
         amount: body.amount,
         dueDate: new Date(body.dueDate),
         status: 'OPEN',
       }
    });

    return charge;
  }
}
