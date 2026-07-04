const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\${/g, '${');
  content = content.replace(/\\\`/g, '`');
  fs.writeFileSync(file, content);
}

fixFile('C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/time-track/time-track.service.ts');
fixFile('C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/time-track/time-closing.service.ts');
console.log('Fixed backslashes');
