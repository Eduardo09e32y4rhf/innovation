import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import { CandidateAuthGuard } from './candidate-account.guard';
import { JobsService } from './jobs.service';

class SimulateMatchDto {
  @IsOptional() @IsString() @MaxLength(80) edu?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) cnh?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
}

const fold = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
const level = (value: unknown) => {
  const text = fold(value);
  if (text.includes('pos') || text.includes('doutor') || text.includes('mestr')) return 4;
  if (text.includes('superior') || text.includes('gradu')) return 3;
  if (text.includes('tecnic')) return 2;
  if (text.includes('medio')) return 1;
  if (text.includes('fundamental')) return 0;
  return -1;
};

@Controller('careers/jobs')
@UseGuards(CandidateAuthGuard)
export class CareerMatchController {
  constructor(private readonly prisma: PrismaService, private readonly jobs: JobsService) {}

  private async result(jobId: string, account: any, hypothetical?: SimulateMatchDto) {
    const { job: rawJob } = await this.jobs.publicJobById(jobId);
    const job = rawJob as typeof rawJob & { closed?: boolean; acceptsApplications?: boolean; requirements?: string[] };
    if (job.closed || job.acceptsApplications === false) return { score: 0, level: 'bad', missing: [], requirements: [] };
    const savedCriteria = await this.prisma.jobCriterion.findMany({ where: { jobId }, orderBy: { position: 'asc' } });
    const criteria = savedCriteria.length ? savedCriteria : (job.requirements ?? []).map((name: string, position: number) => ({ id: `legacy-${position}`, name, value: name, kind: 'SKILL', isMandatory: true, weight: 1, position }));
    const profile = hypothetical ? {
      education: hypothetical.edu ? [{ level: hypothetical.edu }] : account.education,
      driverLicenseCategory: hypothetical.cnh ?? account.driverLicenseCategory,
      skills: hypothetical.skills ?? account.skills,
    } : account;
    const skills = Array.isArray(profile.skills) ? profile.skills.map(fold) : Array.isArray(profile.skills?.items) ? profile.skills.items.map(fold) : [];
    const storedLicenses = Array.isArray(profile.driverLicenseCategory) ? profile.driverLicenseCategory.map(fold) : profile.driverLicenseCategory ? [fold(profile.driverLicenseCategory)] : [];
    const licenses = [...new Set(storedLicenses.flatMap((item: string) => item === 'ab' ? ['ab', 'a', 'b'] : item === 'ac' ? ['ac', 'a', 'c'] : item === 'ad' ? ['ad', 'a', 'd'] : item === 'ae' ? ['ae', 'a', 'e'] : [item]))];
    const education = Array.isArray(profile.education) ? profile.education : [];
    const requirements = criteria.filter((criterion) => criterion.name.trim()).map((criterion) => {
      const kind = String(criterion.kind || 'SKILL').toUpperCase();
      const target = criterion.value || criterion.name;
      let met = false;
      if (kind === 'CNH' || kind === 'LICENSE') {
        const accepted = target.split(/[;,/]/).map((item: string) => fold(item.replace(/\bcnh\b/gi, '').trim())).filter(Boolean);
        met = accepted.some((item: string) => licenses.includes(item));
      } else if (kind === 'EDUCATION') {
        const required = level(target);
        met = required >= 0 && education.some((item: any) => level(item.level) >= required);
      } else {
        met = skills.some((skill: string) => skill.includes(fold(target)) || fold(target).includes(skill));
      }
      return { label: criterion.name, must: criterion.isMandatory, met, weight: criterion.weight };
    });
    const required = requirements.filter((item) => item.must);
    const optional = requirements.filter((item) => !item.must);
    const ratio = (items: typeof requirements) => items.length ? items.filter((item) => item.met).reduce((sum, item) => sum + item.weight, 0) / items.reduce((sum, item) => sum + item.weight, 0) : 1;
    const missing = requirements.filter((item) => !item.met).map((item) => item.label);
    const missingMandatory = required.some((item) => !item.met);
    const rawScore = requirements.length ? Math.round(ratio(required) * 80 + ratio(optional) * 20) : 0;
    const score = missingMandatory ? Math.min(45, rawScore) : rawScore;
    const resultLevel = missingMandatory ? (score < 25 ? 'bad' : 'warn') : requirements.length && score >= 80 ? 'ideal' : 'warn';
    return { score, level: resultLevel, missing, requirements: requirements.map(({ label, must, met }) => ({ label, must, met })) };
  }

  @Get()
  async list(@Req() req: any, @Query('withMatch') withMatch?: string) {
    const { jobs } = await this.jobs.allPublicJobs();
    if (withMatch !== '1') return { jobs };
    return { jobs: await Promise.all(jobs.map(async (job: any) => ({ ...job, match: await this.result(job.id, req.candidateAccount) }))) };
  }

  @Get(':id/match')
  match(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) { return this.result(id, req.candidateAccount); }

  @Post(':id/match/simulate')
  simulate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any, @Body() dto: SimulateMatchDto) { return this.result(id, req.candidateAccount, dto); }
}
