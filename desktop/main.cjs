'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, Menu, dialog, net, protocol, session } = require('electron');

const APP_SCHEME = 'katabasis';
const APP_ENTRY = `${APP_SCHEME}://app/katabasis.html`;
const APP_ID = 'com.danielmartinezmaker.katabasis';

protocol.registerSchemesAsPrivileged([{
  scheme: APP_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    stream: true
  }
}]);

let mainWindow = null;
let portableSaveFallback = false;

function configurePortableSaves() {
  const portableDirectory = process.env.PORTABLE_EXECUTABLE_DIR;
  if (!portableDirectory) return;

  const dataDirectory = path.join(portableDirectory, 'KATABASIS Data');
  try {
    fs.mkdirSync(dataDirectory, { recursive: true });
    fs.accessSync(dataDirectory, fs.constants.W_OK);
    app.setPath('userData', dataDirectory);
  } catch (error) {
    portableSaveFallback = true;
    console.warn('Could not store portable saves beside the app:', error.message);
  }
}

function response(status, message) {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

function registerGameProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return response(405, 'Method not allowed');
    }

    let url;
    let requestedPath;
    try {
      url = new URL(request.url);
      requestedPath = decodeURIComponent(url.pathname);
    } catch {
      return response(400, 'Invalid app URL');
    }

    if (url.hostname !== 'app') return response(404, 'Not found');
    if (!requestedPath || requestedPath === '/') requestedPath = '/katabasis.html';

    const appRoot = app.getAppPath();
    const relativePath = requestedPath.replace(/^[/\\]+/, '');
    const filePath = path.resolve(appRoot, relativePath);
    const relativeToRoot = path.relative(appRoot, filePath);
    if (relativeToRoot === '..' || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot)) {
      return response(403, 'Path is outside the game bundle');
    }

    try {
      return await net.fetch(pathToFileURL(filePath).toString());
    } catch {
      return response(404, 'Not found');
    }
  });
}

function isGameUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === `${APP_SCHEME}:` && url.hostname === 'app';
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'KATABASIS',
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#100c18',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, destination) => {
    if (!isGameUrl(destination)) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.loadURL(APP_ENTRY).catch(async (error) => {
    console.error('KATABASIS could not load its bundled game:', error);
    await dialog.showMessageBox({
      type: 'error',
      title: 'KATABASIS could not start',
      message: 'The game files could not be loaded.',
      detail: 'Re-download the Windows x64 app and try again.'
    });
    app.quit();
  });
}

configurePortableSaves();

if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    registerGameProtocol();
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

    if (portableSaveFallback) {
      await dialog.showMessageBox({
        type: 'warning',
        title: 'KATABASIS portable saves',
        message: 'This folder cannot store save data.',
        detail: `Progress will be saved on this Windows account at ${app.getPath('userData')}. Move the app to a writable folder to keep its data beside the executable.`
      });
    }

    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
