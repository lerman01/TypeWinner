"use strict";

// src/backend/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("api", {
  quit: () => import_electron.ipcRenderer.invoke("quit"),
  saveApiKey: (apiKey) => import_electron.ipcRenderer.invoke("saveApiKey", apiKey),
  getApiKey: () => import_electron.ipcRenderer.invoke("getApiKey"),
  openExternal: (url) => import_electron.ipcRenderer.invoke("openExternal", url),
  openBrowser: () => import_electron.ipcRenderer.invoke("openBrowser"),
  enableBrowser: (callback) => import_electron.ipcRenderer.on("enableBrowser", (_event, value) => callback(value)),
  updateTypeSpeed: (data) => import_electron.ipcRenderer.invoke("updateTypeSpeed", data),
  updateErrRate: (data) => import_electron.ipcRenderer.invoke("updateErrRate", data)
});
