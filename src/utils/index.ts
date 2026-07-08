import { bridge } from '../services/bridge';

export const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const downloadSong = async (url: string, filename: string) => {
    return await bridge.downloadFile(url, filename);
};
