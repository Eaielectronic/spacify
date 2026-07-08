export interface ElectronAPI {
    downloadSong: (url: string, filename: string) => Promise<void>;
    downloadImage: (url: string, filename: string) => Promise<void>;
    selectFile: () => Promise<string[]>;
    getLocalSongs: () => Promise<any[]>;
    deleteFile: (path: string) => Promise<boolean>;
    renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
