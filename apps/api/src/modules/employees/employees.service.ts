import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { JwtUser, UserRole } from '../../common/types/auth.types';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesRepository } from './employees.repository';

const DEFAULT_PANEL_PASSWORD = process.env.DEFAULT_EMPLOYEE_PASSWORD ?? 'Innovation@123';
const EMPLOYEE_ACCESS_ROLES: UserRole[] = ['FUNCIONARIO', 'GESTOR', 'RH', 'ADMIN', 'CONSULTA'];

@Injectable()
export class EmployeesService {
  constructor(private readonly repository: EmployeesRepository) {}

  async list(companyId: string, actor: JwtUser) {
    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') {
      return this.repository.list(companyId);
    }
    if (actor.role === 'GESTOR') {
      const managerEmployee = await this.repository.findByUserId(companyId, actor.sub, actor.email);
      if (!managerEmployee) return [];
      const team = await this.repository.listByManager(companyId, managerEmployee.id);
      return [managerEmployee, ...team.filter((employee) => employee.id !== managerEmployee.id)];
    }
    if (actor.role === 'FUNCIONARIO') {
      const employee = await this.repository.findByUserId(companyId, actor.sub, actor.email);
      return employee ? [employee] : [];
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
    await this.ensureRegistrationAvailable(companyId, dto.registration);
    const employee = await this.repository.create(companyId, this.toData(dto));
    await this.syncPanelAccess(companyId, employee, dto);
    return this.get(companyId, employee.id);
  }

  async update(companyId: string, id: string, dto: UpdateEmployeeDto) {
    if (dto.cpf) {
      const existing = await this.repository.findByCpf(dto.cpf);
      if (existing && existing.id !== id) throw new ConflictException('CPF already registered');
    }
    await this.ensureRegistrationAvailable(companyId, dto.registration, id);
    const result = await this.repository.update(companyId, id, this.toData(dto));
    if (!result.count) throw new NotFoundException('Employee not found');
    const employee = await this.get(companyId, id);
    await this.syncPanelAccess(companyId, employee, dto);
    return this.get(companyId, id);
  }

  async terminate(companyId: string, id: string) {
    const result = await this.repository.update(companyId, id, { status: 'TERMINATED' });
    if (!result.count) throw new NotFoundException('Employee not found');
    return this.get(companyId, id);
  }

  async delete(companyId: string, id: string) {
    const result = await this.repository.delete(companyId, id);
    if (!result.count) throw new NotFoundException('Employee not found');
    return { deleted: true };
  }

  private async ensureRegistrationAvailable(companyId: string, registration?: string | null, currentEmployeeId?: string) {
    const normalized = registration?.trim();
    if (!normalized) return;
    const existing = await this.repository.findByRegistration(companyId, normalized);
    if (existing && existing.id !== currentEmployeeId) throw new ConflictException('Matricula already registered');
  }

  private async syncPanelAccess(companyId: string, employee: any, dto: CreateEmployeeDto | UpdateEmployeeDto) {
    if (dto.accessEnabled === undefined) return;

    if (dto.accessEnabled !== 'YES') {
      if (employee.userId) await this.repository.updateUser(companyId, employee.userId, { isActive: false });
      return;
    }

    const role = this.resolveAccessRole(dto.accessProfile);
    const email = (dto.email ?? employee.email)?.trim().toLowerCase();
    if (!email) throw new ConflictException('E-mail obrigatorio para acesso ao painel');

    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser && existingUser.companyId !== companyId) throw new ConflictException('E-mail already registered in another company');
    if (existingUser) {
      const linkedEmployee = await this.repository.findByUserId(companyId, existingUser.id);
      if (linkedEmployee && linkedEmployee.id !== employee.id) throw new ConflictException('User already linked to another employee');
      await this.repository.updateUser(companyId, existingUser.id, {
        name: dto.name ?? employee.name,
        email,
        role,
        isActive: true,
      });
      if (employee.userId !== existingUser.id) await this.repository.updateUserLink(companyId, employee.id, existingUser.id);
      return;
    }

    const user = await this.repository.createUser({
      companyId,
      name: dto.name ?? employee.name,
      email,
      role,
      passwordHash: await bcrypt.hash(DEFAULT_PANEL_PASSWORD, 12),
      forcePasswordChange: true,
      isActive: true,
    });
    await this.repository.updateUserLink(companyId, employee.id, user.id);
  }

  private resolveAccessRole(role?: string): UserRole {
    if (role && EMPLOYEE_ACCESS_ROLES.includes(role as UserRole)) return role as UserRole;
    return 'FUNCIONARIO';
  }

  private toData(dto: CreateEmployeeDto | UpdateEmployeeDto) {
    const { accessEnabled, accessProfile, ...employeeData } = dto;
    return {
      ...employeeData,
      phone: this.emptyToUndefined(dto.phone),
      rg: this.emptyToUndefined(dto.rg),
      rgIssuer: this.emptyToUndefined(dto.rgIssuer),
      rgState: this.emptyToUndefined(dto.rgState),
      cep: this.emptyToUndefined(dto.cep),
      street: this.emptyToUndefined(dto.street),
      streetNumber: this.emptyToUndefined(dto.streetNumber),
      addressComplement: this.emptyToUndefined(dto.addressComplement),
      neighborhood: this.emptyToUndefined(dto.neighborhood),
      city: this.emptyToUndefined(dto.city),
      state: this.emptyToUndefined(dto.state),
      secondaryPhone: this.emptyToUndefined(dto.secondaryPhone),
      maritalStatus: this.emptyToUndefined(dto.maritalStatus),
      nationality: this.emptyToUndefined(dto.nationality),
      birthplace: this.emptyToUndefined(dto.birthplace),
      observations: this.emptyToUndefined(dto.observations),
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      registration: this.emptyToUndefined(dto.registration),
      managerId: this.emptyToUndefined(dto.managerId),
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
      terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
      salary: dto.salary ?? undefined,
      contractType: this.emptyToUndefined(dto.contractType),
      cnpj: this.emptyToUndefined(dto.cnpj),
      legalName: this.emptyToUndefined(dto.legalName),
      tradeName: this.emptyToUndefined(dto.tradeName),
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
