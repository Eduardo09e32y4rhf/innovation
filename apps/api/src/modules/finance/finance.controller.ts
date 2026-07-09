import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly asaasService: AsaasService) {}

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
}
