const fs = require('fs');

let repo = fs.readFileSync('src/modules/time-track/time-track.repository.ts', 'utf8');
repo = repo.replace(
  'manualStatus: true,\n    incidentType: true,',
  'manualStatus: true,\n    overtimeApprovalStatus: true,\n    overtimeExceedsLimit: true,\n    incidentType: true,'
);
fs.writeFileSync('src/modules/time-track/time-track.repository.ts', repo);

let ctrl = fs.readFileSync('src/modules/time-track/time-track.controller.ts', 'utf8');
const oldRoute = `  @Patch(':id/overtime-approval')
  async approveOvertime(@Req() req: RequestWithUser, @Param('id') id: string, @Body('approved') approved: boolean) {
    return this.service.approveOvertime(req.user.companyId, req.user, id, approved);
  }`;
const newRoute = `  @Patch(':id/overtime-approval')
  approveOvertime(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.service.approveOvertime(companyId, actor, id, body.approved);
  }`;
ctrl = ctrl.replace(oldRoute, newRoute);
fs.writeFileSync('src/modules/time-track/time-track.controller.ts', ctrl);
