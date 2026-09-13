import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Post()
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.performanceService.create(createReviewDto);
  }

  @Get()
  findAll() {
    return this.performanceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.performanceService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.performanceService.remove(id);
  }
}
