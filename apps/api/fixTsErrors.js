const fs = require('fs');

// 1. Fix notifications.service.ts
const notifFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/notifications/notifications.service.ts';
let notifCode = fs.readFileSync(notifFile, 'utf8');
notifCode = notifCode.replace(/employeeId: employee\.id,\n\s*date: targetDate,/g, "companyId: employee.companyId,\nemployeeId: employee.id,\ndate: targetDate,");
fs.writeFileSync(notifFile, notifCode);

// 2. Fix time-track.repository.ts
const repoFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/time-track/time-track.repository.ts';
let repoCode = fs.readFileSync(repoFile, 'utf8');
repoCode = repoCode.replace(/overtimeApprovalStatus: true,\n\s*overtimeExceedsLimit: true,/g, "overtimeApprovalStatus: true,\novertimeExceedsLimit: true,\novertimeApprovedAt: true,\novertimeApprovedByUserId: true,\novertimeHandling: true,\novertimeBankMinutes: true,\novertimePaymentMinutes: true,");
fs.writeFileSync(repoFile, repoCode);

// 3. Fix time-track.service.ts
const trackFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/time-track/time-track.service.ts';
let trackCode = fs.readFileSync(trackFile, 'utf8');
trackCode = trackCode.replace("let type = dto.type;", "let type: any = dto.type;");
fs.writeFileSync(trackFile, trackCode);

console.log("Fixed TS errors");
