import {contextBridge, ipcRenderer} from 'electron';
import {UpdateSpeedArgs} from "./types";

contextBridge.exposeInMainWorld('api', {
    quit: () => ipcRenderer.invoke('quit'),
    saveApiKey: (apiKey: string) => ipcRenderer.invoke('saveApiKey', apiKey),
    getApiKey: () => ipcRenderer.invoke('getApiKey'),
    openExternal: (url: string) => ipcRenderer.invoke("openExternal", url),
    openBrowser: () => ipcRenderer.invoke("openBrowser"),
    enableBrowser: (callback: Function) => ipcRenderer.on('enableBrowser', (_event, value) => callback(value)),
    updateTypeSpeed: (data: UpdateSpeedArgs) => ipcRenderer.invoke("updateTypeSpeed", data),
    updateErrRate: (data: number) => ipcRenderer.invoke("updateErrRate", data),
});