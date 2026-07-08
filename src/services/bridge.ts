import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';

export interface BridgeSong {
    id: string | number;
    title: string;
    artist: string;
    audioUrl: string;
    imageUrl?: string;
    localPath?: string;
    localImagePath?: string;
}

const isElectron = !!(window as any).electronAPI;

export const bridge = {
    isElectron,
    isMobile: Capacitor.isNativePlatform(),

    async downloadFile(url: string, filename: string): Promise<string | null> {
        if (isElectron) {
            if (filename.endsWith('.mp3')) {
                return await (window as any).electronAPI.downloadSong(url, filename);
            } else {
                return await (window as any).electronAPI.downloadImage(url, filename);
            }
        }

        try {
            const response = await CapacitorHttp.get({
                url,
                responseType: 'blob'
            });

            // Convert blob to base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    resolve(base64data.split(',')[1]);
                };
            });
            reader.readAsDataURL(response.data);
            const base64String = await base64Promise;

            const result = await Filesystem.writeFile({
                path: filename,
                data: base64String,
                directory: Directory.Data,
            });

            return result.uri;
        } catch (error) {
            console.error('Bridge: Download failed', error);
            return null;
        }
    },

    async getLocalSongs(): Promise<{ name: string; path: string; url: string }[]> {
        if (isElectron) {
            return await (window as any).electronAPI.getLocalSongs();
        }

        try {
            const result = await Filesystem.readdir({
                path: '',
                directory: Directory.Data,
            });

            const songs = result.files
                .filter(file => file.name.endsWith('.mp3'))
                .map(file => ({
                    name: file.name,
                    path: file.uri,
                    url: Capacitor.convertFileSrc(file.uri)
                }));

            return songs;
        } catch (error) {
            console.error('Bridge: Get local songs failed', error);
            return [];
        }
    },

    async deleteFile(path: string): Promise<boolean> {
        if (isElectron) {
            return await (window as any).electronAPI.deleteFile(path);
        }

        try {
            const filename = decodeURIComponent(path.split('/').pop() || path);
            await Filesystem.deleteFile({
                path: filename,
                directory: Directory.Data
            });
            return true;
        } catch (error) {
            console.error('Bridge: Delete failed', error);
            return false;
        }
    },

    async renameFile(oldPath: string, newPath: string): Promise<boolean> {
        if (isElectron) {
            return await (window as any).electronAPI.renameFile({ oldPath, newPath });
        }

        try {
            // Capacitor Filesystem with Directory.Data expects relative paths (filenames)
            // We assume files are in the root of Directory.Data
            // Decode URI component to handle spaces (%20) in filenames from file:// URIs
            const oldName = decodeURIComponent(oldPath.split('/').pop() || oldPath);
            const newName = decodeURIComponent(newPath.split('/').pop() || newPath);

            await Filesystem.rename({
                from: oldName,
                to: newName,
                directory: Directory.Data
            });
            return true;
        } catch (error) {
            console.error('Bridge: Rename failed', error);
            return false;
        }
    },

    async selectFiles(): Promise<string[] | null> {
        if (isElectron) {
            return await (window as any).electronAPI.selectFile();
        }

        try {
            const result = await FilePicker.pickFiles({
                types: ['audio/*'],
                limit: 0,
                readData: false
            });
            return result.files.map(f => f.path || '');
        } catch (error) {
            console.error('Bridge: Select files failed', error);
            return null;
        }
    },

    convertSrc(src: string | undefined): string {
        if (!src) return '';
        if (src.startsWith('http')) return src;
        if (isElectron) return src; // Electron uses file:// with webSecurity disabled
        return Capacitor.convertFileSrc(src);
    }
};
