const axios = require('axios');
const CLIENT_ID = '709fa152'; // Public test ID found

async function test() {
    console.log("--- Testing Jamendo API ---");
    try {
        const res = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
            params: {
                client_id: CLIENT_ID,
                format: 'jsonpretty',
                limit: 5,
                search: 'chill',
                include: 'musicinfo'
            }
        });

        if (res.data?.results?.length > 0) {
            console.log("Found", res.data.results.length, "tracks.");
            const track = res.data.results[0];
            console.log("Track Name:", track.name);
            console.log("Artist:", track.artist_name);
            console.log("Audio URL:", track.audio);
            console.log("Image:", track.image);
            console.log("Duration:", track.duration);
        } else {
            console.log("No results found.");
            console.log(res.data);
        }

    } catch (e) {
        console.log("Jamendo API failed:", e.message);
        if (e.response) console.log(e.response.data);
    }
}

test();
