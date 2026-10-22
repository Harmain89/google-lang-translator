import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

export interface ElectronAPI {
  translateText(payload: {
    text: string;
    sourceLang: string;
    targetLang: string;
    apiKey?: string | null;
  }): Promise<{ translatedText: string; detectedSourceLanguage: string | null; engine: 'gtx' | 'cloud' }>;
  checkApiKey(key: string): Promise<{ ok: boolean; message: string }>;
  toggleAlwaysOnTop(): Promise<boolean>;
  getAlwaysOnTop(): Promise<boolean>;
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<boolean>;
  closeWindowToTray(): Promise<void>;
  quitApp(): Promise<void>;
  copyToClipboard(text: string): Promise<boolean>;
  readClipboard(): Promise<string>;
  openExternal(url: string): Promise<boolean>;
  storeGet<T>(key: string, fallback: T): Promise<T>;
  storeSet(key: string, value: unknown): Promise<boolean>;
  storeDelete(key: string): Promise<boolean>;
  onAlwaysOnTopChanged(callback: (value: boolean) => void): () => void;
  onWindowMaximizedChanged(callback: (value: boolean) => void): () => void;
}

function subscribe(channel: string, callback: (value: never) => void): () => void {
  const listener = (_event: IpcRendererEvent, value: unknown) => callback(value as never);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api: ElectronAPI = {
  translateText: (payload) => ipcRenderer.invoke('translate-text', payload),
  checkApiKey: (key) => ipcRenderer.invoke('check-api-key', key),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindowToTray: () => ipcRenderer.invoke('window-close'),
  quitApp: () => ipcRenderer.invoke('app-quit'),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  storeGet: (key, fallback) => ipcRenderer.invoke('store-get', key, fallback),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  onAlwaysOnTopChanged: (callback) => subscribe('always-on-top-changed', callback),
  onWindowMaximizedChanged: (callback) => subscribe('window-maximized-changed', callback),
};

contextBridge.exposeInMainWorld('electronAPI', api);
