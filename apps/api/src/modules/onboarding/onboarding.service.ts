import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OnboardingRepository } from './onboarding.repository';

@Injectable()
export class OnboardingService {
  constructor(private readonly repo: OnboardingRepository) {}

  list(companyId: string) {
    return this.repo.findAll(companyId);
  }

  async get(companyId: string, id: string) {
    const flow = await this.repo.findOne(companyId, id);
    if (!flow) throw new NotFoundException('Onboarding nao encontrado');
    return flow;
  }

  async getByEmployee(companyId: string, employeeId: string) {
    const flow = await this.repo.findByEmployee(companyId, employeeId);
    if (!flow) throw new NotFoundException('Onboarding do funcionario nao encontrado');
    return flow;
  }

  async create(companyId: string, employeeId: string) {
    const existing = await this.repo.findByEmployee(companyId, employeeId);
    if (existing) throw new ConflictException('Ja existe um onboarding ativo para este funcionario');
    return this.repo.create(companyId, employeeId);
  }

  async completeTask(companyId: string, taskId: string) {
    return this.repo.completeTask(companyId, taskId);
  }

  async delete(companyId: string, id: string) {
    const flow = await this.repo.findOne(companyId, id);
    if (!flow) throw new NotFoundException('Onboarding nao encontrado');
    return this.repo.softDelete(companyId, id);
  }
}
