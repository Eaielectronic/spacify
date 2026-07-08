import React, { useState, useEffect, useRef } from 'react';
import { Library, Trash2, Edit2, Plus, Play, Shuffle, ListMusic, Music, Download, Clock, Heart, Home, Search, History as HistoryIcon } from 'lucide-react';
import clsx from 'clsx';

import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';
import SearchHeader from './SearchHeader';
import SongCard from './SongCard';
import { usePlayerStore, Song } from '../stores/usePlayerStore';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { SongArtwork } from './SongArtwork';
import { searchMusic, getPlaylistTracks } from '../services/jamendo';
import { Modal } from './Modal';
import { MusicBars } from './MusicBars';
import { VirtuosoGrid, VirtuosoGridHandle } from 'react-virtuoso';
import { FunnySnake } from './FunnySnake';
import { SplashScreen } from './SplashScreen';
import { bridge } from '../services/bridge';
import { BackgroundMode } from '@anuradev/capacitor-background-mode';


const MobileNav = ({ view, setView }: { view: string, setView: (v: any) => void }) => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-white/5 flex justify-around items-center h-16 pb-0 z-40 px-2 shadow-2xl">
        <button onClick={() => setView('home')} className={clsx("flex flex-col items-center gap-1 p-2", view === 'home' ? "text-white" : "text-gray-500")}>
            <Home size={20} />
            <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={() => setView('search')} className={clsx("flex flex-col items-center gap-1 p-2", view === 'search' ? "text-white" : "text-gray-500")}>
            <Search size={20} />
            <span className="text-[10px] font-bold">Search</span>
        </button>
        <button onClick={() => setView('library')} className={clsx("flex flex-col items-center gap-1 p-2", view === 'library' ? "text-white" : "text-gray-500")}>
            <Library size={20} />
            <span className="text-[10px] font-bold">Library</span>
        </button>
        <button onClick={() => setView('playlists')} className={clsx("flex flex-col items-center gap-1 p-2", view === 'playlists' ? "text-white" : "text-gray-500")}>
            <ListMusic size={20} />
            <span className="text-[10px] font-bold">Playlists</span>
        </button>
        <button onClick={() => setView('favorites')} className={clsx("flex flex-col items-center gap-1 p-2", view === 'favorites' ? "text-white" : "text-gray-500")}>
            <Heart size={20} />
            <span className="text-[10px] font-bold">Likes</span>
        </button>
    </div>
);

