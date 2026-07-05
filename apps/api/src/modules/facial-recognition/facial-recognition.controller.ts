
import { Controller, Post, Body, UseGuards, Req, Param, BadRequestException } from '@nestjs/common';
import { FacialRecognitionService } from './facial-recognition.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../database/prisma.service';

@Controller('facial-recognition')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacialRecognitionController {
  constructor(
    private readonly facialRecognitionService: FacialRecognitionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('enroll')
  @Roles('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO')
  async enrollFace(@Req() req: any, @Body() body: { imageBase64: string, employeeId?: string }) {
    const user = req.user as any;
    // An admin/rh can enroll for an employee. An employee enrolls for themselves.
    const targetEmployeeId = (user.role === 'FUNCIONARIO' || !body.employeeId) ? user.sub : body.employeeId;

    const employee = await this.prisma.employee.findUnique({
      where: { id: targetEmployeeId, companyId: user.companyId }
    });

    if (!employee) throw new BadRequestException('Employee not found');

    const subjectId = employee.id; // We use employee id as the CompreFace subject ID

    // Add subject
    await this.facialRecognitionService.addSubject(subjectId);

    // Add face
    await this.facialRecognitionService.addFace(subjectId, body.imageBase64);

    // Save/Update FaceEnrollment
    const enrollment = await this.prisma.faceEnrollment.upsert({
      where: { employeeId: employee.id },
      update: {
        comprefaceSubjectId: subjectId,
        enrolledAt: new Date(),
        active: true
      },
      create: {
        companyId: user.companyId,
        employeeId: employee.id,
        comprefaceSubjectId: subjectId,
        active: true
      }
    });

    return { success: true, enrollment };
  }
}
