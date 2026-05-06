const http = require('http');
const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(process.cwd(), process.argv[2] || 'out');
const port = Number(process.argv[3] || process.env.PORT || 3000);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveFile(rootDir, pathname) {
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.(\/|\\|$))+/, '');
  const cleanPath = safePath.replace(/^[/\\]+/, '');
  const directPath = path.join(rootDir, cleanPath);
  const htmlPath = cleanPath.endsWith('.html') ? directPath : `${directPath}.html`;
  const indexPath = path.join(directPath, 'index.html');

  for (const candidate of [directPath, htmlPath, indexPath]) {
    if (!candidate.startsWith(rootDir)) {
      continue;
    }

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  const fallbackPath = path.join(rootDir, 'index.html');
  return fs.existsSync(fallbackPath) ? fallbackPath : null;
}

if (!fs.existsSync(targetDir)) {
  console.error(`[serve-static] directory not found: ${targetDir}`);
  process.exit(1);
}

const server = http.createServer((request, response) => {
  const requestUrl = request.url || '/';
  const pathname = new URL(requestUrl, `http://127.0.0.1:${port}`).pathname;
  const filePath = resolveFile(targetDir, pathname);

  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Static build not found.');
    return;
  }

  const mimeType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': mimeType });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[serve-static] ${targetDir}`);
  console.log(`[serve-static] http://127.0.0.1:${port}`);
});
