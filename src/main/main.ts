import { app, BrowserWindow } from 'electron';
import './core/envManager';
import { diagnosticsManager } from './core/diagnosticsManager';
import * as path from "path";

if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;

    app.setPath(
        "userData",
        path.join(portableDir, "data")
    );

    app.setPath(
        "sessionData",
        path.join(portableDir, "cache")
    );

    app.setPath(
        "logs",
        path.join(portableDir, "logs")
    );
}

// Redirect all console output to the internal logger to avoid terminal windows in production
console.log = (...args) => diagnosticsManager.log('INFO', args.join(' '));
console.warn = (...args) => diagnosticsManager.log('WARN', args.join(' '));
console.error = (...args) => diagnosticsManager.log('ERROR', args.join(' '));

import { commandBus } from './core/commandBus';
import './toolchain/toolchainManager';
import './toolchain/apktoolManager';
import './toolchain/buildManager';
import './toolchain/adbManager';
import './toolchain/emulatorManager';
import './toolchain/sdkManager';
import './toolchain/avdManager';
import './keystore/keystoreManager';
import './workspace/fileSystemService';
import './workspace/workspaceManager';
import './workspace/analyzerManager';
import './workspace/sqliteService';
import { aiManager } from './ai/AIManager';
import { pluginManager } from './plugins/PluginManager';
import { updateManager } from './updater/UpdateManager';

// Register AI IPC
aiManager.registerIPC();
// Register Plugin IPC
pluginManager.registerIPC();
// Register Updater IPC
updateManager.registerIPC();

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '../dist/index.html')
    );
  }

  // Open the DevTools in dev mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  diagnosticsManager.log('INFO', 'Main window created');

  mainWindow.webContents.on('before-input-event', (_event, input) => {
  if (input.type === 'keyDown' && input.key === 'F12') {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({
        mode: 'detach' // ou 'right', 'bottom', etc.
      });
    }
  }
});
};

// Register Window Controls IPC
commandBus.register('window.minimize', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

commandBus.register('window.maximize', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

commandBus.register('window.close', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
