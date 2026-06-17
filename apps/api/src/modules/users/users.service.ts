import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  list(companyId: string) {
    return this.repository.list(companyId);
  }

  async get(companyId: string, id: string) {
    const user = await this.repository.findById(companyId, id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(companyId: string, dto: CreateUserDto) {
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    return this.repository.create({
      companyId,
      name: dto.name,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: dto.role ?? 'FUNCIONARIO',
    });
  }

  async update(companyId: string, id: string, dto: UpdateUserDto) {
    const { password, ...rest } = dto;
    const data = { ...rest, passwordHash: password ? await bcrypt.hash(password, 12) : undefined };
    const result = await this.repository.update(companyId, id, data);
    if (!result.count) throw new NotFoundException('User not found');
    return this.get(companyId, id);
  }

  async delete(companyId: string, id: string) {
    const result = await this.repository.delete(companyId, id);
    if (!result.count) throw new NotFoundException('User not found');
    return { deleted: true };
  }
}
