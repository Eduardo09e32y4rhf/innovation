import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesRepository } from './employees.repository';

@Injectable()
export class EmployeesService {
  constructor(private readonly repository: EmployeesRepository) {}

  list(companyId: string) {
    return this.repository.list(companyId);
  }

  async get(companyId: string, id: string) {
    const employee = await this.repository.findById(companyId, id);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(companyId: string, dto: CreateEmployeeDto) {
    const existing = await this.repository.findByCpf(dto.cpf);
    if (existing) throw new ConflictException('CPF already registered');
    return this.repository.create(companyId, this.toData(dto));
  }

  async update(companyId: string, id: string, dto: UpdateEmployeeDto) {
    if (dto.cpf) {
      const existing = await this.repository.findByCpf(dto.cpf);
      if (existing && existing.id !== id) throw new ConflictException('CPF already registered');
    }
    const result = await this.repository.update(companyId, id, this.toData(dto));
    if (!result.count) throw new NotFoundException('Employee not found');
    return this.get(companyId, id);
  }

  async terminate(companyId: string, id: string) {
    const result = await this.repository.update(companyId, id, { status: 'TERMINATED' });
    if (!result.count) throw new NotFoundException('Employee not found');
    return this.get(companyId, id);
  }

  private toData(dto: CreateEmployeeDto | UpdateEmployeeDto) {
    return {
      ...dto,
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
      salary: dto.salary ?? undefined,
    };
  }
}
