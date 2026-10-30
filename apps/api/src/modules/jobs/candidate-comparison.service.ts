import { Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { visibleEvaluations } from './blind-evaluation';
import { bestPerCriterion, summarizeCriteria, type CriterionSummary } from './candidate-comparison';
import { weightedEvaluationScore } from './recruitment-rules';

/**
 * Leitura agregada para comparar 2 a 4 candidatos da mesma vaga: notas por criterio, pareceres dos entrevistadores,
 * respostas da triagem e documentos. Respeita a avaliacao cega (notas e pareceres dos colegas so depois de avaliar).
 * Nao devolve arquivos nem dados de diversidade (LGPD): documentos saem so com rotulo e situacao.
 */
@Injectable()
export class CandidateComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  async compare(companyId: string, viewer: Pick<JwtUser, 'sub' | 'role'>, jobId: string, ids: string[]) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true, title: true } });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    const apps = await this.prisma.application.findMany({
      where: { companyId, jobId, id: { in: ids } },
      include: {
        candidate: { select: { name: true, email: true } },
        stage: { select: { id: true, name: true } },
        answers: { select: { questionId: true, value: true } },
        evaluations: { select: { userId: true, criterionId: true, score: true } },
        interviews: { orderBy: { scheduledAt: 'asc' }, select: { id: true, scheduledAt: true, feedbacks: { select: { userId: true, authorName: true, recommendation: true, ratings: true, notes: true } } } },
      },
    });
    if (apps.length !== ids.length) throw new NotFoundException('Candidatura não encontrada nesta vaga.');
    const [criteria, questions, documents] = await Promise.all([
      this.prisma.jobCriterion.findMany({ where: { jobId }, orderBy: { position: 'asc' }, select: { id: true, name: true, weight: true } }),
      this.prisma.jobQuestion.findMany({ where: { jobId }, orderBy: { position: 'asc' }, select: { id: true, label: true, type: true } }),
      this.prisma.recruitmentDocument.findMany({ where: { companyId, applicationId: { in: ids }, supersededAt: null }, select: { applicationId: true, label: true, status: true }, orderBy: { createdAt: 'asc' } }),
    ]);

    const summaries: Record<string, CriterionSummary> = {};
    const candidates = ids.map((id) => apps.find((row) => row.id === id)!).map((row) => {
      const view = visibleEvaluations(row.evaluations, viewer.sub, criteria.map((criterion) => criterion.id));
      const summary = summarizeCriteria(criteria, view.items);
      summaries[row.id] = summary;
      const feedbackRows = row.interviews.flatMap((interview) => interview.feedbacks.map((feedback) => ({ ...feedback, interviewAt: interview.scheduledAt, interviewId: interview.id })));
      // Mesma regra de listFeedback: so ve o parecer dos colegas quem ja avaliou aquela entrevista.
      const rated = new Set(feedbackRows.filter((item) => item.userId === viewer.sub).map((item) => item.interviewId));
      const visible = feedbackRows.filter((item) => item.userId === viewer.sub || rated.has(item.interviewId));
      return {
        applicationId: row.id, name: row.candidate?.name ?? 'Candidato', email: row.candidate?.email ?? null,
        stage: row.stage?.name ?? null, status: row.status, source: row.source, appliedAt: row.createdAt, knockedOut: row.knockedOut,
        screeningScore: row.score ?? null,
        evaluationScore: view.blind ? null : weightedEvaluationScore(view.items.map((item) => ({ criterionId: item.criterionId, score: item.score })), criteria),
        evaluationsHidden: view.blind, criteria: summary,
        feedback: visible.map((item) => {
          const scores = ((item.ratings as Array<{ score: number }> | null) ?? []).map((rating) => rating.score);
          return { authorName: item.authorName, recommendation: item.recommendation, average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null, notes: item.notes, interviewAt: item.interviewAt, mine: item.userId === viewer.sub };
        }),
        feedbackHidden: feedbackRows.length - visible.length,
        answers: Object.fromEntries(row.answers.map((answer) => [answer.questionId, answer.value])),
        documents: documents.filter((document) => document.applicationId === row.id).map((document) => ({ label: document.label, status: document.status })),
      };
    });
    return { job, criteria, questions, candidates, best: bestPerCriterion(criteria, summaries) };
  }
}
