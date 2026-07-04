const fs = require('fs');

let repo = fs.readFileSync('src/modules/time-track/time-track.repository.ts', 'utf8');
repo = repo.replace(
  '  manualStatus: string | null;\n  incidentType: string | null;',
  '  manualStatus: string | null;\n  overtimeApprovalStatus: string | null;\n  overtimeExceedsLimit: boolean;\n  incidentType: string | null;'
);
fs.writeFileSync('src/modules/time-track/time-track.repository.ts', repo);
