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
  // find the first <div className="...">
  const match = content.match(/<div[^>]*?className=[\'\"]([^\'\"]+)/);
  if (match) {
    console.log(path.basename(path.dirname(f)) + ': ' + match[1]);
  }
});
