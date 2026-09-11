const fs = require('fs');

function patchFile(file) {
  try {
    let code = fs.readFileSync(file, 'utf8');

    // Replace node-version: 20 with node-version: 22
    code = code.replace(/node-version: 20/g, 'node-version: 22');
    code = code.replace(/NODE_VERSION: 20/g, 'NODE_VERSION: 22');

    fs.writeFileSync(file, code);
    console.log(`Patched ${file}`);
  } catch (e) {
    console.error(`Error patching ${file}: ${e.message}`);
  }
}

patchFile('.github/workflows/ci.yml');
patchFile('.github/workflows/ci-cd.yml');
