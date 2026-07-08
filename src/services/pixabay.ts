import axios from 'axios';

const API_KEY = '42744509-1de0b6dd70517f3e5c8972cd7';
const BASE_URL = 'https://pixabay.com/api/';

export const searchMusic = async (query: string) => {
    try {
        // Pixabay Audio API returns 403 (likely restricted). 
        // We will use the Video API as a fallback, which provides MP4s.
        // Some videos have sound, some don't. This is the best we can do with the provided key/source.
        const response = await axios.get(BASE_URL + 'videos/', {
            params: {
                key: API_KEY,
                q: query,
                category: 'music',
                per_page: 20
            }
        });

        if (response.data.hits) {
            return response.data.hits.map((hit: any) => ({
                id: hit.id,
                title: `Track ${hit.id} (${hit.tags})`,
                artist: hit.user,
                audioUrl: hit.videos?.tiny?.url || hit.videos?.large?.url, // Use tiny for speed? or large for quality?
                imageUrl: hit.userImageURL || 'https://via.placeholder.com/150',
                duration: hit.duration,
                // Add a flag that this is video-as-audio
                isVideo: true
            }));
        }
        return [];
    } catch (error) {
        console.error("Error searching pixabay:", error);
        return [];
    }
};
