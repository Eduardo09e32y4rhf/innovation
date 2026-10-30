import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, ParseUUIDPipe } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { AcceptTermsDto, CreateProposalDto } from './dto/proposal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('proposals')
@RequiresFeature('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEV', 'COMERCIAL')
  @Post()
  async createProposal(@Request() req: any, @Body() data: CreateProposalDto) {
    return this.proposalsService.createProposal(req.user.sub || req.user.id, data, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEV', 'COMERCIAL')
  @Get()
  async listProposals(@Request() req: any) {
    return this.proposalsService.listProposals(undefined, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CEO')
  @Get('company')
  async getCompanyProposals(@Request() req: any) {
    return this.proposalsService.listProposals(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CEO')
  @Get(':id/status')
  async getStatus(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.proposalsService.getProposalStatus(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEV', 'COMERCIAL')
  @Post(':id/send')
  async sendProposal(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.proposalsService.sendProposal(id, req.user.sub || req.user.id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CEO')
  @Post(':id/accept-terms')
  async acceptTerms(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() data: AcceptTermsDto) {
    return this.proposalsService.acceptTerms(id, data, req.user.email, req.user);
  }
}
