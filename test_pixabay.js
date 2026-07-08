const axios = require('axios');
const API_KEY = '42744509-1de0b6dd70517f3e5c8972cd7';

async function test() {
    console.log("--- Testing Pixabay API ---");

    // Test 1: Image API
    try {
        const res = await axios.get('https://pixabay.com/api/', {
            params: { key: API_KEY, q: 'music' }
        });
        console.log("Image API (q=music): Found", res.data?.hits?.length);
    } catch (e) { console.log("Image API failed:", e.message); }

    // Test 2: Video API
    try {
        const res = await axios.get('https://pixabay.com/api/videos/', {
            params: { key: API_KEY, q: 'music' }
        });
        console.log("Video API (q=music): Found", res.data?.hits?.length);
        if (res.data?.hits?.length > 0) {
            console.log("Sample Video URL:", res.data.hits[0].videos.tiny.url);
        }
    } catch (e) { console.log("Video API failed:", e.message); }

    // Test 3: Hypothetical Audio API
    try {
        // Try undocumented /audio/ endpoint
        const res = await axios.get('https://pixabay.com/api/audio/', {
            params: { key: API_KEY, q: 'chill' }
        });
        console.log("Audio API (/api/audio/): It worked! Found", res.data?.hits?.length);
    } catch (e) { console.log("Audio API (/api/audio/) failed:", e.message); }
}

test();