const Layout = () => {
    const { playlists } = usePlaylistStore();
    const [view, setView] = useState<'home' | 'search' | 'library' | 'playlists' | 'playlist' | 'history' | 'favorites'>('home');
    const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAppLoading, setIsAppLoading] = useState(true);

    useEffect(() => {
        // Reduced initialization delay for better mobile responsiveness
        const timer = setTimeout(() => setIsAppLoading(false), 800);

        // Enable background mode for Android to keep music playing
        if (bridge.isMobile) {
            BackgroundMode.enable({
                title: 'Spacify',
                text: 'Playing in background',
                icon: 'ic_launcher',
                resume: true,
                silent: false
            });
        }

        return () => clearTimeout(timer);
    }, []);
    const { setQueue, playSong, queue, currentSong, isPlaying, addToQueue, addToDownloadQueue } = usePlayerStore();
    const [searchQuery, setSearchQuery] = useState('');


    const [searchType, setSearchType] = useState<'tracks' | 'playlists'>('tracks');
    const [searchOrder, setSearchOrder] = useState<string>('popularity_total');
    const [librarySongs, setLibrarySongs] = useState<Song[]>([]);

    // Refs
    const virtuosoRef = useRef<VirtuosoGridHandle>(null);

    // Modal States
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameName, setRenameName] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Playlist Track Viewer
    const [viewingPlaylist, setViewingPlaylist] = useState<Song | null>(null);
    const [viewingPlaylistTracks, setViewingPlaylistTracks] = useState<Song[]>([]);
    const [isPlaylistTracksLoading, setIsPlaylistTracksLoading] = useState(false);

    // Song Rename
    const [isSongRenameModalOpen, setIsSongRenameModalOpen] = useState(false);
    const [renamingSong, setRenamingSong] = useState<Song | null>(null);
    const [newSongName, setNewSongName] = useState('');

    // Recommendations
    const [recommendations, setRecommendations] = useState<Song[]>([]);
    const [isRecLoading, setIsRecLoading] = useState(false);

    // Auto-scroll to playing song and auto-load more
    useEffect(() => {
        if (view === 'search' && currentSong && searchResults.length > 0) {
            const index = searchResults.findIndex(s => s.id === currentSong.id);
            if (index !== -1 && virtuosoRef.current) {
                virtuosoRef.current.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
            }

            // Auto-load more if playing near end of search results
            if (index > searchResults.length - 8 && !isLoading) {
                loadMoreSongs();
            }
        }
    }, [currentSong?.id, view, searchResults.length]); // Added .id and .length for stability

    // Auto-download logic for queue buffer
    useEffect(() => {
        if (currentSong) {
            const idx = queue.findIndex(s => s.id === currentSong.id);
            if (idx !== -1) {
                const toBuffer = queue.slice(idx + 1, idx + 4);
                toBuffer.forEach(song => {
                    if (!song.localPath && song.audioUrl.startsWith('http')) {
                        bridge.downloadFile(song.audioUrl, `${song.id}.mp3`).catch(() => { });
                        if (song.imageUrl) {
                            bridge.downloadFile(song.imageUrl, `${song.id}.jpg`).catch(() => { });
                        }
                    }
                });
            }
        }
    }, [currentSong?.id, queue.length]);

    // Fetch recommendations on song change
    useEffect(() => {
        if (currentSong) {
            fetchRecommendations();
        }
    }, [currentSong?.id]);

    const fetchRecommendations = async () => {
        if (!currentSong) return;
        setIsRecLoading(true);
        try {
            // Heuristic: get some tracks by the same artist or similar tags
            // Jamendo doesn't have a direct "related" endpoint, so we search by artist or tags
            const hits = await searchMusic(currentSong.artist, 5, 0, 'tracks', 'popularity_total');
            // Filter out current song
            setRecommendations(hits.filter((h: Song) => h.id !== currentSong.id).slice(0, 4));
        } catch (e) {
            console.error("Failed to fetch recs", e);
        } finally {
            setIsRecLoading(false);
        }
    };

    // Default Search
    useEffect(() => {
        if (view === 'search' && searchResults.length === 0 && !isLoading) {
            handleSearch('best music');
        }
    }, [view]);

    // Load local library
    useEffect(() => {
        if (view === 'library') {
            bridge.getLocalSongs().then((files) => {
                const songs: Song[] = files.map((f, i) => ({
                    id: `local-${i}`,
                    title: f.name.replace(/\.[^/.]+$/, ""),
                    artist: 'Downloaded',
                    audioUrl: f.url,
                    localPath: f.path,
                    imageUrl: bridge.convertSrc(f.path.replace(/\.[^/.]+$/, ".jpg")),
                    isDownloaded: true
                }));
                setLibrarySongs(songs);
            });
        }
    }, [view]);

    const handleSearch = async (query: string) => {
        if (!query) return;
        setIsLoading(true);
        setSearchQuery(query);
        setView('search');
        setSearchResults([]);

        try {
            // For playlists, we don't support the same order filters yet
            const effectiveOrder = searchType === 'playlists' ? undefined : searchOrder;
            const hits = await searchMusic(query, 20, 0, searchType, effectiveOrder);
            setSearchResults(hits);
            // Don't auto-set queue on search, let user click "Play All" or a song
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewTracks = async (playlist: Song) => {
        setViewingPlaylist(playlist);
        setViewingPlaylistTracks([]);
        setIsPlaylistTracksLoading(true);
        try {
            const tracks = await getPlaylistTracks(playlist.id);
            setViewingPlaylistTracks(tracks);
        } catch (err) {
            console.error("Failed to fetch playlist tracks:", err);
        } finally {
            setIsPlaylistTracksLoading(false);
        }
    };

    // Re-run search when filter type or order changes
    useEffect(() => {
        if (searchQuery && view === 'search') {
            handleSearch(searchQuery);
        }
    }, [searchType, searchOrder, searchQuery, view]);

    const loadMoreSongs = async () => {
        if (!searchQuery || isLoading) return;

        setIsLoading(true);
        const offset = searchResults.length;
        try {
            const effectiveOrder = searchType === 'playlists' ? undefined : searchOrder;
            const hits = await searchMusic(searchQuery, 20, offset, searchType, effectiveOrder);
            if (hits.length > 0) {
                setSearchResults(prev => [...prev, ...hits]);

                // If we are currently playing from search results, append new songs to queue
                // Simple heuristic: if the current queue's first few songs match search results
                if (queue.length > 0 && searchResults.some(s => s.id === queue[0].id)) {
                    hits.forEach((song: any) => addToQueue(song));
                }
            }
        } catch (error) {
            console.error("Load more failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlaySearch = (shuffle: boolean) => {
        if (searchResults.length > 0) {
            let songsToPlay = [...searchResults];
            const currentIndex = currentSong ? songsToPlay.findIndex(s => s.id === currentSong.id) : -1;

            if (shuffle) {
                if (currentIndex !== -1) {
                    // Start from current, shuffle the rest
                    const [current] = songsToPlay.splice(currentIndex, 1);
                    songsToPlay = [current, ...songsToPlay.sort(() => Math.random() - 0.5)];
                } else {
                    songsToPlay = songsToPlay.sort(() => Math.random() - 0.5);
                }
            }

            const startIndex = currentIndex !== -1 ? currentIndex : 0;
            const startingSong = songsToPlay[startIndex];
            const remainingSongs = songsToPlay.slice(startIndex + 1);

            setQueue(remainingSongs);
            playSong(startingSong, null);
        }
    };

    const handlePlayPlaylist = (shuffle: boolean) => {
        const playlist = usePlaylistStore.getState().getPlaylist(selectedPlaylistId!);
        if (playlist && playlist.songs.length > 0) {
            let songsToPlay = [...playlist.songs];
            const currentIndex = currentSong ? songsToPlay.findIndex(s => s.id === currentSong.id) : -1;

            if (shuffle) {
                if (currentIndex !== -1) {
                    const [current] = songsToPlay.splice(currentIndex, 1);
                    songsToPlay = [current, ...songsToPlay.sort(() => Math.random() - 0.5)];
                } else {
                    songsToPlay = songsToPlay.sort(() => Math.random() - 0.5);
                }
            }

            const startIndex = currentIndex !== -1 ? currentIndex : 0;
            const startingSong = songsToPlay[startIndex];
            const remainingSongs = songsToPlay.slice(startIndex + 1);

            setQueue(remainingSongs);
            playSong(startingSong, selectedPlaylistId!);
        }
    };

    const handlePlayLibrary = (shuffle: boolean) => {
        if (librarySongs.length > 0) {
            let songsToPlay = [...librarySongs];
            const currentIndex = currentSong ? songsToPlay.findIndex(s => s.id === currentSong.id) : -1;

            if (shuffle) {
                if (currentIndex !== -1) {
                    const [current] = songsToPlay.splice(currentIndex, 1);
                    songsToPlay = [current, ...songsToPlay.sort(() => Math.random() - 0.5)];
                } else {
                    songsToPlay = songsToPlay.sort(() => Math.random() - 0.5);
                }
            }

            const startIndex = currentIndex !== -1 ? currentIndex : 0;
            const startingSong = songsToPlay[startIndex];
            const remainingSongs = songsToPlay.slice(startIndex + 1);

            setQueue(remainingSongs);
            playSong(startingSong, null);
        }
    };

    const handleRenameSong = async () => {
        if (!renamingSong || !newSongName.trim()) return;

        const { updateSong } = usePlayerStore.getState();
        const { renameSongInPlaylist } = usePlaylistStore.getState();

        updateSong(renamingSong.id, { title: newSongName });
        renameSongInPlaylist(renamingSong.id, newSongName);

        if (renamingSong.localPath) {
            const oldPath = renamingSong.localPath;
            const lastSlashIndex = oldPath.lastIndexOf('/');
            const dir = oldPath.substring(0, lastSlashIndex);
            const ext = oldPath.substring(oldPath.lastIndexOf('.'));
            const newPath = `${dir}/${newSongName}${ext}`;

            try {
                const success = await bridge.renameFile(oldPath, newPath);
                if (success) {
                    setLibrarySongs(prev => prev.map(s => s.id === renamingSong.id ? { ...s, title: newSongName, localPath: newPath, imageUrl: bridge.convertSrc(newPath.replace(/\.[^/.]+$/, ".jpg")) } : s));
                    if (usePlayerStore.getState().currentSong?.id === renamingSong.id) {
                        updateSong(renamingSong.id, { localPath: newPath, imageUrl: bridge.convertSrc(newPath.replace(/\.[^/.]+$/, ".jpg")) });
                    }
                } else {
                    alert("Failed to rename file.");
                }
            } catch (err) {
                console.error("File rename failed:", err);
                alert("An error occurred while renaming.");
            }
        }

        setIsSongRenameModalOpen(false);
        setRenamingSong(null);
    };

    return (
        <div className="flex bg-black h-[100dvh] w-screen text-white overflow-hidden font-sans relative">
            {isAppLoading && <SplashScreen />}
            <Sidebar
                view={view}
                setView={setView}
                onPlaylistSelect={(id) => {
                    setSelectedPlaylistId(id);
                    setView('playlist');
                }}
            />

            <div className="flex-1 flex flex-col bg-[#121212] m-2 rounded-lg overflow-hidden relative">
                {/* Header */}
                <div className="h-16 flex items-center px-8 bg-[#121212]/95 sticky top-0 z-10 w-full">
                    <SearchHeader onSearch={handleSearch} />
                    <div className="ml-auto flex items-center gap-4">
                        <div className="bg-[#2a2a2a] p-1 rounded-full px-3 py-1 text-sm font-bold cursor-pointer hover:bg-[#3E3E3E]">
                            Guest
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div
                    ref={setScrollParent}
                    className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-48 md:pb-32"
                >
                    {view === 'home' && (
                        <div className="space-y-12">
                            <div className="text-center mt-10">
                                <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">Spacify Your World</h1>
                                <p className="text-gray-400 text-xl font-medium">Search for your favorite tracks or playlists to get started.</p>
                            </div>

                            {/* Smart Playlists Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* On Repeat Playlist */}
                                <div
                                    className="bg-gradient-to-br from-green-900 to-black p-6 rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-green-500/50 transition-all"
                                    onClick={() => {
                                        const history = usePlayerStore.getState().history;
                                        if (history.length > 0) {
                                            // Sort by play count
                                            const playCounts = usePlayerStore.getState().playCounts;
                                            const topSongs = [...history].sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0));
                                            setQueue(topSongs);
                                            playSong(topSongs[0], 'on-repeat');
                                        }
                                    }}
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition transform group-hover:scale-110">
                                        <HistoryIcon size={100} />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2 relative z-10">On Repeat</h3>
                                    <p className="text-gray-400 font-medium relative z-10 mb-6">Your most played tracks.</p>
                                    <button className="bg-green-500 text-black rounded-full p-3 hover:scale-110 transition shadow-lg relative z-10">
                                        <Play size={24} fill="black" />
                                    </button>
                                </div>

                                {/* Discover New Playlist */}
                                <div
                                    className="bg-gradient-to-br from-blue-900 to-black p-6 rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-blue-500/50 transition-all"
                                    onClick={async () => {
                                        setIsLoading(true);
                                        try {
                                            // Fetch random songs and filter out history
                                            const historyIds = new Set(usePlayerStore.getState().history.map(s => s.id));
                                            const discoveries = await searchMusic({
                                                limit: 20,
                                                order: 'popularity_month',
                                                tags: ['pop', 'rock', 'dance', 'electronic'][Math.floor(Math.random() * 4)]
                                            });

                                            const newSongs = discoveries.filter(s => !historyIds.has(s.id));

                                            if (newSongs.length > 0) {
                                                setQueue(newSongs);
                                                playSong(newSongs[0], 'discover-new');
                                            } else {
                                                alert("Try again to find new music!");
                                            }
                                        } catch (e) {
                                            console.error(e);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition transform group-hover:scale-110">
                                        <Shuffle size={100} />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2 relative z-10">Discover New</h3>
                                    <p className="text-gray-400 font-medium relative z-10 mb-6">Fresh tracks you haven't heard yet.</p>
                                    <button className="bg-blue-500 text-black rounded-full p-3 hover:scale-110 transition shadow-lg relative z-10">
                                        <Play size={24} fill="black" />
                                    </button>
                                </div>
                            </div>

                            {recommendations.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-black">Recommended for You</h2>
                                        {isRecLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {recommendations.map(song => (
                                            <SongCard key={`rec-${song.id}`} song={song} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'favorites' && (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-48 h-48 rounded shadow-2xl bg-gradient-to-br from-pink-600 to-purple-800 flex items-center justify-center">
                                    <Heart size={80} fill="white" />
                                </div>
                                <div>
                                    <h1 className="text-7xl font-black mb-4">Favorites</h1>
                                    <p className="text-gray-400 font-medium">{usePlayerStore.getState().favorites.length} liked songs</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                {usePlayerStore.getState().favorites.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500 font-medium">Your favorites will appear here.</div>
                                ) : (
                                    usePlayerStore.getState().favorites.map((song, i) => (
                                        <div key={`fav-${song.id}`} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition cursor-pointer" onClick={() => playSong(song)}>
                                            <div className="text-gray-500 w-8 font-bold text-center">{i + 1}</div>
                                            <SongArtwork src={song.imageUrl} className="w-12 h-12 rounded-lg object-cover shadow-lg" alt={song.title} />
                                            <div className="flex-1">
                                                <div className={clsx("text-white font-bold transition-colors", currentSong?.id === song.id && "text-green-500")}>{song.title}</div>
                                                <div className="text-gray-400 text-sm font-medium">{song.artist}</div>
                                            </div>
                                            {currentSong?.id === song.id && isPlaying ? (
                                                <div className="p-3">
                                                    <MusicBars />
                                                </div>
                                            ) : (
                                                <button className="opacity-0 group-hover:opacity-100 p-3 bg-green-500 rounded-full text-black hover:scale-110 transition shrink-0">
                                                    <Play size={16} fill="black" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {view === 'search' && (
                        <div className="h-full flex flex-col">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                                <h2 className="text-3xl font-black">Search Results</h2>
                                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                    <div className="flex bg-[#2a2a2a] rounded-full p-1 border border-white/5 self-start md:self-auto">
                                        <button
                                            className={`px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${searchType === 'tracks' ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => {
                                                setSearchType('tracks');
                                                setSearchOrder('popularity_total');
                                            }}
                                        >
                                            <Music size={16} /> Tracks
                                        </button>
                                        <button
                                            className={`px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${searchType === 'playlists' ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => {
                                                setSearchType('playlists');
                                                setSearchOrder('popularity_total'); // This will be ignored by handleSearch logic
                                            }}
                                        >
                                            <ListMusic size={16} /> Playlists
                                        </button>
                                    </div>

                                    {searchResults.length > 0 && searchType === 'tracks' && (
                                        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                                            {/* Order Buttons */}
                                            <div className="flex bg-[#2a2a2a] rounded-full p-1 border border-white/5 shrink-0">
                                                {[
                                                    { id: 'popularity_total', label: 'Trending' },
                                                    { id: 'buzzrate', label: 'Rated' },
                                                    { id: 'releasedate_desc', label: 'New' }
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => setSearchOrder(opt.id)}
                                                        className={clsx(
                                                            "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                                            searchOrder === opt.id ? "bg-[#3E3E3E] text-white shadow-inner" : "text-gray-500 hover:text-gray-300"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex gap-2 shrink-0 ml-auto">
                                                <button
                                                    className="bg-green-500 text-black rounded-full px-4 py-2 hover:scale-105 active:scale-95 transition font-black flex items-center gap-2 shadow-lg shadow-green-500/20 text-xs md:text-sm"
                                                    onClick={() => handlePlaySearch(false)}
                                                >
                                                    <Play size={16} fill="black" /> Play All
                                                </button>
                                                <button
                                                    className="bg-[#2a2a2a] text-gray-300 hover:text-white hover:scale-110 active:scale-90 transition p-2 rounded-full"
                                                    onClick={() => handlePlaySearch(true)}
                                                    title="Shuffle All"
                                                >
                                                    <Shuffle size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isLoading && searchResults.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center flex-col gap-4">
                                    <FunnySnake />
                                    <div className="text-gray-500 font-bold text-xl uppercase tracking-widest animate-pulse">Searching...</div>
                                </div>
                            ) : (
                                <VirtuosoGrid
                                    ref={virtuosoRef}
                                    customScrollParent={scrollParent as any}
                                    totalCount={searchResults.length}
                                    data={searchResults}
                                    endReached={() => loadMoreSongs()}
                                    components={{
                                        List: React.forwardRef<HTMLDivElement, any>(({ style, children, ...props }, ref) => (
                                            <div
                                                ref={ref}
                                                {...props}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                    gap: '2rem',
                                                    ...style,
                                                }}
                                            >
                                                {children}
                                            </div>
                                        ))
                                    }}
                                    itemContent={(_index, song) => (
                                        <SongCard
                                            key={song.id}
                                            song={song}
                                            onViewTracks={handleViewTracks}
                                        />
                                    )}
                                />
                            )}
                        </div>
                    )}

                    {view === 'playlists' && (
                        <div className="p-4 md:p-8 pb-32">
                            <h1 className="text-4xl font-black text-white mb-8">My Playlists</h1>
                            {playlists.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl">
                                    <ListMusic size={64} className="text-gray-600 mb-4" />
                                    <p className="text-gray-400 font-bold">No playlists yet. Create one!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                    {playlists.map(playlist => (
                                        <div
                                            key={playlist.id}
                                            className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition cursor-pointer group shadow-lg border border-white/5"
                                            onClick={() => {
                                                setSelectedPlaylistId(playlist.id);
                                                setView('playlist');
                                            }}
                                        >
                                            <div className="aspect-square bg-[#282828] mb-4 rounded-lg overflow-hidden relative shadow-md">
                                                {playlist.imageUrl ? (
                                                    <img src={playlist.imageUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                                        <Music size={48} className="text-gray-600" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                    <Play size={32} fill="white" className="text-white" />
                                                </div>
                                            </div>
                                            <h3 className="font-bold truncate text-white">{playlist.name}</h3>
                                            <p className="text-sm text-gray-400 font-medium">{playlist.songs.length} songs</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'history' && (
                        <div className="p-8">
                            <h1 className="text-4xl font-black text-white mb-8">Recently Played</h1>
                            {usePlayerStore.getState().history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl">
                                    <Clock size={64} className="text-gray-600 mb-4" />
                                    <p className="text-gray-400 font-bold">No history yet. Start listening!</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {usePlayerStore.getState().history.map((song, i) => (
                                        <div
                                            key={song.id}
                                            className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition cursor-pointer"
                                            onClick={() => playSong(song)}
                                        >
                                            <div className="text-gray-500 w-8 font-mono text-center">{i + 1}</div>
                                            <SongArtwork src={song.imageUrl} className="w-12 h-12 rounded-lg object-cover shadow-lg" alt={song.title} />
                                            <div className="flex-1">
                                                <div className={clsx("text-white font-bold transition-colors", currentSong?.id === song.id && "text-green-500")}>{song.title}</div>
                                                <div className="text-gray-400 text-sm font-medium">{song.artist}</div>
                                            </div>
                                            {currentSong?.id === song.id && isPlaying ? (
                                                <div className="p-3">
                                                    <MusicBars />
                                                </div>
                                            ) : (
                                                <button className="opacity-0 group-hover:opacity-100 p-3 bg-green-500 rounded-full text-black hover:scale-110 transition">
                                                    <Play size={16} fill="black" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'library' && (
                        <div>
                            <div className="flex items-end gap-8 mb-10 bg-gradient-to-b from-green-500/10 to-transparent p-6 rounded-2xl">
                                <div className="w-48 h-48 bg-gradient-to-br from-green-600 to-blue-600 shadow-2xl flex items-center justify-center rounded-2xl">
                                    <Library size={80} className="text-white/90" />
                                </div>
                                <div className="flex-1">
                                    <p className="uppercase text-xs font-black tracking-[0.2em] text-green-400 mb-2">My Collection</p>
                                    <h1 className="text-4xl md:text-7xl font-black text-white mb-6">Local Library</h1>
                                    <div className="flex items-center gap-6">
                                        <button
                                            className="bg-green-500 text-black rounded-full px-8 py-3.5 hover:scale-105 active:scale-95 transition shadow-xl font-black flex items-center gap-3"
                                            onClick={() => handlePlayLibrary(false)}
                                        >
                                            <Play size={24} fill="black" /> Play All
                                        </button>
                                        <button
                                            className="bg-[#2a2a2a] text-gray-300 hover:text-white hover:scale-110 active:scale-90 transition p-3 rounded-full"
                                            onClick={() => handlePlayLibrary(true)}
                                        >
                                            <Shuffle size={28} />
                                        </button>
                                        <span className="text-gray-400 font-medium">{librarySongs.length} songs</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
                                {librarySongs.map(song => (
                                    <SongCard
                                        key={song.id}
                                        song={song}
                                        onDelete={async () => {
                                            if (window.confirm(`Permanently delete ${song.title}?`)) {
                                                if (song.localPath) await bridge.deleteFile(song.localPath);
                                                if (song.localImagePath) await bridge.deleteFile(song.localImagePath);
                                                setLibrarySongs(prev => prev.filter(s => s.id !== song.id));
                                            }
                                        }}
                                        onRename={(s) => {
                                            setRenamingSong(s);
                                            setNewSongName(s.title);
                                            setIsSongRenameModalOpen(true);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'playlist' && selectedPlaylistId && (
                        <div className="h-full">
                            {(() => {
                                const playlist = usePlaylistStore.getState().getPlaylist(selectedPlaylistId);
                                return (
                                    <>
                                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-10 bg-gradient-to-b from-purple-500/10 to-transparent p-6 rounded-2xl group relative text-center md:text-left">
                                            <div className="w-52 h-52 shrink-0 bg-gradient-to-br from-purple-600 to-indigo-600 shadow-2xl flex items-center justify-center rounded-2xl relative overflow-hidden">
                                                {playlist?.imageUrl ? (
                                                    <SongArtwork src={playlist.imageUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-8xl text-white/50 font-black italic">S</span>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                                                    <button className="bg-green-500 rounded-full p-5 hover:scale-110 transition" onClick={() => handlePlayPlaylist(false)}>
                                                        <Play size={40} fill="black" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 w-full">
                                                <p className="uppercase text-xs font-black tracking-[0.2em] text-purple-400 mb-2">Playlist</p>
                                                <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 md:gap-4 mb-6">
                                                    <h1 className="text-4xl md:text-7xl font-black text-white break-all md:break-normal line-clamp-2">{playlist?.name}</h1>
                                                    <button onClick={() => { setIsRenameModalOpen(true); setRenameName(playlist?.name || ''); }} className="p-2 text-gray-500 hover:text-white transition">
                                                        <Edit2 size={24} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-center md:justify-start gap-4 md:gap-6 flex-wrap">
                                                    <button className="bg-green-500 text-black rounded-full px-8 py-3.5 hover:scale-105 active:scale-95 transition shadow-xl font-black flex items-center gap-3" onClick={() => handlePlayPlaylist(false)}>
                                                        <Play size={24} fill="black" /> Play
                                                    </button>
                                                    <button className="bg-[#2a2a2a] text-gray-300 hover:text-white hover:scale-110 transition p-3 rounded-full" onClick={() => handlePlayPlaylist(true)}>
                                                        <Shuffle size={28} />
                                                    </button>
                                                    <button className="bg-[#2a2a2a] text-gray-300 hover:text-white transition p-3 rounded-full border border-white/5" onClick={async () => {
                                                        if (window.electronAPI) {
                                                            const paths = await window.electronAPI.selectFile();
                                                            paths?.forEach((path: string) => {
                                                                const s: Song = { id: Date.now() + Math.random(), title: path.split('/').pop()?.replace('.mp3', '') || 'Song', artist: 'Local', audioUrl: `file://${path}`, localPath: path, isDownloaded: true };
                                                                usePlaylistStore.getState().addSongToPlaylist(selectedPlaylistId, s);
                                                            });
                                                        }
                                                    }}>
                                                        <Plus size={28} />
                                                    </button>
                                                    <button className="ml-auto md:ml-0 text-gray-500 hover:text-red-500 transition" onClick={() => setIsDeleteModalOpen(true)}>
                                                        <Trash2 size={28} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            {playlist?.songs.map((song, i) => (
                                                <div key={`${song.id}-${i}`} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition cursor-pointer" onClick={() => {
                                                    if (selectedPlaylistId) {
                                                        const songsToPlay = playlist.songs;
                                                        const remainingSongs = songsToPlay.slice(i + 1);
                                                        setQueue(remainingSongs);
                                                        playSong(song, selectedPlaylistId);
                                                    }
                                                }}>
                                                    <div className="text-gray-500 w-8 font-bold text-center">{i + 1}</div>
                                                    <SongArtwork src={song.imageUrl} className="w-12 h-12 rounded-lg object-cover shadow-lg" alt={song.title} />
                                                    <div className="flex-1">
                                                        <div className={clsx("text-white font-bold", currentSong?.id === song.id && "text-green-500")}>{song.title}</div>
                                                        <div className="text-gray-400 text-sm font-medium">{song.artist}</div>
                                                    </div>
                                                    {currentSong?.id === song.id && isPlaying && <MusicBars />}
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 transition"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (selectedPlaylistId) {
                                                                    usePlaylistStore.getState().removeSongFromPlaylist(selectedPlaylistId, song.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                        <button
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-blue-500 transition"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setRenamingSong(song);
                                                                setNewSongName(song.title);
                                                                setIsSongRenameModalOpen(true);
                                                            }}
                                                        >
                                                            <Edit2 size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>

                <PlayerBar
                    onViewPlaylistTracks={(id) => {
                        const playlist = playlists.find((p: any) => p.id === id);
                        if (playlist) {
                            handleViewTracks({
                                id: playlist.id,
                                title: playlist.name,
                                artist: 'Local Playlist',
                                audioUrl: '',
                                imageUrl: playlist.imageUrl || '',
                                duration: 0,
                                isPlaylist: true,
                                trackCount: playlist.songs.length
                            } as Song);
                        } else {
                            // Try Jamendo search results if not local
                            // (Actually if it's in activePlaylistId it must be in the store or we need to fetch it)
                            // For now we support local/imported playlists
                        }
                    }}
                />
            </div>

            {/* Modals */}
            <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Rename Playlist">
                <div className="flex flex-col gap-6">
                    <input
                        type="text"
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        className="bg-[#2a2a2a] text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg font-bold"
                        placeholder="Enter new name"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsRenameModalOpen(false)} className="px-6 py-2 text-gray-400 font-bold">Cancel</button>
                        <button onClick={() => { if (renameName && selectedPlaylistId) { usePlaylistStore.getState().renamePlaylist(selectedPlaylistId, renameName); setIsRenameModalOpen(false); } }} className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-2 rounded-full font-black">Save</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Playlist">
                <div className="flex flex-col gap-6">
                    <p className="text-gray-300 text-lg">Are you sure you want to delete this playlist? This cannot be undone.</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2 text-gray-400 font-bold">Cancel</button>
                        <button onClick={() => { if (selectedPlaylistId) { usePlaylistStore.getState().deletePlaylist(selectedPlaylistId); setIsDeleteModalOpen(false); setView('home'); } }} className="bg-red-600 hover:bg-red-500 text-white px-8 py-2 rounded-full font-black">Delete</button>
                    </div>
                </div>
            </Modal>

            {/* Playlist Track Viewer Modal */}
            <Modal
                isOpen={!!viewingPlaylist}
                onClose={() => setViewingPlaylist(null)}
                title={viewingPlaylist?.title || 'Playlist Tracks'}
                className="max-w-2xl w-full"
            >
                <div className="flex flex-col gap-6 max-h-[75vh] w-full overflow-hidden">

                    {isPlaylistTracksLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                            <p className="text-gray-400 font-bold animate-pulse">Fetching tracks...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl mb-2">
                                <SongArtwork src={viewingPlaylist?.imageUrl} className="w-24 h-24 rounded-xl shadow-2xl" />
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="text-2xl font-black text-white truncate">{viewingPlaylist?.title}</h3>
                                    <p className="text-purple-400 font-bold uppercase text-xs tracking-widest truncate">{viewingPlaylist?.artist}</p>
                                    <div className="flex gap-4 mt-4">
                                        <button
                                            className="bg-green-500 text-black px-6 py-2 rounded-full font-black flex items-center gap-2 hover:scale-105 transition"
                                            onClick={() => {
                                                if (viewingPlaylistTracks.length > 0) {
                                                    setQueue(viewingPlaylistTracks.slice(1));
                                                    playSong(viewingPlaylistTracks[0], viewingPlaylist?.id.toString());
                                                    setViewingPlaylist(null);
                                                }
                                            }}
                                        >
                                            <Play size={18} fill="black" /> Play All
                                        </button>
                                        <button
                                            className="bg-[#2a2a2a] text-white px-6 py-2 rounded-full font-black flex items-center gap-2 hover:bg-[#3E3E3E] transition"
                                            onClick={() => {
                                                addToDownloadQueue(viewingPlaylistTracks);
                                                // Create local playlist as well
                                                const newPlaylistName = `${viewingPlaylist?.title} (Imported)`;
                                                const playlistId = crypto.randomUUID();
                                                usePlaylistStore.setState((state: any) => ({
                                                    playlists: [...state.playlists, {
                                                        id: playlistId,
                                                        name: newPlaylistName,
                                                        songs: [],
                                                        imageUrl: viewingPlaylist?.imageUrl,
                                                        createdAt: Date.now()
                                                    }]
                                                }));
                                                viewingPlaylistTracks.forEach(track => {
                                                    usePlaylistStore.getState().addSongToPlaylist(playlistId, track);
                                                });
                                                alert(`Importing ${viewingPlaylistTracks.length} songs...`);
                                            }}
                                        >
                                            <Download size={18} /> Import All
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                                {viewingPlaylistTracks.map((track, i) => (
                                    <div
                                        key={track.id}
                                        className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition cursor-pointer border border-transparent hover:border-white/5"
                                        onClick={() => {
                                            setQueue(viewingPlaylistTracks.slice(i + 1));
                                            playSong(track, viewingPlaylist?.id.toString());
                                        }}
                                    >
                                        <div className="text-gray-500 w-8 font-mono text-xs text-center">{i + 1}</div>
                                        <SongArtwork src={track.imageUrl} className="w-10 h-10 rounded-lg shadow-md" />
                                        <div className="flex-1 overflow-hidden">
                                            <div className={clsx("text-sm font-bold truncate transition-colors", currentSong?.id === track.id ? "text-green-500" : "text-white")}>{track.title}</div>
                                            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider truncate">{track.artist}</div>
                                        </div>
                                        {currentSong?.id === track.id && isPlaying ? (
                                            <div className="mr-2">
                                                <MusicBars />
                                            </div>
                                        ) : (
                                            <div className="opacity-0 group-hover:opacity-100 transition flex gap-2">
                                                <button className="p-2 hover:bg-green-500 text-gray-400 hover:text-black rounded-full transition-all">
                                                    <Play size={14} fill="currentColor" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            <Modal isOpen={isSongRenameModalOpen} onClose={() => setIsSongRenameModalOpen(false)} title="Rename Song">
                <div className="flex flex-col gap-6">
                    <input
                        type="text"
                        value={newSongName}
                        onChange={(e) => setNewSongName(e.target.value)}
                        className="bg-[#2a2a2a] text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                        placeholder="Enter song title"
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSong()}
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsSongRenameModalOpen(false)} className="px-6 py-2 text-gray-400 font-bold">Cancel</button>
                        <button onClick={handleRenameSong} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-full font-black">Rename</button>
                    </div>
                </div>
            </Modal>

            <MobileNav view={view} setView={setView} />

        </div>

    );
};

export default Layout;
