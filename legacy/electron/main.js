const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function resolveAppUrl() {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }

  const localIndex = path.join(__dirname, '..', 'FRONTEND', 'out', 'index.html');
  if (fs.existsSync(localIndex)) {
    return `file://${localIndex}`;
  }

  return null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '..', 'MEDIA', 'logo.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
      webSecurity: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#05050a',
      symbolColor: '#ffffff',
      height: 36,
    },
    backgroundColor: '#05050a',
    show: false,
  });

  Menu.setApplicationMenu(null);

  const appUrl = resolveAppUrl();
  if (appUrl) {
    if (appUrl.startsWith('file://')) {
      mainWindow.loadFile(path.join(__dirname, '..', 'FRONTEND', 'out', 'index.html'));
    } else {
      mainWindow.loadURL(appUrl);
    }
  } else {
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <!DOCTYPE html>
      <html>
        <head>
          <title>Innovation.ia</title>
          <style>
            body {
              font-family: sans-serif;
              background: #05050a;
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            h1 { color: #a855f7; margin-bottom: 1rem; }
            p { color: #94a3b8; max-width: 500px; text-align: center; }
            code {
              background: #1e293b;
              padding: 1rem;
              border-radius: 4px;
              font-size: 14px;
              display: block;
              margin: 1rem 0;
            }
          </style>
        </head>
        <body>
          <h1>⚠️ Build not found</h1>
          <p>The frontend has not been built yet. Run the desktop dev or build script and relaunch.</p>
          <code>npm run dev:desktop</code>
        </body>
      </html>
    `);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
