const fs = require('fs');

function patchFile(file) {
  try {
    let code = fs.readFileSync(file, 'utf8');

    // Add npm run db:generate before npm run typecheck:api and npm run test:unit
    code = code.replace(
      /run: npm run typecheck:api/g,
      'run: npm run db:generate && npm run typecheck:api'
    );

    code = code.replace(
      /run: npm run test:unit/g,
      'run: npm run db:generate && npm run build:api && npm run test:unit'
    );

    fs.writeFileSync(file, code);
    console.log(`Patched ${file}`);
  } catch (e) {
    console.error(`Error patching ${file}: ${e.message}`);
  }
}

patchFile('.github/workflows/ci.yml');
patchFile('.github/workflows/ci-cd.yml');
