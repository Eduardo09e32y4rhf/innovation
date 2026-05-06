import { Controller, Get } from '@nestjs/common';
import { IaDomainService } from '../../../../../modules/ia/src/ia.service';
import { mapIaStatus } from './ia.mapper';

@Controller('ia')
export class IaController {
  private readonly service = new IaDomainService();

  @Get('status')
  getStatus() {
    return mapIaStatus(this.service.getStatus());
  }
}
