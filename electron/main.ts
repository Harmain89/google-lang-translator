import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  MenuItemConstructorOptions,
  globalShortcut,
  ipcMain,
  clipboard,
  nativeImage,
  nativeTheme,
  shell,
} from 'electron';
import * as path from 'path';
import { store } from './store';
import { translateText, checkApiKey, TranslateRequest } from './translate';

const APP_NAME = 'LingoDesk';
const SHOW_SHORTCUT = 'CommandOrControl+Shift+T';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = Boolean(process.env.ELECTRON_START_URL);

interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

function loadBounds(): WindowBounds {
  return store.get<WindowBounds>('window.bounds', {
    width: 1100,
    height: 720,
    maximized: false,
  });
}

function saveBounds(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const maximized = mainWindow.isMaximized();
  const current = maximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();
  store.set('window.bounds', {
    x: current.x,
    y: current.y,
    width: current.width,
    height: current.height,
    maximized,
  });
}

function getIcon(): Electron.NativeImage {
  const img = nativeImage.createFromPath(path.join(__dirname, '..', 'resources', 'icon.png'));
  return img.isEmpty() ? nativeImage.createEmpty() : img;
}

function broadcast(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
  return mainWindow !== null && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents;
}

function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function setAlwaysOnTop(next: boolean): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setAlwaysOnTop(next);
  broadcast('always-on-top-changed', next);
  refreshTrayMenu();
}

function createWindow(): void {
  const storedBounds = loadBounds();
  const storedTheme = store.get<string | null>('ui.theme', null);
  const background =
    storedTheme === 'dark' || (storedTheme === null && nativeTheme.shouldUseDarkColors)
      ? '#09090B'
      : '#F8FAFC';

  mainWindow = new BrowserWindow({
    width: storedBounds.width,
    height: storedBounds.height,
    x: storedBounds.x,
    y: storedBounds.y,
    minWidth: 620,
    minHeight: 480,
    frame: false,
    show: false,
    backgroundColor: background,
    icon: getIcon(),
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  if (storedBounds.maximized) {
    mainWindow.maximize();
  } else if (storedBounds.x !== undefined && storedBounds.y !== undefined) {
    mainWindow.setBounds({
      x: storedBounds.x,
      y: storedBounds.y,
      width: storedBounds.width,
      height: storedBounds.height,
    });
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    void mainWindow.loadURL(process.env.ELECTRON_START_URL as string);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('maximize', () => broadcast('window-maximized-changed', true));
  mainWindow.on('unmaximize', () => broadcast('window-maximized-changed', false));

  mainWindow.on('close', (event) => {
    saveBounds();
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

let alwaysOnTopLabel = 'Always on Top';

function refreshTrayMenu(): void {
  if (!tray) return;
  const menu: MenuItemConstructorOptions[] = [
    { label: `Show ${APP_NAME}`, click: () => showWindow() },
    {
      label: alwaysOnTopLabel,
      type: 'checkbox',
      checked: mainWindow?.isAlwaysOnTop() ?? false,
      click: (item) => setAlwaysOnTop(item.checked),
    },
    { type: 'separator' },
    {
      label: `Quit ${APP_NAME}`,
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(menu));
}

function createTray(): void {
  const icon = getIcon();
  if (icon.isEmpty()) {
    console.warn('[tray] icon.png missing or empty, skipping tray');
    return;
  }
  tray = new Tray(icon);
  tray.setToolTip(`${APP_NAME} — Translator`);
  tray.on('click', () => showWindow());
  refreshTrayMenu();
}

function registerIpc(): void {
  ipcMain.handle('translate-text', async (event, payload: TranslateRequest) => {
    if (!isTrustedSender(event)) throw new Error('Untrusted sender');
    return translateText(payload);
  });

  ipcMain.handle('check-api-key', async (event, key: unknown) => {
    if (!isTrustedSender(event) || typeof key !== 'string') return { ok: false, message: 'Invalid key.' };
    return checkApiKey(key);
  });

  ipcMain.handle('toggle-always-on-top', (event) => {
    if (!isTrustedSender(event)) return false;
    const next = !(mainWindow?.isAlwaysOnTop() ?? false);
    setAlwaysOnTop(next);
    return next;
  });

  ipcMain.handle('get-always-on-top', (event) => {
    if (!isTrustedSender(event)) return false;
    return mainWindow?.isAlwaysOnTop() ?? false;
  });

  ipcMain.handle('window-minimize', (event) => {
    if (!isTrustedSender(event)) return;
    mainWindow?.minimize();
  });

  ipcMain.handle('window-maximize', (event) => {
    if (!isTrustedSender(event)) return false;
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    }
    mainWindow.maximize();
    return true;
  });

  ipcMain.handle('window-close', (event) => {
    if (!isTrustedSender(event)) return;
    mainWindow?.close();
  });

  ipcMain.handle('app-quit', () => {
    isQuitting = true;
    app.quit();
  });

  ipcMain.handle('copy-to-clipboard', (event, text: unknown) => {
    if (!isTrustedSender(event) || typeof text !== 'string') return false;
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle('read-clipboard', (event) => {
    if (!isTrustedSender(event)) return '';
    return clipboard.readText();
  });

  ipcMain.handle('open-external', async (event, url: unknown) => {
    if (!isTrustedSender(event) || typeof url !== 'string') return false;
    if (!/^https?:\/\//.test(url)) return false;
    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('store-get', (event, key: unknown, fallback: unknown) => {
    if (!isTrustedSender(event) || typeof key !== 'string') return fallback;
    return store.get(key, fallback);
  });

  ipcMain.handle('store-set', (event, key: unknown, value: unknown) => {
    if (!isTrustedSender(event) || typeof key !== 'string') return false;
    store.set(key, value);
    return true;
  });

  ipcMain.handle('store-delete', (event, key: unknown) => {
    if (!isTrustedSender(event) || typeof key !== 'string') return false;
    store.delete(key);
    return true;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());

  app.whenReady().then(() => {
    app.setAppUserModelId('com.lingodesk.app');
    registerIpc();
    createTray();
    createWindow();

    const registered = globalShortcut.register(SHOW_SHORTCUT, () => showWindow());
    if (!registered) {
      console.warn(`[shortcut] could not register ${SHOW_SHORTCUT}`);
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    saveBounds();
    store.flush();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  app.on('window-all-closed', () => {
    if (process.platform === 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showWindow();
  });
}
