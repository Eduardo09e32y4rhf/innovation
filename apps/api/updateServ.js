const fs = require('fs');
let code = fs.readFileSync('src/modules/time-track/time-track.service.ts', 'utf8');

const newMethod = `
  async approveOvertime(companyId: string, actor: JwtUser, id: string, approved: boolean) {
    const track = await this.repository.findById(companyId, id);
    if (!track) throw new NotFoundException('Time track not found');
    if (!track.overtimeExceedsLimit) throw new BadRequestException('This track does not have overtime exceeding the limit');
    
    if (actor.role === 'GESTOR') {
      const managerEmployee = await this.repository.findEmployeeByUserId(companyId, actor.sub, actor.email);
      if (!managerEmployee) throw new ForbiddenException('Insufficient permission');
      const employee = await this.repository.findEmployee(companyId, track.employeeId);
      if (!employee || employee.managerId !== managerEmployee.id) throw new ForbiddenException('Insufficient permission');
    }
    const status = approved ? 'APPROVED' : 'REJECTED';
    return this.repository.updateOvertimeApprovalStatus(companyId, id, status);
  }

  async approveManual(companyId: string, actor: JwtUser, id: string, approved: boolean) {`;

code = code.replace('  async approveManual(companyId: string, actor: JwtUser, id: string, approved: boolean) {', newMethod);
fs.writeFileSync('src/modules/time-track/time-track.service.ts', code);

let ctrl = fs.readFileSync('src/modules/time-track/time-track.controller.ts', 'utf8');
const newRoute = `
  @Patch(':id/overtime-approval')
  async approveOvertime(@Req() req: RequestWithUser, @Param('id') id: string, @Body('approved') approved: boolean) {
    return this.service.approveOvertime(req.user.companyId, req.user, id, approved);
  }

  @Patch(':id/approve')`;

ctrl = ctrl.replace('  @Patch(\':id/approve\')', newRoute);
fs.writeFileSync('src/modules/time-track/time-track.controller.ts', ctrl);
