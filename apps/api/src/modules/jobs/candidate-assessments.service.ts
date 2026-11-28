import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CandidatePortalAssessment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BANK_VERSION } from './candidate-question-bank';
import { ASSESSMENT_KINDS, ASSESSMENT_LABELS, assessmentKind, ESSAY_PROMPT, ESSAY_RUBRIC, essayWordCount, gradeAssessment, publicQuestions, REQUIRED_ASSESSMENTS, selectAssessmentQuestions, validateAssessmentAnswers, type AssessmentKind, type AssessmentQuestion } from './candidate-assessment.rules';
import type { SaveCandidateAssessmentDto } from './dto/candidate-assessment.dto';

@Injectable()
export class CandidateAssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(accountId: string) {
    const rows = await this.prisma.candidatePortalAssessment.findMany({ where: { accountId }, select: { kind: true, status: true, score: true, completedAt: true, shareConsent: true } });
    return ASSESSMENT_KINDS.map(kind => ({ kind, title: ASSESSMENT_LABELS[kind], required: REQUIRED_ASSESSMENTS.includes(kind), status: 'NOT_STARTED', ...rows.find(row => row.kind === kind) }));
  }
  private present(row: CandidatePortalAssessment) {
    const kind = assessmentKind(row.kind);
    return { id: row.id, kind, title: ASSESSMENT_LABELS[kind], status: row.status, revision: row.revision, questions: publicQuestions(row.questions as AssessmentQuestion[]), answers: row.answers, essay: row.essay, score: row.score, shareConsent: row.shareConsent, completedAt: row.completedAt, prompt: kind === 'ESSAY' ? ESSAY_PROMPT : null, rubric: kind === 'ESSAY' ? ESSAY_RUBRIC : [], required: REQUIRED_ASSESSMENTS.includes(kind) };
  }
  async start(accountId: string, rawKind: string) {
    const kind = assessmentKind(rawKind);
    const existing = await this.prisma.candidatePortalAssessment.findUnique({ where: { accountId_kind: { accountId, kind } } });
    if (existing) return this.present(existing);
    try {
      return this.present(await this.prisma.candidatePortalAssessment.create({ data: { accountId, kind, bankVersion: BANK_VERSION, questions: selectAssessmentQuestions(kind), answers: {} } }));
    } catch (error) {
      // Two tabs starting at once must receive the same persisted test.
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const row = await this.prisma.candidatePortalAssessment.findUniqueOrThrow({ where: { accountId_kind: { accountId, kind } } });
      return this.present(row);
    }
  }
  async save(accountId: string, rawKind: string, dto: SaveCandidateAssessmentDto) {
    const kind = assessmentKind(rawKind);
    const row = await this.prisma.candidatePortalAssessment.findUnique({ where: { accountId_kind: { accountId, kind } } });
    if (!row) throw new NotFoundException('Inicie a avaliação primeiro.');
    if (row.status === 'COMPLETED') throw new ConflictException('Esta avaliação já foi concluída.');
    const questions = row.questions as AssessmentQuestion[];
    const answers = validateAssessmentAnswers(questions, dto.answers, dto.complete);
    const essay = dto.essay.trim();
    if (kind !== 'ESSAY' && essay) throw new BadRequestException('Este questionário não recebe redação.');
    if (kind === 'ESSAY' && dto.complete && (essayWordCount(essay) < 150 || essayWordCount(essay) > 600)) throw new BadRequestException('A redação deve ter entre 150 e 600 palavras.');
    const data = { answers, essay, shareConsent: dto.shareConsent, revision: { increment: 1 }, status: dto.complete ? 'COMPLETED' : 'IN_PROGRESS', completedAt: dto.complete ? new Date() : null, score: dto.complete && (kind === 'PORTUGUESE' || kind === 'MATH') ? gradeAssessment(questions, answers) : null };
    const updated = await this.prisma.candidatePortalAssessment.updateMany({ where: { id: row.id, accountId, revision: dto.revision, status: 'IN_PROGRESS' }, data });
    if (!updated.count) throw new ConflictException('Outra aba atualizou esta avaliação. Reabra a avaliação para carregar a versão salva.');
    return this.present(await this.prisma.candidatePortalAssessment.findUniqueOrThrow({ where: { id: row.id } }));
  }
  async share(accountId: string, rawKind: string, shareConsent: boolean) {
    const kind = assessmentKind(rawKind);
    const result = await this.prisma.candidatePortalAssessment.updateMany({ where: { accountId, kind }, data: { shareConsent, revision: { increment: 1 } } });
    if (!result.count) throw new NotFoundException('Avaliação não encontrada.');
    return { shareConsent };
  }
  async sharedForApplication(companyId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({ where: { id: applicationId, companyId, anonymizedAt: null }, select: { portalAccountId: true } });
    if (!application) throw new NotFoundException('Candidatura não encontrada.');
    if (!application.portalAccountId) return [];
    const account = await this.prisma.candidateAccount.findUnique({ where: { id: application.portalAccountId }, select: { id: true, verifiedAt: true } });
    if (!account?.verifiedAt) return [];
    const rows = await this.prisma.candidatePortalAssessment.findMany({ where: { accountId: account.id, status: 'COMPLETED', shareConsent: true } });
    // No drafts, answer keys, private account fields, or unrelated company data.
    return rows.map(row => ({ kind: row.kind, title: ASSESSMENT_LABELS[row.kind as AssessmentKind], score: row.score, completedAt: row.completedAt, essay: row.kind === 'ESSAY' ? row.essay : null, rubric: row.kind === 'ESSAY' ? ESSAY_RUBRIC : [], preferences: ['CULTURE', 'WORK_STYLE'].includes(row.kind) ? (row.questions as AssessmentQuestion[]).map(question => ({ text: question.text, answer: question.options[(row.answers as Record<string, number>)[question.id]] })) : [] }));
  }
}
