const fs = require('fs');

let repo = fs.readFileSync('src/modules/time-track/time-track.repository.ts', 'utf8');
repo = repo.replace(
  /manualStatus:\s*true,/,
  'manualStatus: true,\n    overtimeApprovalStatus: true,\n    overtimeExceedsLimit: true,'
);
repo = repo.replace(
  /manualStatus:\s*string\s*\|\s*null;/,
  'manualStatus: string | null;\n  overtimeApprovalStatus: string | null;\n  overtimeExceedsLimit: boolean;'
);

fs.writeFileSync('src/modules/time-track/time-track.repository.ts', repo);
