import React from 'react';
import { Song, usePlayerStore } from '../stores/usePlayerStore';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { Play, Trash2, ListMusic, Download, Loader2, Heart, Edit2 } from 'lucide-react';
import { SongArtwork } from './SongArtwork';
import { getPlaylistTracks } from '../services/jamendo';
import { MusicBars } from './MusicBars';
import { bridge } from '../services/bridge';

interface SongCardProps {
    song: Song;
    onDelete?: () => void;
    onRename?: (song: Song) => void;
    onViewTracks?: (playlist: Song) => void;
}

const SongCard: React.FC<SongCardProps> = ({ song, onDelete, onRename, onViewTracks }) => {
    const { playSong, setQueue, addToDownloadQueue, currentSong, isPlaying, toggleFavorite, favorites } = usePlayerStore();
    const { addSongToPlaylist } = usePlaylistStore();
    const [isImporting, setIsImporting] = React.useState(false);

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Handle Jamendo playlists
        if ((song as any).isPlaylist) {
            try {
                const tracks = await getPlaylistTracks(song.id);
                if (tracks.length > 0) {
                    console.log(`Setting queue with ${tracks.length - 1} upcoming tracks from playlist ${song.title}`);
                    setQueue(tracks.slice(1));
                    playSong(tracks[0], song.id.toString());
                } else {
                    alert("This playlist is empty.");
                }
            } catch (err) {
                console.error("Failed to load playlist tracks:", err);
            }
            return;
        }


        // Normal track playback
        playSong(song);
        if (!song.localPath && song.audioUrl?.startsWith('http')) {
            bridge.downloadFile(song.audioUrl, `${song.id}.mp3`);
            if (song.imageUrl) {
                bridge.downloadFile(song.imageUrl, `${song.id}.jpg`);
            }
        }
    };

    const handleImport = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isImporting) return;

        setIsImporting(true);
        try {
            const tracks = await getPlaylistTracks(song.id);
            if (tracks.length > 0) {
                // 1. Create a local playlist
                const newPlaylistName = `${song.title} (Imported)`;
                const playlistId = crypto.randomUUID();

                usePlaylistStore.setState((state: any) => ({
                    playlists: [...state.playlists, {
                        id: playlistId,
                        name: newPlaylistName,
                        songs: [],
                        imageUrl: song.imageUrl,
                        createdAt: Date.now()
                    }]
                }));

                // 2. Add tracks to it
                tracks.forEach(track => {
                    addSongToPlaylist(playlistId, track);
                });

                // 3. Add to background download queue
                addToDownloadQueue(tracks);
                alert(`Imported ${tracks.length} songs. Downloading in background...`);
            }

        } catch (err) {
            console.error("Import failed:", err);
            alert("Failed to import playlist.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) onDelete();
    };

    const isPlaylistEntry = (song as any).isPlaylist;

    return (
        <div
            className="bg-[#181818] rounded-xl hover:bg-[#282828] transition duration-300 group cursor-pointer flex flex-col relative overflow-hidden"
            onClick={handlePlay}
        >
            <div className="relative w-full aspect-square">
                <SongArtwork
                    src={song.imageUrl}
                    alt={song.title}
                    className="w-full h-full object-cover"
                />
                {isPlaylistEntry && (
                    <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-lg z-10">
                        <ListMusic size={12} /> Playlist
                    </div>
                )}

                {currentSong?.id === song.id && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="scale-150">
                            <MusicBars />
                        </div>
                    </div>
                )}

                <div className="absolute bottom-2 right-2 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
                    {isPlaylistEntry && (
                        <>
                            <button
                                className="bg-white/10 backdrop-blur-md text-white rounded-full p-3 shadow-xl hover:bg-white/20 hover:scale-110 active:scale-95 transition-all"
                                onClick={(e) => { e.stopPropagation(); if (onViewTracks) onViewTracks(song); }}
                                title="View Tracks"
                            >
                                <ListMusic size={20} />
                            </button>
                            <button
                                className={`bg-white/10 backdrop-blur-md text-white rounded-full p-3 shadow-xl hover:bg-white/20 hover:scale-110 active:scale-95 transition-all
                                    ${isImporting ? 'cursor-not-allowed opacity-50' : ''}`}
                                onClick={handleImport}
                                title="Import Playlist to Library"
                                disabled={isImporting}
                            >
                                {isImporting ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Download size={20} />
                                )}
                            </button>
                        </>
                    )}

                    <button
                        className="bg-green-500 text-black rounded-full p-3 shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                        onClick={handlePlay}
                        title="Play"
                    >
                        {currentSong?.id === song.id && isPlaying ? (
                            <div className="scale-75"><MusicBars /></div>
                        ) : (
                            <Play size={20} fill="black" />
                        )}
                    </button>

                    {!isPlaylistEntry && (
                        <button
                            className="bg-black/50 backdrop-blur-md text-white rounded-full p-3 shadow-xl hover:bg-black/70 hover:scale-110 active:scale-95 transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(song);
                            }}
                            title={favorites.some(s => s.id === song.id) ? "Remove from Favorites" : "Add to Favorites"}
                        >
                            <Heart size={20} fill={favorites.some(s => s.id === song.id) ? "white" : "none"} />
                        </button>
                    )}

                    {onRename && (
                        <button
                            className="bg-blue-600/80 backdrop-blur-md text-white rounded-full p-3 shadow-xl hover:bg-blue-600 hover:scale-110 active:scale-95 transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRename(song);
                            }}
                            title="Rename"
                        >
                            <Edit2 size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4">
                <h3 className="text-white font-bold text-base truncate mb-1">{song.title}</h3>
                <p className="text-gray-400 text-sm truncate">{song.artist}</p>
            </div>

            {
                onDelete && (
                    <button
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition z-20"
                        onClick={handleDelete}
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                )
            }
        </div >
    );
};


export default SongCard;
