import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateManualContractDto } from './dto/create-manual-contract.dto';
import { UpdateManualContractDto } from './dto/update-manual-contract.dto';
import { ManualContractsRepository } from './manual-contracts.repository';

@Injectable()
export class ManualContractsService {
  constructor(private readonly repository: ManualContractsRepository) {}

  list() {
    return this.repository.list();
  }

  async create(dto: CreateManualContractDto, actorId: string) {
    const company = await this.repository.findCompany(dto.companyId);
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    if (dto.planId && !(await this.repository.findPlan(dto.planId))) throw new NotFoundException('Plano não encontrado.');
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('O fim da vigência deve ser posterior ao início.');
    return this.repository.createWithActivation({ ...dto, startsAt, endsAt }, actorId);
  }

  async update(id: string, dto: UpdateManualContractDto, actorId: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Contrato manual não encontrado.');
    if (dto.planId && !(await this.repository.findPlan(dto.planId))) throw new NotFoundException('Plano não encontrado.');
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('O fim da vigência deve ser posterior ao início.');
    return this.repository.update(id, { ...dto, startsAt, endsAt }, actorId);
  }
}
