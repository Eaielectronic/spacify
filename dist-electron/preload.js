"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getLocalSongs: () => electron_1.ipcRenderer.invoke('get-local-songs'),
    downloadSong: (url, filename) => electron_1.ipcRenderer.invoke('download-song', { url, filename }),
    downloadImage: (url, filename) => electron_1.ipcRenderer.invoke('download-image', { url, filename }),
    deleteFile: (path) => electron_1.ipcRenderer.invoke('delete-file', path),
    renameFile: (oldPath, newPath) => electron_1.ipcRenderer.invoke('rename-file', { oldPath, newPath }),
    selectFile: () => electron_1.ipcRenderer.invoke('select-file'),
});
