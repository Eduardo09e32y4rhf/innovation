import { Injectable } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class PerformanceService {
  async create(createReviewDto: CreateReviewDto) {
    return 'This action adds a new performance review';
  }

  async findAll() {
    return `This action returns all performance reviews`;
  }

  async findOne(id: string) {
    return `This action returns a #${id} performance review`;
  }

  async remove(id: string) {
    return `This action removes a #${id} performance review`;
  }
}
