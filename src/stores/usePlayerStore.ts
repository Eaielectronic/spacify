import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { bridge } from '../services/bridge';

export interface Song {
    id: number | string;
    title: string;
    artist: string; // Pixabay "user"
    audioUrl: string;
    imageUrl?: string;
    duration?: number;
    localPath?: string;
    localImagePath?: string;
    isDownloaded?: boolean;
}

interface PlayerState {
    isPlaying: boolean;
    currentSong: Song | null;
    queue: Song[];
    volume: number;
    downloadQueue: Song[];
    isDownloading: boolean;
    history: Song[];
    activePlaylistId: string | null;
    favorites: Song[];
    playCounts: Record<string | number, number>;

    setPlaying: (isPlaying: boolean) => void;
    setVolume: (volume: number) => void;
    playSong: (song: Song, playlistId?: string | null) => void;
    addToQueue: (song: Song) => void;
    removeFromQueue: (id: number) => void;
    nextSong: () => void;
    prevSong: () => void;
    setQueue: (songs: Song[]) => void;
    addToDownloadQueue: (songs: Song[]) => void;
    processDownloadQueue: () => void;
    addToHistory: (song: Song) => void;
    setActivePlaylist: (id: string | null) => void;
    toggleFavorite: (song: Song) => void;
    incrementPlayCount: (songId: string | number) => void;
    updateSong: (id: string | number, updates: Partial<Song>) => void;
    autoPlayStart: boolean;
    toggleAutoPlayStart: () => void;
}

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set, get) => ({
            isPlaying: false,
            currentSong: null,
            queue: [],
            volume: 0.5,
            downloadQueue: [],
            isDownloading: false,
            history: [],
            activePlaylistId: null,
            favorites: [],
            playCounts: {},

            setPlaying: (isPlaying) => set({ isPlaying }),
            setVolume: (volume) => set({ volume }),

            playSong: (song, playlistId = null) => {
                set({ currentSong: song, isPlaying: true, activePlaylistId: playlistId });
                get().addToHistory(song);
                get().incrementPlayCount(song.id);
            },

            addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),

            removeFromQueue: (id) => set((state) => ({
                queue: state.queue.filter(s => s.id !== id)
            })),

            nextSong: () => {
                const { queue } = get();
                if (queue.length > 0) {
                    const next = queue[0];
                    set((state) => ({
                        currentSong: next,
                        queue: state.queue.slice(1),
                        isPlaying: true
                    }));
                } else {
                    set({ isPlaying: false });
                }
            },

            prevSong: () => {
                console.log("Prev song not implemented yet");
            },

            setQueue: (songs) => set({ queue: songs }),

            addToDownloadQueue: (songs) => {
                set((state) => ({
                    downloadQueue: [...state.downloadQueue, ...songs.filter(s => !s.localPath && s.audioUrl?.startsWith('http'))]
                }));
                // Start processing if not already
                if (!get().isDownloading) {
                    get().processDownloadQueue();
                }
            },

            processDownloadQueue: async () => {
                const { downloadQueue, isDownloading } = get();
                if (downloadQueue.length === 0 || isDownloading) return;

                set({ isDownloading: true });

                while (get().downloadQueue.length > 0) {
                    const currentQueue = get().downloadQueue;
                    const song = currentQueue[0];

                    // Remove from queue
                    set({ downloadQueue: currentQueue.slice(1) });

                    try {
                        console.log(`Background downloading: ${song.title}`);
                        const audioPath = await bridge.downloadFile(song.audioUrl, `${song.id}.mp3`);
                        if (audioPath) {
                            get().updateSong(song.id, { localPath: audioPath, isDownloaded: true });
                        }
                        if (song.imageUrl) {
                            const imagePath = await bridge.downloadFile(song.imageUrl, `${song.id}.jpg`);
                            if (imagePath) {
                                get().updateSong(song.id, { localImagePath: imagePath });
                            }
                        }
                    } catch (err) {
                        console.error(`Background download failed: ${song.title}`, err);
                    }

                    // Small delay to prevent blocking or overwhelming
                    await new Promise(r => setTimeout(r, 500));
                }

                set({ isDownloading: false });
            },

            addToHistory: (song) => {
                set((state) => {
                    // Keep unique history, max 50 items
                    const filtered = state.history.filter(s => s.id !== song.id);
                    return { history: [song, ...filtered].slice(0, 50) };
                });
            },

            setActivePlaylist: (id) => set({ activePlaylistId: id }),
            toggleFavorite: (song) => {
                set((state) => {
                    const isFavorite = state.favorites.some(s => s.id === song.id);
                    if (isFavorite) {
                        return { favorites: state.favorites.filter(s => s.id !== song.id) };
                    } else {
                        return { favorites: [...state.favorites, song] };
                    }
                });
            },
            incrementPlayCount: (songId) => {
                set((state) => ({
                    playCounts: {
                        ...state.playCounts,
                        [songId]: (state.playCounts[songId] || 0) + 1
                    }
                }));
            },
            updateSong: (id, updates) => {
                set((state) => ({
                    currentSong: state.currentSong?.id === id ? { ...state.currentSong, ...updates } : state.currentSong,
                    queue: state.queue.map(s => s.id === id ? { ...s, ...updates } : s),
                    favorites: state.favorites.map(s => s.id === id ? { ...s, ...updates } : s),
                    history: state.history.map(s => s.id === id ? { ...s, ...updates } : s),
                }));
            },
            autoPlayStart: false,
            toggleAutoPlayStart: () => set((state) => ({ autoPlayStart: !state.autoPlayStart }))
        }),
        {
            name: 'spacify-storage',
            partialize: (state) => ({
                favorites: state.favorites,
                playCounts: state.playCounts,
                history: state.history,
                volume: state.volume,
                currentSong: state.currentSong,
                queue: state.queue,
                activePlaylistId: state.activePlaylistId,
                autoPlayStart: state.autoPlayStart
            })
        }
    )
);


