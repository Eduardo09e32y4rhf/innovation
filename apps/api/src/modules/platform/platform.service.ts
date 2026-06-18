import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';
import { PlatformRepository } from './platform.repository';

@Injectable()
export class PlatformService {
  constructor(private readonly repository: PlatformRepository) {}

  listCompanies() {
    return this.repository.listCompanies();
  }

  async getCompany(id: string) {
    const company = await this.repository.getCompany(id);
    if (!company) throw new NotFoundException('Empresa nao encontrada');
    return company;
  }

  async createCompany(dto: CreatePlatformCompanyDto) {
    const existing = await this.repository.findUserByEmail(dto.adminEmail);
    if (existing) throw new ConflictException('E-mail do admin ja esta em uso');

    const adminPasswordHash = await bcrypt.hash(dto.adminPassword, 12);
    return this.repository.createCompanyWithAdmin({
      name: dto.name,
      document: dto.document,
      maxUsers: dto.maxUsers ?? 6,
      maxEmployees: dto.maxEmployees ?? 50,
      adminName: dto.adminName,
      adminEmail: dto.adminEmail,
      adminPasswordHash,
    });
  }

  updateCompany(id: string, dto: UpdatePlatformCompanyDto) {
    return this.repository.updateCompany(id, dto);
  }

  async deleteCompany(id: string) {
    await this.repository.deleteCompany(id);
    return { deleted: true };
  }

  stats() {
    return this.repository.globalStats();
  }
}
