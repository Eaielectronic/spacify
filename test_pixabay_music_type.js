const axios = require('axios');
const API_KEY = '42744509-1de0b6dd70517f3e5c8972cd7';

async function test() {
    console.log("--- Testing Pixabay 'type=music' ---");

    // Test 1: Main Endpoint with type=music
    try {
        console.log("1. Testing Main Endpoint (https://pixabay.com/api/) with type=music");
        const res = await axios.get('https://pixabay.com/api/', {
            params: { key: API_KEY, q: 'chill', type: 'music' }
        });
        console.log("   Result:", res.data?.hits?.length ? "HITS FOUND" : "No hits");
        if (res.data?.hits?.[0]) console.log("   Sample:", Object.keys(res.data.hits[0]));
    } catch (e) { console.log("   Failed:", e.message, e.response?.data); }

    // Test 2: Video Endpoint with type=music
    try {
        console.log("2. Testing Video Endpoint (https://pixabay.com/api/videos/) with type=music");
        const res = await axios.get('https://pixabay.com/api/videos/', {
            params: { key: API_KEY, q: 'chill', type: 'music' }
        });
        console.log("   Result:", res.data?.hits?.length ? "HITS FOUND" : "No hits");
    } catch (e) { console.log("   Failed:", e.message, e.response?.data); }

    // Test 3: Videos with category=music (We know this gives MP4s, but maybe user accepts it if we filter?)
    try {
        console.log("3. Testing Video Endpoint with category=music");
        const res = await axios.get('https://pixabay.com/api/videos/', {
            params: { key: API_KEY, q: 'chill', category: 'music' }
        });
        console.log("   Result:", res.data?.hits?.length ? "HITS FOUND" : "No hits");
        if (res.data?.hits?.[0]) {
            console.log("   Format:", res.data.hits[0].videos?.tiny?.url);
        }
    } catch (e) { console.log("   Failed:", e.message); }
}

test();
