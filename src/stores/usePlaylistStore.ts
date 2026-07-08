import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from './usePlayerStore';

export interface Playlist {
    id: string;
    name: string;
    songs: Song[];
    imageUrl?: string;
    createdAt: number;
}

interface PlaylistState {
    playlists: Playlist[];
    createPlaylist: (name: string) => void;
    deletePlaylist: (id: string) => void;
    renamePlaylist: (id: string, name: string) => void;
    addSongToPlaylist: (playlistId: string, song: Song) => void;
    removeSongFromPlaylist: (playlistId: string, songId: number | string) => void;
    getPlaylist: (id: string) => Playlist | undefined;
    renameSongInPlaylist: (songId: string | number, newTitle: string) => void;
}

export const usePlaylistStore = create<PlaylistState>()(
    persist(
        (set, get) => ({
            playlists: [],

            createPlaylist: (name) => set((state) => ({
                playlists: [
                    ...state.playlists,
                    {
                        id: crypto.randomUUID(),
                        name,
                        songs: [],
                        createdAt: Date.now(),
                    }
                ]
            })),

            deletePlaylist: (id) => set((state) => ({
                playlists: state.playlists.filter(p => p.id !== id)
            })),
            renamePlaylist: (id, name) => set((state) => ({
                playlists: state.playlists.map((p) => p.id === id ? { ...p, name } : p)
            })),
            addSongToPlaylist: (playlistId, song) => set((state) => ({
                playlists: state.playlists.map(p => {
                    if (p.id === playlistId) {
                        // Avoid duplicates?
                        if (p.songs.some(s => s.id === song.id)) return p;
                        return { ...p, songs: [...p.songs, song] };
                    }
                    return p;
                })
            })),

            removeSongFromPlaylist: (playlistId, songId) => set((state) => ({
                playlists: state.playlists.map(p => {
                    if (p.id === playlistId) {
                        return { ...p, songs: p.songs.filter(s => s.id !== songId) };
                    }
                    return p;
                })
            })),

            getPlaylist: (id) => get().playlists.find(p => p.id === id),

            renameSongInPlaylist: (songId, newTitle) => set((state) => ({
                playlists: state.playlists.map(p => ({
                    ...p,
                    songs: p.songs.map(s => s.id === songId ? { ...s, title: newTitle } : s)
                }))
            }))
        }),
        {
            name: 'spacify-playlists', // unique name
        }
    )
);
