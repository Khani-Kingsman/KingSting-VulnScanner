const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;

const PYTHON_PORT = 8765;
const DEV_URL = 'http://localhost:5173';

function checkBackendHealth(callback) {
  const req = http.get(`http://127.0.0.1:${PYTHON_PORT}/api/health`, (res) => {
    callback(res.statusCode === 200);
  });
  req.on('error', () => callback(false));
  req.setTimeout(800, () => {
    req.destroy();
    callback(false);
  });
}

function startPythonBackend() {
  checkBackendHealth((isAlive) => {
    if (isAlive) {
      console.log('Python backend already running on port', PYTHON_PORT);
      return;
    }

    const backendPath = path.resolve(__dirname, '../../backend/app/main.py');
    console.log('Starting Python backend from:', backendPath);

    pythonProcess = spawn('python', [backendPath], {
      stdio: 'pipe',
      detached: false
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Python Backend]: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Python Backend Err]: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python backend process exited with code ${code}`);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1040,
    minHeight: 720,
    title: 'KING STING VULNScanner',
    backgroundColor: '#080b10',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Remove standard menu bar for custom cyber dark UI
  mainWindow.setMenuBarVisibility(false);

  // Attempt to load dev server or fall back to dist
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL(DEV_URL).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('open-external', (_event, url) => {
  shell.openExternal(url);
});

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    console.log('Terminating Python backend process...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
      } else {
        pythonProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('Error stopping python process:', e);
    }
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (pythonProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
      } else {
        pythonProcess.kill('SIGTERM');
      }
    } catch (e) {
      // ignore
    }
  }
});
