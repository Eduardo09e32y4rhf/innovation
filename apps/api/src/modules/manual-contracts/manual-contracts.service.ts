import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateManualContractDto } from './dto/create-manual-contract.dto';
import { UpdateManualContractDto } from './dto/update-manual-contract.dto';
import { ManualContractsRepository } from './manual-contracts.repository';
import { PlatformFinanceService } from '../finance/platform-finance.service';

@Injectable()
export class ManualContractsService {
  constructor(
    private readonly repository: ManualContractsRepository,
    private readonly finance: PlatformFinanceService,
  ) {}

  list(companyId?: string) {
    return this.repository.list(companyId);
  }

  async create(dto: CreateManualContractDto, actorId: string) {
    const company = await this.repository.findCompany(dto.companyId);
    if (!company) throw new NotFoundException('Empresa nao encontrada.');
    if (dto.planId && !(await this.repository.findPlan(dto.planId))) throw new NotFoundException('Plano nao encontrado.');
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('O fim da vigencia deve ser posterior ao inicio.');
    const contract = await this.repository.createWithActivation({ ...dto, startsAt, endsAt }, actorId);
    let billingSetupPending = false;
    try {
      const nextDueDate = new Date(startsAt);
      nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
      await this.finance.ensureManualContractBilling(dto.companyId, nextDueDate);
    } catch {
      billingSetupPending = true;
    }
    return { ...contract, billingSetupPending };
  }

  async update(id: string, dto: UpdateManualContractDto, actorId: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Contrato manual nao encontrado.');
    if (dto.planId && !(await this.repository.findPlan(dto.planId))) throw new NotFoundException('Plano nao encontrado.');
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('O fim da vigencia deve ser posterior ao inicio.');
    return this.repository.update(id, { ...dto, startsAt, endsAt }, actorId);
  }

  async delete(id: string, actorId: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Contrato manual nao encontrado.');
    return this.repository.delete(id, actorId);
  }
}
