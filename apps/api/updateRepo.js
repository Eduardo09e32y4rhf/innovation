const fs = require('fs');
let code = fs.readFileSync('src/modules/time-track/time-track.repository.ts', 'utf8');

const newMethod = `
  async updateOvertimeApprovalStatus(companyId: string, id: string, status: string) {
    await this.prisma.timeTrack.updateMany({ where: { id, employee: { companyId } }, data: { overtimeApprovalStatus: status } });
    return this.findById(companyId, id);
  }

  async findWorkScheduleRule(id: string) {`;

code = code.replace('  async findWorkScheduleRule(id: string) {', newMethod);
fs.writeFileSync('src/modules/time-track/time-track.repository.ts', code);
