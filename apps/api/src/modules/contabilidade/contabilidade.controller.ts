import { Controller, Get } from '@nestjs/common';
import { ContabilidadeDomainService } from '../../../../../modules/contabilidade/src/contabilidade.service';
import { mapContabilidadeSummary } from './contabilidade.mapper';

@Controller('contabilidade')
export class ContabilidadeController {
  private readonly service = new ContabilidadeDomainService();

  @Get('status')
  getStatus() {
    return this.service.getStatus();
  }

  @Get('summary')
  async getSummary() {
    return mapContabilidadeSummary(await this.service.getSummary());
  }
}
