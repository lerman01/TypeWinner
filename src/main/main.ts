import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { chromePath, openPuppeteerBrowser } from './utils/puppeteer';
import { MAX_DELAY, typeConfig } from './utils/typing';
import { UpdateSpeedArgs } from './types';
import { apiKeyPath, initGroq } from './utils/grok';
import { paths, resolveHtmlPath } from './utils/commons';

if (!fs.existsSync(paths.config)) {
  fs.mkdirSync(paths.config, { recursive: true });
}

let win: BrowserWindow;

function createWindow() {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...pathsArg: string[]): string => {
    return path.join(RESOURCES_PATH, ...pathsArg);
  };

  win = new BrowserWindow({
    title: 'TypeWinner',
    icon: getAssetPath('icon.png'),
    resizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    frame: false, // removes OS title bar and borders
    transparent: false,
    width: 500,
    height: 420,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // devTools: true,
    },
  });

  win.loadURL(resolveHtmlPath('index.html'));
  // win.webContents.openDevTools();
}

ipcMain.handle('quit', app.quit);
ipcMain.handle('openBrowser', openPuppeteerBrowser);
ipcMain.handle('updateTypeSpeed', (_event, newSpeed: UpdateSpeedArgs) => {
  typeConfig.minDelay = MAX_DELAY - newSpeed.max;
  typeConfig.maxDelay = MAX_DELAY - newSpeed.min;
});
ipcMain.handle('updateErrRate', (_event, errRate: number) => {
  typeConfig.errorRate = errRate;
});
ipcMain.handle('openExternal', (_event, url: string) => {
  shell.openExternal(url).catch(() => {});
});
ipcMain.handle('saveApiKey', (_event, apiKey: string) => {
  fs.writeFileSync(apiKeyPath, apiKey);
  initGroq(apiKey);
});
ipcMain.handle('getApiKey', () => {
  if (fs.existsSync(apiKeyPath)) {
    return fs.readFileSync(apiKeyPath, 'utf-8');
  }
  return null;
});

app
  .whenReady()
  .then(() => {
    if (!chromePath) {
      dialog.showErrorBox(
        'Failed to start TypeWinner',
        'Google Chrome could not be found on this system.',
      );
      app.quit();
    }

    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch(() => {});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
