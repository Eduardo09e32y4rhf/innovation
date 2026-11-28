import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import { CandidateAuthGuard } from './candidate-account.guard';
import { JobsService } from './jobs.service';
import { calculateMatch } from './calculate-match';

class SimulateMatchDto {
  @IsOptional() @IsString() @MaxLength(80) edu?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) cnh?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
}

@Controller('careers/jobs')
@UseGuards(CandidateAuthGuard)
export class CareerMatchController {
  constructor(private readonly prisma: PrismaService, private readonly jobs: JobsService) {}

  private async result(jobId: string, account: any, hypothetical?: SimulateMatchDto) {
    const { job: rawJob } = await this.jobs.publicJobById(jobId);
    const job = rawJob as typeof rawJob & { closed?: boolean; acceptsApplications?: boolean; requirements?: string[] };
    const criteria = await this.prisma.jobCriterion.findMany({ where: { jobId }, orderBy: { position: 'asc' } });
    const profile = hypothetical ? { ...account,
      education: hypothetical.edu ? [{ level: hypothetical.edu, status: 'Completo' }] : account.education,
      driverLicenseCategory: hypothetical.cnh ?? account.driverLicenseCategory,
      skills: hypothetical.skills ?? account.skills,
    } : account;
    const result = calculateMatch(profile, { ...job, criteria });
    return job.closed || job.acceptsApplications === false ? { ...result, score: 0, level: 'bad' as const } : result;
  }

  @Get()
  async list(@Req() req: any, @Query('withMatch') withMatch?: string) {
    const { jobs } = await this.jobs.allPublicJobs();
    if (withMatch !== '1') return { jobs };
    if (!jobs.length) return { jobs: [] };
    const criteria = await this.prisma.jobCriterion.findMany({ where: { jobId: { in: jobs.map(job => job.id) } }, orderBy: { position: 'asc' } });
    const byJob = new Map<string, typeof criteria>();
    for (const criterion of criteria) { const rows = byJob.get(criterion.jobId) ?? []; rows.push(criterion); byJob.set(criterion.jobId, rows); }
    return { jobs: jobs.map(job => ({ ...job, match: calculateMatch(req.candidateAccount, { ...job, criteria: byJob.get(job.id) ?? [] }) })) };
  }

  @Get(':id/match')
  match(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) { return this.result(id, req.candidateAccount); }

  @Post(':id/match/simulate')
  simulate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any, @Body() dto: SimulateMatchDto) { return this.result(id, req.candidateAccount, dto); }
}
