import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiBearerAuth()
@ApiTags('companies')
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get('me')
  me(@CurrentCompany() companyId: string) {
    return this.service.me(companyId);
  }

  @Patch('me')
  updateMe(@CurrentCompany() companyId: string, @Body() dto: UpdateCompanyDto) {
    return this.service.updateMe(companyId, dto);
  }
}
