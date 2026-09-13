import { Injectable } from '@nestjs/common';
import { CreatePunchDto } from './dto/create-punch.dto';

@Injectable()
export class TimeTrackingService {
  createPunch(createPunchDto: CreatePunchDto) {
    return {
      message: 'This action adds a new time punch',
      data: createPunchDto,
    };
  }

  findAll() {
    return `This action returns all time tracking records`;
  }

  findOne(id: string) {
    return `This action returns a #${id} time tracking record`;
  }
}
