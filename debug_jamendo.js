const axios = require('axios');

const CLIENT_ID = 'c7668145';

async function test() {
    console.log("--- DEBUGGING JAMENDO SEARCH ---");
    try {
        const res = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
            params: {
                client_id: CLIENT_ID,
                format: 'json',
                limit: 5,
                search: 'chill'
            }
        });

        console.log("Response Status:", res.status);
        if (res.data?.results) {
            console.log("Results found:", res.data.results.length);
            if (res.data.results.length > 0) {
                const track = res.data.results[0];
                console.log("First Track Data:", JSON.stringify(track, null, 2));
                console.log("Audio URL check:", track.audio);
            }
        } else {
            console.log("No results field in response:", Object.keys(res.data));
        }

    } catch (e) {
        console.log("Search failed:", e.message);
    }
}

test();
