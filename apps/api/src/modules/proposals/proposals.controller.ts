import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { ProposalsService, CreateProposalDto, AcceptTermsDto } from './proposals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV')
  @Post()
  async createProposal(@Request() req: any, @Body() data: CreateProposalDto) {
    return this.proposalsService.createProposal(req.user.id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV')
  @Get()
  async listProposals() {
    return this.proposalsService.listProposals();
  }

  @UseGuards(JwtAuthGuard)
  @Get('company')
  async getCompanyProposals(@Request() req: any) {
    return this.proposalsService.listProposals(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.proposalsService.getProposalStatus(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV')
  @Post(':id/send')
  async sendProposal(@Request() req: any, @Param('id') id: string) {
    return this.proposalsService.sendProposal(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/accept-terms')
  async acceptTerms(@Request() req: any, @Param('id') id: string, @Body() data: AcceptTermsDto) {
    return this.proposalsService.acceptTerms(id, data, req.user.email);
  }
}
