const axios = require('axios');
const API_KEY = '42744509-1de0b6dd70517f3e5c8972cd7';

async function test() {
    console.log("--- Testing Pixabay Video API Object ---");
    try {
        const res = await axios.get('https://pixabay.com/api/videos/', {
            params: {
                key: API_KEY,
                q: 'music',
                category: 'music', // Try category
                per_page: 3
            }
        });

        if (res.data?.hits?.length > 0) {
            console.log("First Hit Keys:", Object.keys(res.data.hits[0]));
            console.log("First Hit Videos Object:", JSON.stringify(res.data.hits[0].videos, null, 2));
            console.log("First Hit Tags:", res.data.hits[0].tags);
            console.log("First Hit Type:", res.data.hits[0].type);
        } else {
            console.log("No hits found.");
        }

    } catch (e) { console.log("Video API failed:", e.message); }
}

test();
