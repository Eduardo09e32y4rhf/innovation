import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateOnboardingFlowDto } from './dto/create-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.svc.list(companyId);
  }

  @Get('employee/:employeeId')
  getByEmployee(
    @CurrentCompany() companyId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.svc.getByEmployee(companyId, employeeId);
  }

  @Get(':id')
  get(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.svc.get(companyId, id);
  }

  @Post()
  create(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateOnboardingFlowDto,
  ) {
    return this.svc.create(companyId, dto.employeeId);
  }

  @Patch('tasks/:taskId/complete')
  completeTask(
    @CurrentCompany() companyId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.svc.completeTask(companyId, taskId);
  }

  @Delete(':id')
  remove(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.svc.delete(companyId, id);
  }
}
