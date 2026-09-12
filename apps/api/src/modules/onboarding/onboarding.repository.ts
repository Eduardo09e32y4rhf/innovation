import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OnboardingStatus } from '@prisma/client';

const DEFAULT_TASKS: Array<{
  title: string;
  taskType: 'DOCUMENT_UPLOAD' | 'FORM_FILL' | 'CONTRACT_SIGN' | 'TRAINING' | 'SYSTEM_ACCESS' | 'OTHER';
  required: boolean;
}> = [
  { title: 'Enviar RG ou CNH', taskType: 'DOCUMENT_UPLOAD', required: true },
  { title: 'Enviar CPF', taskType: 'DOCUMENT_UPLOAD', required: true },
  { title: 'Enviar Comprovante de Residencia', taskType: 'DOCUMENT_UPLOAD', required: true },
  { title: 'Enviar Foto 3x4', taskType: 'DOCUMENT_UPLOAD', required: false },
  { title: 'Preencher dados bancarios', taskType: 'FORM_FILL', required: true },
  { title: 'Assinar contrato de trabalho', taskType: 'CONTRACT_SIGN', required: true },
  { title: 'Realizar treinamento de integracao', taskType: 'TRAINING', required: false },
];

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.onboardingFlow.findMany({
      where: { companyId, deletedAt: null },
      include: { tasks: true, documents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.onboardingFlow.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { tasks: true, documents: true },
    });
  }

  findByEmployee(companyId: string, employeeId: string) {
    return this.prisma.onboardingFlow.findFirst({
      where: { companyId, employeeId, deletedAt: null },
      include: { tasks: true, documents: true },
    });
  }

  async create(companyId: string, employeeId: string) {
    return this.prisma.onboardingFlow.create({
      data: {
        companyId,
        employeeId,
        status: 'PENDING',
        tasks: {
          create: DEFAULT_TASKS.map((t) => ({
            companyId,
            title: t.title,
            taskType: t.taskType,
            required: t.required,
          })),
        },
      },
      include: { tasks: true, documents: true },
    });
  }

  updateStatus(companyId: string, id: string, status: OnboardingStatus) {
    return this.prisma.onboardingFlow.update({
      where: { id, companyId },
      data: {
        status,
        startedAt: status === 'IN_PROGRESS' ? new Date() : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  completeTask(companyId: string, taskId: string) {
    return this.prisma.onboardingTask.update({
      where: { id: taskId, companyId },
      data: { completedAt: new Date() },
    });
  }

  uploadDocument(companyId: string, docId: string, fileUrl: string) {
    return this.prisma.onboardingDocument.update({
      where: { id: docId, companyId },
      data: { fileUrl, uploadedAt: new Date() },
    });
  }

  softDelete(companyId: string, id: string) {
    return this.prisma.onboardingFlow.update({
      where: { id, companyId },
      data: { deletedAt: new Date() },
    });
  }
}
