import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, PlusCircle, Download, ListMusic, Heart } from 'lucide-react';
import { Howl, Howler } from 'howler';
import { formatTime } from '../utils';
import { SongArtwork } from './SongArtwork';
import { Modal } from './Modal';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { MusicBars } from './MusicBars';
import clsx from 'clsx';

const PlayerBar: React.FC<{ onViewPlaylistTracks?: (id: string) => void }> = ({ onViewPlaylistTracks }) => {
    const {
        currentSong, isPlaying, volume, setPlaying, setVolume,
        nextSong, prevSong, downloadQueue, isDownloading,
        activePlaylistId, toggleFavorite, favorites
    } = usePlayerStore();
    const { playlists, addSongToPlaylist } = usePlaylistStore();

    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const soundRef = useRef<Howl | null>(null);

    useEffect(() => {
        if (currentSong) {
            // Global safeguard: stop all existing Howler sounds before starting a new one
            // This is the most reliable way to prevent "song stacking"
            Howler.stop();

            if (soundRef.current) {
                soundRef.current.unload();
                soundRef.current = null;
            }

            const src = currentSong.localPath ? `file://${currentSong.localPath}` : currentSong.audioUrl;

            const sound = new Howl({
                src: [src],
                html5: true,
                volume: volume,
                onplay: () => {
                    setPlaying(true);
                    setDuration(sound.duration());
                    requestAnimationFrame(updateProgress);
                },
                onend: () => {
                    nextSong();
                },
                onpause: () => {
                    setPlaying(false);
                },
                onloaderror: (_id, err) => {
                    console.error("Load error", err);
                }
            });


            soundRef.current = sound;

            // Only play if the store says we are playing (User action)
            // On App Start: isPlaying is false, so it won't play logic unless autoPlayStart is on
            if (isPlaying) {
                sound.play();
            }

            // Web Media Session API for Android/Mobile background controls
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: currentSong.title,
                    artist: currentSong.artist,
                    album: 'Spacify',
                    artwork: [
                        { src: currentSong.imageUrl || '', sizes: '512x512', type: 'image/jpeg' }
                    ]
                });

                navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
                navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
                navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
                navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    if (details.seekTime !== undefined && soundRef.current) {
                        soundRef.current.seek(details.seekTime);
                    }
                });
            }
        }

        return () => {
            if (soundRef.current) {
                soundRef.current.unload();
                soundRef.current = null;
            }
        };
    }, [currentSong]);

    // Handle Auto-Play on Startup
    useEffect(() => {
        const state = usePlayerStore.getState();
        if (state.autoPlayStart && state.currentSong && !state.isPlaying) {
            setPlaying(true);
        }
    }, []);

    useEffect(() => {
        if (soundRef.current) {
            if (isPlaying) {
                soundRef.current.play();
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'playing';
                }
            } else {
                soundRef.current.pause();
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'paused';
                }
            }
        }
    }, [isPlaying]);

    useEffect(() => {
        if (soundRef.current) {
            soundRef.current.volume(volume);
        }
    }, [volume]);

    const updateProgress = () => {
        if (soundRef.current && soundRef.current.playing()) {
            setProgress(soundRef.current.seek());
            requestAnimationFrame(updateProgress);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setProgress(val);
        if (soundRef.current) {
            soundRef.current.seek(val);
        }
    };

    if (!currentSong) return null;

    return (
        <>
            {/* Desktop Player Bar */}
            <div className="hidden md:flex h-24 bg-[#181818] border-t border-white/10 items-center px-4 justify-between fixed bottom-0 w-full z-50">

                {/* Song Info */}
                <div className="flex items-center w-1/3">
                    <SongArtwork
                        src={currentSong.imageUrl}
                        alt="Art"
                        className="w-14 h-14 rounded shadow-lg object-cover bg-[#282828]"
                    />
                    <div className="ml-4 overflow-hidden">
                        <h4 className="text-white text-sm font-medium truncate hover:underline cursor-pointer">
                            {currentSong.title}
                        </h4>
                        <p className="text-gray-400 text-xs hover:underline cursor-pointer">
                            {currentSong.artist}
                        </p>
                        {activePlaylistId && (
                            <div
                                className="flex items-center gap-1.5 mt-1 text-[10px] font-black uppercase tracking-tighter text-purple-400 hover:text-purple-300 cursor-pointer group"
                                onClick={() => onViewPlaylistTracks && onViewPlaylistTracks(activePlaylistId)}
                            >
                                <ListMusic size={12} />
                                <span className="truncate">Playing from: {playlists.find(p => p.id === activePlaylistId)?.name}</span>
                            </div>
                        )}
                    </div>
                    <button
                        className={clsx("ml-4 transition-colors", favorites.some(s => s.id === currentSong.id) ? "text-green-500" : "text-gray-400 hover:text-white")}
                        onClick={() => toggleFavorite(currentSong)}
                        title={favorites.some(s => s.id === currentSong.id) ? "Remove from Favorites" : "Mark as Favorite"}
                    >
                        <Heart size={20} fill={favorites.some(s => s.id === currentSong.id) ? "currentColor" : "none"} />
                    </button>

                    {/* Background Download Status */}
                    {(isDownloading || downloadQueue.length > 0) && (
                        <div className="ml-6 flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full text-purple-400">
                            <Download size={14} className={isDownloading ? "animate-bounce" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-wider">
                                {downloadQueue.length > 0 ? `Syncing ${downloadQueue.length}` : 'Finalizing...'}
                            </span>
                        </div>
                    )}

                    {/* Add to Playlist Button */}
                    <button
                        className="ml-4 text-gray-400 hover:text-white"
                        title="Add to Playlist"
                        onClick={() => setIsAddToPlaylistOpen(true)}
                    >
                        <PlusCircle size={20} />
                    </button>

                </div>

                {/* Controls */}
                <div className="flex flex-col items-center w-1/3">
                    <div className="flex items-center gap-6 mb-2">
                        <button
                            className={`transition ${isShuffle ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setIsShuffle(!isShuffle)}
                            title="Shuffle (Visual only for now)"
                        >
                            <Shuffle size={20} />
                        </button>
                        <button className="text-gray-300 hover:text-white transition" onClick={prevSong}><SkipBack size={24} fill="currentColor" /></button>
                        <button
                            className="bg-white rounded-full p-2 text-black hover:scale-105 transition transform relative flex items-center justify-center"
                            onClick={() => setPlaying(!isPlaying)}
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                            {isPlaying && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                                    <MusicBars />
                                </div>
                            )}
                        </button>
                        <button className="text-gray-300 hover:text-white transition" onClick={nextSong}><SkipForward size={24} fill="currentColor" /></button>
                        <button className="text-gray-400 hover:text-white transition" onClick={() => { }}><Repeat size={20} /></button>
                    </div>

                    <div className="flex items-center gap-2 w-full max-w-md text-xs text-gray-400 font-mono player-group">
                        <span>{formatTime(progress)}</span>
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={progress}
                            onChange={handleSeek}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer hover:bg-green-500 transition-colors"
                            style={{
                                background: `linear-gradient(to right, #1DB954 ${(progress / duration) * 100}%, #4b5563 ${(progress / duration) * 100}%)`
                            }}
                        />
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Volume */}
                <div className="flex items-center justify-end w-1/3 gap-3 player-group">
                    <Volume2 size={20} className="text-gray-400" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer hover:bg-green-500 transition-colors"
                        style={{
                            background: `linear-gradient(to right, #1DB954 ${volume * 100}%, #4b5563 ${volume * 100}%)`
                        }}
                    />
                </div>
            </div>

            {/* Mobile Player Bar - Enhanced */}
            <div className="md:hidden fixed bottom-16 left-0 right-0 bg-[#181818] border-t border-white/10 z-50 shadow-2xl">
                {/* Top Row: Song Info and Controls */}
                <div className="flex items-center justify-between px-3 py-2 h-14">
                    {/* Song Info */}
                    <div className="flex items-center overflow-hidden flex-1 mr-3">
                        <SongArtwork
                            src={currentSong.imageUrl}
                            alt="Art"
                            className="w-11 h-11 rounded-lg object-cover bg-[#282828] shrink-0 shadow-md"
                        />
                        <div className="ml-3 overflow-hidden">
                            <h4 className="text-white text-sm font-bold truncate leading-tight">
                                {currentSong.title}
                            </h4>
                            <p className="text-gray-400 text-[11px] truncate leading-tight">
                                {currentSong.artist}
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            className={clsx("p-2 transition-colors", favorites.some(s => s.id === currentSong.id) ? "text-green-500" : "text-gray-500")}
                            onClick={() => toggleFavorite(currentSong)}
                        >
                            <Heart size={20} fill={favorites.some(s => s.id === currentSong.id) ? "currentColor" : "none"} />
                        </button>
                        <button
                            className="p-2 text-gray-400 hover:text-white transition"
                            onClick={() => setIsAddToPlaylistOpen(true)}
                            title="Add to Playlist"
                        >
                            <PlusCircle size={20} />
                        </button>
                        <button className="p-2 text-gray-300" onClick={prevSong}>
                            <SkipBack size={22} fill="currentColor" />
                        </button>
                        <button
                            className="bg-white text-black rounded-full p-2.5 hover:scale-105 active:scale-95 transition shadow-lg flex items-center justify-center shrink-0 mx-1"
                            onClick={(e) => { e.stopPropagation(); setPlaying(!isPlaying); }}
                        >
                            {isPlaying ? <Pause size={22} fill="black" /> : <Play size={22} fill="black" className="ml-0.5" />}
                        </button>
                        <button className="p-2 text-gray-300" onClick={nextSong}>
                            <SkipForward size={22} fill="currentColor" />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Seekable Progress Bar */}
                <div className="flex items-center gap-2 px-3 pb-2 text-[10px] text-gray-500 font-mono">
                    <span className="w-8 text-right">{formatTime(progress)}</span>
                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={progress}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #1DB954 ${(progress / duration) * 100}%, #374151 ${(progress / duration) * 100}%)`
                        }}
                    />
                    <span className="w-8">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Add to Playlist Modal */}
            <Modal
                isOpen={isAddToPlaylistOpen}
                onClose={() => setIsAddToPlaylistOpen(false)}
                title="Add to Playlist"
            >
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {playlists.length === 0 ? (
                        <p className="text-gray-400 text-sm">No playlists. Create one in the sidebar first.</p>
                    ) : (
                        playlists.map(p => (
                            <button
                                key={p.id}
                                className="text-left p-3 hover:bg-white/10 rounded flex items-center justify-between group"
                                onClick={() => {
                                    if (currentSong) {
                                        addSongToPlaylist(p.id, currentSong);
                                        setIsAddToPlaylistOpen(false);
                                    }
                                }}
                            >
                                <span className="font-medium text-white">{p.name}</span>
                                <span className="text-xs text-gray-400">{p.songs.length} songs</span>
                            </button>
                        ))
                    )}
                </div>
            </Modal>
        </>
    );
};

export default PlayerBar;
