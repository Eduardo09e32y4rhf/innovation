import { app, BrowserWindow, Menu, shell } from 'electron';
import { createServer, Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';

const DEV_PORT_CANDIDATES = [3000, 3001, 3002, 3003, 3004, 3005];
const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

let mainWindow: BrowserWindow | null = null;
let bundledWebServer: Server | null = null;

function resolveRootPath(...segments: string[]): string {
  return path.join(__dirname, '..', '..', '..', ...segments);
}

function resolveWebExportDir(): string | null {
  const candidates = [
    resolveRootPath('apps', 'web', 'out'),
    path.join(process.resourcesPath ?? '', 'app.asar.unpacked', 'apps', 'web', 'out'),
    path.join(process.resourcesPath ?? '', 'app', 'apps', 'web', 'out'),
    path.join(process.resourcesPath ?? '', 'apps', 'web', 'out'),
  ];

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html'))) ?? null;
}

function resolveIconPath(): string | undefined {
  const candidates = [
    resolveRootPath('MEDIA', 'logo.ico'),
    resolveRootPath('WHATSAPP', 'assets', 'installer-icon.ico'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function resolveStaticFile(rootDir: string, rawPathname: string): string | null {
  const safePath = path.normalize(decodeURIComponent(rawPathname)).replace(/^(\.\.(\/|\\|$))+/, '');
  const cleanPath = safePath.replace(/^[/\\]+/, '');
  const directPath = path.join(rootDir, cleanPath);
  const htmlPath = cleanPath.endsWith('.html') ? directPath : `${directPath}.html`;
  const indexPath = path.join(directPath, 'index.html');

  const candidates = [directPath, htmlPath, indexPath];
  for (const candidate of candidates) {
    if (!candidate.startsWith(rootDir)) {
      continue;
    }

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function getMimeType(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function startBundledWebServer(staticDir: string): Promise<string> {
  if (bundledWebServer) {
    const address = bundledWebServer.address();
    if (address && typeof address === 'object') {
      return Promise.resolve(`http://127.0.0.1:${address.port}`);
    }
  }

  const server = createServer((request, response) => {
    const requestUrl = request.url ?? '/';
    const pathname = new URL(requestUrl, 'http://127.0.0.1').pathname;
    const requestedFile = resolveStaticFile(staticDir, pathname) ?? path.join(staticDir, 'index.html');

    if (!fs.existsSync(requestedFile)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Innovation IA desktop build not found.');
      return;
    }

    response.writeHead(200, { 'Content-Type': getMimeType(requestedFile) });
    fs.createReadStream(requestedFile).pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      bundledWebServer = server;
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to resolve bundled web server address.'));
        return;
      }

      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function stopBundledWebServer(): void {
  if (bundledWebServer) {
    bundledWebServer.close();
    bundledWebServer = null;
  }
}

function isReachable(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = globalThis.fetch?.(url, { signal: AbortSignal.timeout(1000) });
    if (!request) {
      resolve(false);
      return;
    }

    request
      .then((response) => resolve(response.ok))
      .catch(() => resolve(false));
  });
}

async function resolveAppUrl(): Promise<string | null> {
  const explicitUrl = process.env.ELECTRON_START_URL || process.env.DESKTOP_PROD_URL || process.env.WEB_APP_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  for (const port of DEV_PORT_CANDIDATES) {
    for (const host of ['127.0.0.1', 'localhost']) {
      const candidateUrl = `http://${host}:${port}`;
      if (await isReachable(candidateUrl)) {
        return candidateUrl;
      }
    }
  }

  const staticDir = resolveWebExportDir();
  if (staticDir) {
    return startBundledWebServer(staticDir);
  }

  return null;
}

async function createWindow(): Promise<void> {
  const iconPath = resolveIconPath();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#05050a',
    title: 'Innovation IA',
    icon: iconPath,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const targetUrl = await resolveAppUrl();
  if (targetUrl) {
    await mainWindow.loadURL(targetUrl);
  } else {
    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Innovation IA</title></head>
        <body style="font-family:sans-serif;background:#05050a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
          <div style="max-width:720px;padding:24px;text-align:center">
            <h1>Innovation IA</h1>
            <p>No web runtime was found. Start <code>npm run dev:web</code> for live development or run <code>npm run build:web</code> for the bundled desktop UI.</p>
          </div>
        </body>
      </html>
    `)}`);
  }

  mainWindow.show();
  mainWindow.focus();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => createWindow().catch((error: unknown) => {
  console.error('[desktop] failed to create window', error);
  app.quit();
}));

app.on('before-quit', stopBundledWebServer);
app.on('window-all-closed', () => {
  stopBundledWebServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  if (!mainWindow) {
    void createWindow();
  }
});
