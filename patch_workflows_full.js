const fs = require('fs');

function patchFile(file) {
  try {
    let code = fs.readFileSync(file, 'utf8');

    // Replace node-version: 20 with node-version: 22
    code = code.replace(/node-version: 20/g, 'node-version: 22');
    code = code.replace(/NODE_VERSION: 20/g, 'NODE_VERSION: 22');

    // Add npm run db:generate before npm run typecheck:api and npm run test:unit
    code = code.replace(
      /run: npm run typecheck:api/g,
      'run: npm run db:generate && npm run build:api && npm run typecheck:api'
    );

    code = code.replace(
      /run: npm run test:unit/g,
      'run: npm run db:generate && npm run build:api && npm run test:unit'
    );

    code = code.replace(
      /run: npm run prisma:validate/g,
      'env:\n        DATABASE_URL: "postgresql://root:rootpassword@localhost:5432/innovation_test?schema=public"\n      run: npm run prisma:validate'
    );

    code = code.replace(
      /run: npm run db:migrate/g,
      'run: npm run db:deploy'
    );

    fs.writeFileSync(file, code);
    console.log(`Patched ${file}`);
  } catch (e) {
    console.error(`Error patching ${file}: ${e.message}`);
  }
}

patchFile('.github/workflows/ci.yml');
patchFile('.github/workflows/ci-cd.yml');
