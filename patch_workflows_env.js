const fs = require('fs');

function patchFile(file) {
  try {
    let code = fs.readFileSync(file, 'utf8');

    code = code.replace(
      /run: npm run prisma:validate/g,
      'env:\n        DATABASE_URL: "postgresql://root:rootpassword@localhost:5432/innovation_test?schema=public"\n      run: npm run prisma:validate'
    );

    fs.writeFileSync(file, code);
    console.log(`Patched ${file}`);
  } catch (e) {
    console.error(`Error patching ${file}: ${e.message}`);
  }
}

patchFile('.github/workflows/ci.yml');
patchFile('.github/workflows/ci-cd.yml');
