const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'apps', 'web', 'app', '[tenant]', 'dashboard', 'escalas');

function walk(d) {
  let results = [];
  const list = fs.readdirSync(d);
  list.forEach(file => {
    file = path.join(d, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('page.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk(dir);
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  content = content.replace(/className=(['"`])(?:.*?)min-h-screen(?:.*?)\1/g, (match) => {
    return 'className="space-y-6"';
  });
  
  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed ' + f);
  }
});
console.log('Done');
