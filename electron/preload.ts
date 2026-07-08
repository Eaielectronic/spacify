import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getLocalSongs: () => ipcRenderer.invoke('get-local-songs'),
    downloadSong: (url: string, filename: string) => ipcRenderer.invoke('download-song', { url, filename }),
    downloadImage: (url: string, filename: string) => ipcRenderer.invoke('download-image', { url, filename }),
    deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
    renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('rename-file', { oldPath, newPath }),
    selectFile: () => ipcRenderer.invoke('select-file'),
});
