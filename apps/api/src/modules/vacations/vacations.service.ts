import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationStatusDto } from './dto/update-vacation-status.dto';
import { VacationsRepository } from './vacations.repository';

@Injectable()
export class VacationsService {
  constructor(private readonly repository: VacationsRepository) {}

  async list(companyId: string, actor: JwtUser) {
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV') {
      return this.repository.list(companyId);
    }
    if (actor.role === 'GESTOR') {
      return this.repository.listForManager(companyId, actor.sub);
    }
    return this.repository.listForEmployee(companyId, actor.sub);
  }

  async listByEmployee(companyId: string, employeeId: string) {
    await this.ensureEmployee(companyId, employeeId);
    return this.repository.listByEmployee(companyId, employeeId);
  }

  async create(companyId: string, dto: CreateVacationDto) {
    await this.ensureEmployee(companyId, dto.employeeId);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) throw new BadRequestException('End date must be after start date');
    return this.repository.create({
      employeeId: dto.employeeId,
      acquisitionPeriod: dto.acquisitionPeriod,
      startDate,
      endDate,
      daysUsed: dto.daysUsed,
      observation: dto.observation,
    });
  }

  async updateStatus(companyId: string, actor: JwtUser, id: string, dto: UpdateVacationStatusDto) {
    if (actor.role === 'GESTOR') {
      const managerEmployee = await this.repository.findEmployeeByUserId(companyId, actor.sub);
      if (!managerEmployee) throw new ForbiddenException('Permissao insuficiente');
      const vacation = await this.repository.findById(companyId, id);
      if (!vacation) throw new NotFoundException('Vacation request not found');
      const employee = await this.repository.findEmployee(companyId, vacation.employeeId);
      if (!employee || employee.managerId !== managerEmployee.id) throw new ForbiddenException('Permissao insuficiente');
    }
    const result = await this.repository.updateStatus(companyId, id, {
      status: dto.status,
      observation: dto.observation,
    });
    if (!result.count) throw new NotFoundException('Vacation request not found');
    return this.repository.findById(companyId, id);
  }

  private async ensureEmployee(companyId: string, employeeId: string) {
    const employee = await this.repository.findEmployee(companyId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }
}
