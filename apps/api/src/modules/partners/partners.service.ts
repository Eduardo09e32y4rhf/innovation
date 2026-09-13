import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.partner.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, dto: CreatePartnerDto) {
    const exists = await this.prisma.partner.findFirst({
      where: { companyId, document: dto.document, deletedAt: null },
    });
    if (exists) throw new BadRequestException('Parceiro/Fornecedor já cadastrado com este documento.');

    return this.prisma.partner.create({
      data: {
        companyId,
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        document: dto.document,
        email: dto.email,
        phone: dto.phone,
        contactName: dto.contactName,
        address: dto.address,
      },
    });
  }
}
