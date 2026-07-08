import axios from 'axios';
import { Song } from '../stores/usePlayerStore';

const CLIENT_ID = 'c7668145';

interface SearchOptions {
    limit?: number;
    offset?: number;
    order?: string;
    tags?: string;
}

export const searchMusic = async (queryOrOptions: string | SearchOptions, limit: number = 20, offset: number = 0, type: 'tracks' | 'playlists' = 'tracks', order?: string): Promise<Song[]> => {
    try {
        const endpoint = type === 'playlists' ? 'https://api.jamendo.com/v3.0/playlists/' : 'https://api.jamendo.com/v3.0/tracks/';

        let params: any = {
            client_id: CLIENT_ID,
            format: 'json',
            limit: limit,
            offset: offset,
            imagesize: 500
        };

        if (typeof queryOrOptions === 'string') {
            params[type === 'playlists' ? 'namesearch' : 'search'] = queryOrOptions;
            if (order) params.order = order;
        } else {
            // Options object
            const opts = queryOrOptions as SearchOptions;
            params.limit = opts.limit || limit;
            params.offset = opts.offset || offset;
            if (opts.order) params.order = opts.order;
            if (opts.tags) params.tags = opts.tags;
        }

        if (type === 'tracks') {
            params.include = 'musicinfo';
        }

        const response = await axios.get(endpoint, { params });

        if (response.data.results) {
            return response.data.results.map((item: any) => {
                if (type === 'playlists') {
                    return {
                        id: item.id,
                        title: item.name,
                        artist: item.user_name || 'Jamendo Playlist',
                        audioUrl: '',
                        imageUrl: item.image,
                        duration: 0,
                        isJamendo: true,
                        isPlaylist: true,
                        trackCount: item.tracks?.length || 0
                    };
                } else {
                    return {
                        id: item.id,
                        title: item.name,
                        artist: item.artist_name,
                        audioUrl: item.audio,
                        imageUrl: item.image,
                        duration: item.duration,
                        isJamendo: true
                    };
                }
            });
        }
        return [];
    } catch (error) {
        console.error("Error searching jamendo:", error);
        return [];
    }
};

// Fetch tracks for a specific Jamendo playlist
export const getPlaylistTracks = async (playlistId: string | number): Promise<any[]> => {
    try {
        const response = await axios.get('https://api.jamendo.com/v3.0/playlists/tracks/', {
            params: {
                client_id: CLIENT_ID,
                format: 'json',
                id: playlistId,
                imagesize: 500
            }
        });

        if (response.data.results && response.data.results[0]?.tracks) {
            return response.data.results[0].tracks.map((track: any) => ({
                id: track.id,
                title: track.name,
                artist: track.artist_name,
                audioUrl: track.audio,
                imageUrl: track.image,
                duration: track.duration,
                isJamendo: true
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching playlist tracks:", error);
        return [];
    }
};
