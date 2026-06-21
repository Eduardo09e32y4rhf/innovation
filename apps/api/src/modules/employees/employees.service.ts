import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesRepository } from './employees.repository';

@Injectable()
export class EmployeesService {
  constructor(private readonly repository: EmployeesRepository) {}

  async list(companyId: string, actor: JwtUser) {
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV') {
      return this.repository.list(companyId);
    }
    if (actor.role === 'GESTOR') {
      const managerEmployee = await this.repository.findByUserId(companyId, actor.sub);
      if (!managerEmployee) return [];
      return this.repository.listByManager(companyId, managerEmployee.id);
    }
    return [];
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
      phone: this.emptyToUndefined(dto.phone),
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      registration: this.emptyToUndefined(dto.registration),
      managerId: this.emptyToUndefined(dto.managerId),
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
      terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
      salary: dto.salary ?? undefined,
      contractType: this.emptyToUndefined(dto.contractType),
      unit: this.emptyToUndefined(dto.unit),
      workScale: this.emptyToUndefined(dto.workScale),
      customWorkScale: this.emptyToUndefined(dto.customWorkScale),
      dailyWorkload: this.emptyToUndefined(dto.dailyWorkload),
      standardEntry: this.emptyToUndefined(dto.standardEntry),
      standardLunchStart: this.emptyToUndefined(dto.standardLunchStart),
      standardLunchReturn: this.emptyToUndefined(dto.standardLunchReturn),
      standardExit: this.emptyToUndefined(dto.standardExit),
    };
  }

  private emptyToUndefined(value?: string | null) {
    return value?.trim() || undefined;
  }
}
