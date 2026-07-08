import React from 'react';
import { Home, Search, Library, PlusSquare, Heart, Download, Play, Shuffle, History, Settings } from 'lucide-react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { MusicBars } from './MusicBars';
import clsx from 'clsx';
import { bridge } from '../services/bridge';

interface SidebarProps {
    view: 'home' | 'search' | 'library' | 'playlists' | 'playlist' | 'history' | 'favorites';
    setView: (view: 'home' | 'search' | 'library' | 'playlist' | 'playlists' | 'history' | 'favorites') => void;
    onPlaylistSelect?: (id: string) => void;
}

import { Modal } from './Modal';
import { useState } from 'react';

const Sidebar: React.FC<SidebarProps> = ({ view, setView, onPlaylistSelect }) => {
    const { playlists, createPlaylist } = usePlaylistStore();
    const { activePlaylistId, isPlaying, playSong, setQueue, autoPlayStart, toggleAutoPlayStart } = usePlayerStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const handleCreatePlaylist = () => {
        if (newPlaylistName.trim()) {
            createPlaylist(newPlaylistName.trim());
            setNewPlaylistName('');
            setIsCreateModalOpen(false);
        }
    };

    const NavItem = ({ icon: Icon, label, active, onClick }: any) => (
        <div
            onClick={onClick}
            className={clsx(
                "flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors duration-200 font-bold text-sm select-none",
                active ? "text-white bg-[#282828] rounded-md" : "text-gray-400 hover:text-white"
            )}
        >
            <Icon size={24} />
            <span>{label}</span>
        </div>
    );

    return (
        <>
            <div className="hidden md:flex w-64 bg-black h-full flex-col p-2 gap-2 select-none border-r border-[#282828]">
                {/* Brand Header */}


                {/* Main Nav */}
                <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-1">
                    <NavItem icon={Home} label="Home" active={view === 'home'} onClick={() => setView('home')} />
                    <NavItem icon={Search} label="Search" active={view === 'search'} onClick={() => setView('search')} />
                    <NavItem icon={History} label="History" active={view === 'history'} onClick={() => setView('history')} />
                </div>

                {/* Library Section */}
                <div className="bg-[#121212] rounded-lg p-4 flex-1 flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center justify-between text-gray-400 px-2 py-2 mb-2 hover:text-white cursor-pointer transition group" onClick={() => setIsCreateModalOpen(true)}>
                        <div className="flex items-center gap-2 font-bold text-md">
                            <Library size={24} />
                            <span>Your Library</span>
                        </div>
                        <PlusSquare size={20} className="text-gray-400 group-hover:text-white transition" />
                    </div>

                    <NavItem icon={Download} label="Downloaded" active={view === 'library'} onClick={() => setView('library')} />
                    <NavItem icon={Heart} label="Favorites" active={view === 'favorites'} onClick={() => setView('favorites')} />

                    {/* Playlists */}
                    <div className="mt-4 px-2 flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar">
                        {playlists.map(playlist => (
                            <div
                                key={playlist.id}
                                className="flex items-center gap-3 group cursor-pointer hover:bg-[#282828] p-2 rounded-md transition"
                                onClick={() => onPlaylistSelect && onPlaylistSelect(playlist.id)}
                            >
                                <div className="min-w-10 min-h-10 w-10 h-10 rounded overflow-hidden flex items-center justify-center relative group/icon">
                                    {playlist.imageUrl ? (
                                        <img src={playlist.imageUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-purple-700 to-blue-300 flex items-center justify-center">
                                            <Heart size={16} className="text-white group-hover/icon:hidden" fill="white" />
                                        </div>
                                    )}
                                    <div
                                        className="absolute inset-0 flex items-center justify-center hidden group-hover/icon:flex bg-black/50 rounded"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const queue = [...playlist.songs];
                                            if (queue.length > 0) {
                                                setQueue(queue.slice(1));
                                                playSong(queue[0], playlist.id);
                                            }
                                        }}
                                        title="Play"
                                    >
                                        <Play size={16} className="text-white" fill="white" />
                                    </div>
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-white font-medium text-sm truncate">{playlist.name}</p>
                                        {activePlaylistId === playlist.id && isPlaying && (
                                            <MusicBars />
                                        )}
                                    </div>
                                    <p className="text-gray-400 text-xs truncate">Playlist • {playlist.songs.length} songs</p>
                                </div>
                                {/* Shuffle shortcut */}
                                <div
                                    className="hidden group-hover:block p-1 hover:text-white text-gray-400"
                                    title="Shuffle"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const queue = [...playlist.songs].sort(() => Math.random() - 0.5);
                                        if (queue.length > 0) {
                                            setQueue(queue.slice(1));
                                            playSong(queue[0], playlist.id);
                                        }
                                    }}
                                >
                                    <Shuffle size={14} />
                                </div>
                            </div>
                        ))}


                        {playlists.length === 0 && (
                            <div className="text-xs text-gray-500 text-center mt-4">
                                No playlists yet.<br />Click + to create one.
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings Button (Bottom of Sidebar) */}
                <div className="mt-2 border-t border-[#282828] pt-2">
                    <div
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-4 px-4 py-3 cursor-pointer text-gray-400 hover:text-white transition font-bold text-sm select-none"
                    >
                        <Settings size={24} />
                        <span>Settings</span>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Playlist"
            >
                <div className="flex flex-col gap-4">
                    <input
                        className="bg-[#3e3e3e] text-white p-2 rounded border border-transparent focus:border-primary outline-none"
                        placeholder="My Awesome Playlist"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 text-white hover:text-gray-300 font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreatePlaylist}
                            className="px-6 py-2 bg-primary text-black rounded-full font-bold hover:scale-105 transition"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Settings Modal */}
            <Modal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                title="Settings"
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded">
                        <div className="flex flex-col">
                            <span className="text-white font-medium">Auto-play on Startup</span>
                            <span className="text-xs text-gray-400">Automatically play last song when app opens</span>
                        </div>
                        <div
                            className={clsx("w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-200", autoPlayStart ? "bg-green-500" : "bg-gray-600")}
                            onClick={toggleAutoPlayStart}
                        >
                            <div className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm", autoPlayStart ? "left-5" : "left-1")} />
                        </div>
                    </div>

                    <div className="border-t border-white/10 my-1" />

                    <div className="flex items-center justify-between p-2">
                        <span className="text-gray-400 text-sm">Version</span>
                        <span className="text-white font-mono text-sm">v1.1.3 (Capacitor)</span>
                    </div>

                    <div className="border-t border-white/10 my-1" />

                    {/* Clean Storage Option */}
                    <div className="flex flex-col gap-2 p-2">
                        <button
                            className="bg-red-900/50 hover:bg-red-800 text-white text-sm font-bold py-3 rounded-lg transition border border-red-500/20"
                            onClick={async () => {
                                if (confirm("Delete ALL downloaded songs? This cannot be undone.")) {
                                    try {
                                        const songs = await bridge.getLocalSongs();
                                        for (const song of songs) {
                                            await bridge.deleteFile(song.path);
                                        }
                                        alert("All downloads deleted.");
                                        // Reload page to refresh state is the simplest way for now, or we could require a refetch
                                        window.location.reload();
                                    } catch (e) {
                                        console.error(e);
                                        alert("Failed to delete some files.");
                                    }
                                }
                            }}
                        >
                            Delete All Downloads
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Sidebar;
