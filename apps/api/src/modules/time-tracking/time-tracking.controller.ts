import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { CreatePunchDto } from './dto/create-punch.dto';

@Controller('time-tracking')
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post('punch')
  createPunch(@Body() createPunchDto: CreatePunchDto) {
    return this.timeTrackingService.createPunch(createPunchDto);
  }

  @Get()
  findAll() {
    return this.timeTrackingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timeTrackingService.findOne(id);
  }
}
